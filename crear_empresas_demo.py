"""Script para inicializar cuentas demo de empresas y asignarles vacantes sin dueño.

IMPORTANTE:
- Solo se ejecuta si ENABLE_DEMO_COMPANIES="true".
- Lee la contraseña de la variable DEMO_COMPANY_PASSWORD (nunca se escribe en código ni se imprime).
- Es idempotente: si se repite, no sobrescribe dueños ni duplica usuarios.
"""
import os
import sys

from auth import hashear_password
from main import conexion


EMPRESAS_DEMO = [
    {
        "nombre": "Empresa Demo A",
        "email": "empresa.demo.a@likai.demo",
    },
    {
        "nombre": "Empresa Demo B",
        "email": "empresa.demo.b@likai.demo",
    },
]


def main():
    habilitado = os.getenv("ENABLE_DEMO_COMPANIES", "").strip().lower()
    if habilitado != "true":
        print("Operación cancelada: ENABLE_DEMO_COMPANIES debe ser exactamente 'true' para ejecutar este script.")
        sys.exit(0)

    password = os.getenv("DEMO_COMPANY_PASSWORD", "").strip()
    if not password:
        print("Error: Falta configurar la variable de entorno DEMO_COMPANY_PASSWORD.")
        sys.exit(1)

    print("Iniciando creación/verificación de empresas demo...")

    with conexion() as conn:
        cur = conn.cursor()

        # 1. Crear o recuperar empresas demo
        usuarios_empresas = {}
        password_hash = hashear_password(password)

        for emp in EMPRESAS_DEMO:
            email = emp["email"].lower()
            cur.execute("SELECT id, email, rol FROM usuarios WHERE email = %s;", (email,))
            usuario = cur.fetchone()

            if usuario:
                usuarios_empresas[emp["nombre"]] = usuario["id"]
                print(f"- Usuario existente: {emp['nombre']} ({email}, id={usuario['id']})")
            else:
                cur.execute(
                    """
                    INSERT INTO usuarios (email, password_hash, rol)
                    VALUES (%s, %s, 'empresa')
                    RETURNING id;
                    """,
                    (email, password_hash),
                )
                nuevo_id = cur.fetchone()["id"]
                usuarios_empresas[emp["nombre"]] = nuevo_id
                print(f"+ Usuario creado: {emp['nombre']} ({email}, id={nuevo_id})")

        # 2. Buscar vacantes sin dueño ordenadas por cantidad de postulaciones DESC
        cur.execute(
            """
            SELECT v.id, v.titulo, COUNT(p.id) AS total_postulaciones
            FROM vacantes v
            LEFT JOIN postulaciones p ON p.vacante_id = v.id
            WHERE v.usuario_id IS NULL
            GROUP BY v.id, v.titulo
            ORDER BY COUNT(p.id) DESC, v.id ASC;
            """
        )
        vacantes_disponibles = cur.fetchall()

        if not vacantes_disponibles:
            print("No hay vacantes disponibles sin dueño para asignar.")
            return

        asignaciones = {
            EMPRESAS_DEMO[0]["nombre"]: vacantes_disponibles[:3],
            EMPRESAS_DEMO[1]["nombre"]: vacantes_disponibles[3:6],
        }

        print("\n--- Resumen de Asignación de Vacantes ---")
        for nombre_empresa, vacs in asignaciones.items():
            empresa_id = usuarios_empresas[nombre_empresa]
            print(f"\n{nombre_empresa} (id={empresa_id}):")
            if not vacs:
                print("  (Ninguna vacante asignada)")
                continue

            for v in vacs:
                cur.execute(
                    "UPDATE vacantes SET usuario_id = %s WHERE id = %s AND usuario_id IS NULL;",
                    (empresa_id, v["id"]),
                )
                print(f"  * [ID {v['id']}] {v['titulo']} ({v['total_postulaciones']} postulaciones)")

    print("\nProceso finalizado con éxito.")


if __name__ == "__main__":
    main()

