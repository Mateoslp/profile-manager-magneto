"""
API de Profile Manager.

Uso:
    uvicorn main:app --reload
    Luego abre http://127.0.0.1:8000/docs para probarla en el navegador

Flujo en /docs:
    1. POST /auth/registro  -> crea tu usuario
    2. POST /auth/login     -> copia el access_token
    3. Botón "Authorize" (arriba a la derecha) -> pega el token
    4. Ya puedes usar /procesar-candidato y /postulaciones
"""
import logging
import os
from contextlib import contextmanager
from typing import Literal

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents import app_grafo
from auth import (
    crear_token,
    hashear_password,
    limitar_llamadas,
    solo_admin,
    usuario_actual,
    verificar_password,
)
from perfil_utils import limpiar_perfil

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("profile-manager")

app = FastAPI(title="Profile Manager - Backend y Datos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Base de datos ----------
def get_connection():
    return psycopg2.connect(
        DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor
    )


@contextmanager
def conexion():
    """Abre la conexión, hace commit si todo sale bien, rollback si falla,
    y siempre la cierra."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------- Modelos de entrada (validación) ----------
class Credenciales(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=100)
    password: str = Field(min_length=8, max_length=72)


class CandidatoIn(BaseModel):
    cv_texto: str = Field(min_length=30, max_length=20000)
    expectativas: dict = Field(default_factory=dict)


class EstadoIn(BaseModel):
    estado: Literal["postulado", "en_revision", "entrevista", "descartado"]


# ---------- Público ----------
@app.get("/")
def home():
    return {"mensaje": "Profile Manager API funcionando"}


@app.get("/vacantes")
def listar_vacantes():
    """Devuelve todas las vacantes."""
    with conexion() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM vacantes ORDER BY id;")
        return cur.fetchall()


@app.get("/vacantes/{vacante_id}")
def obtener_vacante(vacante_id: int):
    with conexion() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM vacantes WHERE id = %s;", (vacante_id,))
        resultado = cur.fetchone()
    if not resultado:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return resultado


# ---------- Autenticación ----------
@app.post("/auth/registro", status_code=201)
def registro(datos: Credenciales):
    email = datos.email.lower()
    with conexion() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM usuarios WHERE email = %s;", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Ese correo ya está registrado")
        cur.execute(
            "INSERT INTO usuarios (email, password_hash) VALUES (%s, %s) RETURNING id;",
            (email, hashear_password(datos.password)),
        )
        usuario_id = cur.fetchone()["id"]
    log.info("Usuario registrado id=%s", usuario_id)
    return {"id": usuario_id, "email": email}


@app.post("/auth/login")
def login(datos: Credenciales):
    with conexion() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, password_hash, rol FROM usuarios WHERE email = %s;",
            (datos.email.lower(),),
        )
        usuario = cur.fetchone()
    # Mismo mensaje si falla el correo o la contraseña (no revela cuál fue)
    if not usuario or not verificar_password(datos.password, usuario["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    log.info("Login usuario id=%s", usuario["id"])
    return {
        "access_token": crear_token(usuario["id"], usuario["rol"]),
        "token_type": "bearer",
    }


# ---------- Flujo de agentes ----------
@app.post("/procesar-candidato")
def procesar_candidato(datos: CandidatoIn, usuario: dict = Depends(limitar_llamadas)):
    """Corre Perfil -> Vacantes -> Recomendación -> Postulación -> Seguimiento
    y guarda perfil + postulación en la base de datos."""
    vacantes = listar_vacantes()

    try:
        resultado = app_grafo.invoke(
            {
                "cv_texto": datos.cv_texto,
                "expectativas": datos.expectativas,
                "vacantes_disponibles": vacantes,
            }
        )
    except Exception:
        log.exception("Falló el flujo de agentes (usuario id=%s)", usuario["id"])
        raise HTTPException(
            status_code=502,
            detail="No se pudo procesar la hoja de vida, intenta de nuevo",
        )

    perfil = limpiar_perfil(resultado["perfil_estructurado"])
    postulacion = resultado["resultado_postulacion"]

    with conexion() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO perfiles (usuario_id, nombre, email, telefono, ubicacion,
                                  experiencia_anios, educacion, aspiracion_salarial,
                                  modalidad_preferida, disponibilidad, habilidades,
                                  cv_texto)
            VALUES (%(usuario_id)s, %(nombre)s, %(email)s, %(telefono)s, %(ubicacion)s,
                    %(experiencia_anios)s, %(educacion)s, %(aspiracion_salarial)s,
                    %(modalidad_preferida)s, %(disponibilidad)s, %(habilidades)s,
                    %(cv_texto)s)
            ON CONFLICT (email) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                telefono = EXCLUDED.telefono,
                ubicacion = EXCLUDED.ubicacion,
                experiencia_anios = EXCLUDED.experiencia_anios,
                educacion = EXCLUDED.educacion,
                aspiracion_salarial = EXCLUDED.aspiracion_salarial,
                modalidad_preferida = EXCLUDED.modalidad_preferida,
                disponibilidad = EXCLUDED.disponibilidad,
                habilidades = EXCLUDED.habilidades,
                cv_texto = EXCLUDED.cv_texto
            WHERE perfiles.usuario_id = EXCLUDED.usuario_id
            RETURNING id;
            """,
            {**perfil, "usuario_id": usuario["id"], "cv_texto": datos.cv_texto},
        )
        fila = cur.fetchone()
        if not fila:
            raise HTTPException(
                status_code=409, detail="Ese correo de perfil pertenece a otro usuario"
            )
        perfil_id = fila["id"]

        postulacion_id = None
        if postulacion.get("vacante_id"):
            cur.execute(
                """
                INSERT INTO postulaciones (perfil_id, vacante_id, estado, siguiente_paso)
                VALUES (%s, %s, %s, %s) RETURNING id;
                """,
                (
                    perfil_id,
                    postulacion["vacante_id"],
                    postulacion.get("estado", "postulado"),
                    resultado.get("mensaje_seguimiento"),
                ),
            )
            postulacion_id = cur.fetchone()["id"]

    log.info("Candidato procesado perfil=%s postulacion=%s", perfil_id, postulacion_id)
    return {
        "perfil_id": perfil_id,
        "postulacion_id": postulacion_id,
        "perfil": perfil,
        "recomendaciones": resultado["recomendaciones"],
        "mensaje_seguimiento": resultado["mensaje_seguimiento"],
    }


