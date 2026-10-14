"""Demo de los agentes: muestra, paso a paso, qué hace cada uno y qué devuelve.

Uso (desde la carpeta del proyecto, con el .venv activo):
    python demo_agentes.py                    -> usa un CV de ejemplo (con datos faltantes)
    python demo_agentes.py "texto de un CV"   -> usa tu propio texto
"""
import json
import os
import sys
import time

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from agents import app_grafo

load_dotenv()

CV_EJEMPLO = (
    "Camilo Restrepo, Ingeniero de Sistemas con 4 años de experiencia en desarrollo "
    "backend con Python y PostgreSQL. Vive en Medellín y prefiere trabajar de forma "
    "remota. Disponibilidad inmediata."
)  # a propósito no trae salario ni contacto: el Agente de Perfil debe detectar esos vacíos

AGENTES = {
    "perfil": (
        "AGENTE DE PERFIL",
        "Lee el CV con Gemini y lo convierte en campos estructurados. "
        "Lo que no encuentra queda vacío.",
    ),
    "vacantes": (
        "AGENTE DE VACANTES",
        "Toma las vacantes de la base de datos y deja solo los campos útiles.",
    ),
    "recomendador": (
        "RECOMENDADOR (reglas, sin IA)",
        "Puntúa cada vacante: ubicación igual +2, modalidad igual +2, salario alcanza +1 y +2 por cada habilidad en común (máx. 3).",
    ),
    "postulacion": (
        "AGENTE DE POSTULACIÓN",
        "Simula la postulación a la vacante con mejor puntaje.",
    ),
    "seguimiento": (
        "AGENTE DE SEGUIMIENTO",
        "Genera con Gemini el próximo paso para el candidato.",
    ),
}


def cargar_vacantes():
    conn = psycopg2.connect(
        os.getenv("DATABASE_URL"), cursor_factory=psycopg2.extras.RealDictCursor
    )
    cur = conn.cursor()
    cur.execute("SELECT * FROM vacantes ORDER BY id;")
    filas = cur.fetchall()
    conn.close()
    return filas


def resumen(nodo, estado):
    """Qué mostrar de cada agente (lo que produjo)."""
    if nodo == "perfil":
        perfil = estado["perfil_estructurado"]
        vacios = [k for k, v in perfil.items() if v is None and k != "vacios"]
        return {"perfil": perfil, "campos_vacios_detectados": vacios}
    if nodo == "vacantes":
        return {"vacantes_listas": len(estado["vacantes_disponibles"])}
    if nodo == "recomendador":
        return [
{"vacante": r["titulo"], "score": r["score"], "habilidades_en_comun": r["habilidades_en_comun"]}
            for r in estado["recomendaciones"][:3]
        ]
    if nodo == "postulacion":
        return estado["resultado_postulacion"]
    if nodo == "seguimiento":
        return estado["mensaje_seguimiento"]


def ejecutar_demo(cv_texto, vacantes):
    print("\n" + "=" * 70)
    print("CV DE ENTRADA:\n" + cv_texto)
    print("=" * 70)

    estado = {"cv_texto": cv_texto, "expectativas": {}, "vacantes_disponibles": vacantes}
    inicio = time.time()
    anterior = inicio

    for paso in app_grafo.stream(estado, stream_mode="updates"):
        for nodo, cambios in paso.items():
            ahora = time.time()
            nombre, que_hace = AGENTES[nodo]
            print(f"\n>>> {nombre}   ({ahora - anterior:.1f} s)")
            print(f"    Qué hace: {que_hace}")
            print("    Resultado:")
            salida = json.dumps(resumen(nodo, cambios), ensure_ascii=False, indent=2, default=str)
            print("    " + salida.replace("\n", "\n    "))
            anterior = ahora

    print("\n" + "=" * 70)
    print(f"Flujo completo en {time.time() - inicio:.1f} s")


if __name__ == "__main__":
    cv = sys.argv[1] if len(sys.argv) > 1 else CV_EJEMPLO
    ejecutar_demo(cv, cargar_vacantes())