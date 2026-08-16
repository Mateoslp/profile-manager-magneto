"""
Crea las tablas y carga el dataset de vacantes de prueba en Postgres.

Uso:
    1. Configura tu cadena de conexión en el archivo .env (copia .env.example)
    2. pip install -r requirements.txt
    3. python load_data.py
"""
import json
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def main():
    if not DATABASE_URL:
        raise SystemExit(
            "No se encontró DATABASE_URL. Copia .env.example a .env y "
            "pega ahí tu connection string de Neon/Supabase."
        )

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # 1. Crear las tablas (si no existen)
    with open("schema.sql", "r", encoding="utf-8") as f:
        cur.execute(f.read())
    conn.commit()
    print("Tablas creadas (o ya existían).")

    # 2. Evitar duplicar datos si el script se corre más de una vez
    cur.execute("SELECT COUNT(*) FROM vacantes;")
    if cur.fetchone()[0] > 0:
        print("La tabla 'vacantes' ya tiene datos, no se vuelve a cargar.")
        cur.close()
        conn.close()
        return

    # 3. Cargar el dataset de vacantes
    with open("seed_vacantes.json", "r", encoding="utf-8") as f:
        vacantes = json.load(f)

    for v in vacantes:
        cur.execute(
            """
            INSERT INTO vacantes
                (titulo, empresa, ubicacion, modalidad, tipo_contrato,
                 salario_min, salario_max, experiencia_requerida,
                 educacion_requerida, habilidades, descripcion,
                 fecha_publicacion, url_fuente)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                v["titulo"], v["empresa"], v["ubicacion"], v["modalidad"],
                v["tipo_contrato"], v["salario_min"], v["salario_max"],
                v["experiencia_requerida"], v["educacion_requerida"],
                v["habilidades"], v["descripcion"], v["fecha_publicacion"],
                v["url_fuente"],
            ),
        )

    conn.commit()
    print(f"Se cargaron {len(vacantes)} vacantes de prueba.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