# ---------- Tablero de trazabilidad ----------
@app.get("/postulaciones")
def listar_postulaciones(usuario: dict = Depends(usuario_actual)):
    """Un candidato ve solo lo suyo; un admin ve todo."""
    consulta = """
        SELECT p.id, p.estado, p.siguiente_paso, p.fecha_postulacion,
               pf.nombre AS candidato, v.titulo AS vacante
        FROM postulaciones p
        JOIN perfiles pf ON pf.id = p.perfil_id
        JOIN vacantes v ON v.id = p.vacante_id
    """
    params = ()
    if usuario["rol"] != "admin":
        consulta += " WHERE pf.usuario_id = %s"
        params = (usuario["id"],)
    consulta += " ORDER BY p.fecha_postulacion DESC;"

    with conexion() as conn:
        cur = conn.cursor()
        cur.execute(consulta, params)
        return cur.fetchall()


@app.patch("/postulaciones/{postulacion_id}/estado")
def cambiar_estado(
    postulacion_id: int, datos: EstadoIn, admin: dict = Depends(solo_admin)
):
    """Solo el admin mueve una postulación de estado (en revisión, entrevista...)."""
    with conexion() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE postulaciones SET estado = %s WHERE id = %s RETURNING id, estado;",
            (datos.estado, postulacion_id),
        )
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    log.info("Postulación %s -> %s", postulacion_id, datos.estado)
    return fila