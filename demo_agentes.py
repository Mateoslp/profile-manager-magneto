"""Demo de los agentes: muestra, paso a paso, qué hace cada uno y qué devuelve.

Uso (desde la carpeta del proyecto, con el .venv activo):
    python demo_agentes.py                    -> usa un CV de ejemplo (con datos faltantes)
    python demo_agentes.py "texto de un CV"   -> usa tu propio texto
"""
import json
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from agents import app_grafo

load_dotenv()

CV_EJEMPLO = (
    "Camilo Restrepo, Ingeniero de Sistemas con 4 años de experiencia en desarrollo "
    "backend con Python y PostgreSQL. Vive en Medellín y prefiere trabajar de forma "
    "remota. Disponibilidad inmediata."
)  # a propósito no trae salario ni contacto: Lexi debe detectar esos vacíos

AGENTES = {
    "Lexi": (
        "LEXI (Perfil)",
        "Lee el CV con Gemini y lo convierte en campos estructurados. "
        "Lo que no encuentra queda vacío.",
    ),
    "Inari": (
        "INARI (Vacantes y match)",
        "Normaliza las vacantes y puntúa cada una: ubicación +2, modalidad +2, "
        "salario alcanza +1 y +2 por cada habilidad en común (máx. 3).",
    ),
    "Kenti": (
        "KENTI (Postulación)",
        "Simula la postulación a la vacante con mejor puntaje.",
    ),
    "Iris": (
        "IRIS (Seguimiento)",
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
    if nodo == "Lexi":
        perfil = estado["perfil_estructurado"]
        vacios = [k for k, v in perfil.items() if v is None and k != "vacios"]
        return {"perfil": perfil, "campos_vacios_detectados": vacios}
    if nodo == "Inari":
        recs = estado.get("recomendaciones") or []
        return [
            {"vacante": r["titulo"], "score": r["score"], "habilidades_en_comun": r["habilidades_en_comun"]}
            for r in recs[:3]
        ]
    if nodo == "Kenti":
        return estado.get("resultado_postulacion")
    if nodo == "Iris":
        return estado.get("mensaje_seguimiento")


def ejecutar_demo(cv_texto, vacantes):
    print("\n" + "=" * 70)
    print("CV DE ENTRADA:\n" + cv_texto)
    print("=" * 70)

    estado = {"cv_texto": cv_texto, "expectativas": {}, "vacantes_disponibles": vacantes, "mensajes": []}
    inicio = time.time()
    anterior = inicio
    msg_idx = 0

    for paso in app_grafo.stream(estado, stream_mode="updates"):
        for nodo, cambios in paso.items():
            ahora = time.time()
            nombre, que_hace = AGENTES.get(nodo, (nodo, ""))
            print(f"\n>>> {nombre}   ({ahora - anterior:.1f} s)")
            print(f"    Qué hace: {que_hace}")
            print("    Resultado:")
            salida = json.dumps(resumen(nodo, cambios), ensure_ascii=False, indent=2, default=str)
            print("    " + salida.replace("\n", "\n    "))

            # Imprimir mensajes entre agentes generados en este paso
            mensajes = cambios.get("mensajes", [])
            if len(mensajes) > msg_idx:
                print("    Mensajes:")
                for msg in mensajes[msg_idx:]:
                    emoji = {"info": "ℹ️", "alerta": "⚠️", "decision": "🔀"}.get(msg["tipo"], "📨")
                    print(f"      {emoji} {msg['agente']} → {msg['para']} [{msg['tipo']}]: {msg['texto']}")
                msg_idx = len(mensajes)

            anterior = ahora

    print("\n" + "=" * 70)
    print(f"Flujo completo en {time.time() - inicio:.1f} s")


if __name__ == "__main__":
    cv = sys.argv[1] if len(sys.argv) > 1 else CV_EJEMPLO
    ejecutar_demo(cv, cargar_vacantes())