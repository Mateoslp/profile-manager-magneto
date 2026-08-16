"""
API mínima de Profile Manager - expone las vacantes de prueba
para que los demás agentes (y el frontend de tu compañero) puedan
consultarlas.

Uso:
    uvicorn main:app --reload
    Luego abre http://127.0.0.1:8000/docs para probarla en el navegador
"""
import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Profile Manager - Backend y Datos")

# Permite que el frontend (Next.js) llame esta API sin bloqueos de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg2.connect(
        DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor
    )


@app.get("/")
def home():
    return {"mensaje": "Profile Manager API funcionando"}


@app.get("/vacantes")
def listar_vacantes():
    """Devuelve todas las vacantes. Los agentes de recomendación
    consumen este endpoint para saber en qué vacantes buscar."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM vacantes ORDER BY id;")
    resultados = cur.fetchall()
    cur.close()
    conn.close()
    return resultados


@app.get("/vacantes/{vacante_id}")
def obtener_vacante(vacante_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM vacantes WHERE id = %s;", (vacante_id,))
    resultado = cur.fetchone()
    cur.close()
    conn.close()
    if not resultado:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return resultado
