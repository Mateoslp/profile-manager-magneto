"""Genera hojas de vida de prueba (LIKAI) con variación CONTROLADA, las separa por
categoría y, si quieres, las procesa con el API y arma un resumen.

Uso (desde la carpeta del proyecto, con el .venv activo):
    python generar_cvs.py                    -> crea 100 CVs y los separa en casos_prueba/
    python generar_cvs.py 30                 -> crea 30
    python generar_cvs.py --enviar 20 TOKEN  -> procesa 20 (de todas las categorías)
                                                con el API y muestra el resumen
"""
import json
import os
import random
import sys
import time
import urllib.request

random.seed(42)  # mismo resultado cada vez que se corre

NOMBRES = ["Mariana", "Camilo", "Valentina", "Santiago", "Daniela", "Andrés",
           "Laura", "Sebastián", "Carolina", "Felipe", "Juliana", "Mateo",
           "Natalia", "Esteban", "Paula", "Julián", "Manuela", "David"]
APELLIDOS = ["Gómez", "Rodríguez", "Martínez", "López", "Hernández", "Castaño",
             "Restrepo", "Ospina", "Vélez", "Giraldo", "Zapata", "Cardona"]

AREAS = {
    "desarrollo backend": ["Python", "FastAPI", "PostgreSQL", "Docker", "APIs REST"],
    "desarrollo frontend": ["React", "Next.js", "TypeScript", "CSS", "Figma"],
    "DevOps": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux"],
    "ciencia de datos": ["Python", "Pandas", "SQL", "Machine Learning", "Power BI"],
    "calidad de software (QA)": ["Pruebas automatizadas", "Selenium", "Jira", "Postman"],
    "soporte técnico": ["Redes", "Windows Server", "Atención al cliente", "ITIL"],
}
NIVELES = {  # nivel: (años mín, años máx, salario mín, salario máx)
    "junior": (0, 2, 2_500_000, 4_000_000),
    "semi-senior": (3, 5, 4_500_000, 7_000_000),
    "senior": (6, 12, 8_000_000, 14_000_000),
}
CIUDADES = ["Medellín", "Bogotá", "Cali", "Barranquilla", "Bucaramanga"]
MODALIDADES = ["remoto", "presencial", "híbrido"]
CARRERAS = ["Ingeniería de Sistemas", "Ingeniería de Software",
            "Ingeniería Informática", "Tecnología en Desarrollo de Software"]
DISPONIBILIDAD = ["inmediata", "en 15 días", "en 1 mes"]
# Completitud: cuánto del CV viene "incompleto"
COMPLETITUD = ["completo"] * 5 + ["sin_salario"] * 2 + ["sin_contacto"] * 2 + ["minimo"]


def generar_cv(i):
    nombre = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}"
    area = random.choice(list(AREAS))
    nivel = random.choice(list(NIVELES))
    a_min, a_max, s_min, s_max = NIVELES[nivel]
    anios = random.randint(a_min, a_max)
    ciudad = random.choice(CIUDADES)
    modalidad = random.choice(MODALIDADES)
    salario = random.randrange(s_min, s_max + 1, 100_000)
    habilidades = ", ".join(random.sample(AREAS[area], k=random.randint(3, len(AREAS[area]))))
    completitud = random.choice(COMPLETITUD)

    correo = f"{nombre.split()[0].lower()}.{nombre.split()[1].lower()}{i}@correo.com"
    correo = correo.translate(str.maketrans("áéíóúñ", "aeioun"))
    telefono = f"3{random.randint(0, 2)}{random.randint(0, 9)}{random.randint(1000000, 9999999)}"

    partes = [f"{nombre}. Profesional en {area} ({nivel}) con {anios} años de experiencia."]
    partes.append(f"Estudié {random.choice(CARRERAS)}.")
    partes.append(f"Vivo en {ciudad}.")
    partes.append(f"Habilidades: {habilidades}.")

    if completitud != "minimo":
        partes.append(f"Disponibilidad: {random.choice(DISPONIBILIDAD)}.")
        partes.append(f"Prefiero trabajar de forma {modalidad}.")
    if completitud in ("completo", "sin_salario"):
        partes.append(f"Contacto: {correo}, {telefono}.")
    if completitud in ("completo", "sin_contacto"):
        partes.append(f"Aspiración salarial: {salario} COP mensuales.")

    return {
        "cv_texto": " ".join(partes),
        "expectativas": {},
        # Lo que esperamos que el sistema detecte (sirve para verificar):
        "_esperado": {"area": area, "nivel": nivel, "ciudad": ciudad,
                      "modalidad": modalidad, "completitud": completitud},
    }


def enviar(cv, token):
    cuerpo = json.dumps({"cv_texto": cv["cv_texto"], "expectativas": cv["expectativas"]}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8000/procesar-candidato", data=cuerpo,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


CAMPOS_CLAVE = ["email", "telefono", "aspiracion_salarial",
                "modalidad_preferida", "disponibilidad", "ubicacion"]


def contar_vacios(perfil):
    """Cuántos campos clave dejó vacíos el Agente de Perfil."""
    return sum(1 for c in CAMPOS_CLAVE if perfil.get(c) is None)


def muestra_balanceada(cvs, n):
    """Toma n CVs repartidos entre todas las categorías de completitud."""
    grupos = {}
    for cv in cvs:
        grupos.setdefault(cv["_esperado"]["completitud"], []).append(cv)
    resultado = []
    while len(resultado) < n and any(grupos.values()):
        for lista in grupos.values():
            if lista and len(resultado) < n:
                resultado.append(lista.pop(0))
    return resultado


def separar_por_categoria(cvs):
    """Guarda un archivo por categoría en casos_prueba/ y muestra el conteo."""
    os.makedirs("casos_prueba", exist_ok=True)
    grupos = {}
    for cv in cvs:
        grupos.setdefault(cv["_esperado"]["completitud"], []).append(cv)
    for categoria, lista in grupos.items():
        ruta = os.path.join("casos_prueba", f"{categoria}.json")
        json.dump(lista, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"  {categoria:<13} {len(lista):>3} CVs  -> {ruta}")


def resumen(resultados):
    """Tabla final: por categoría, cuántos se procesaron y cuántos vacíos se detectaron."""
    grupos = {}
    for r in resultados:
        grupos.setdefault(r["categoria"], []).append(r)
    print("\nRESUMEN POR CATEGORÍA")
    print(f"{'categoría':<13} {'procesados':>10} {'errores':>8} {'vacíos detectados (prom.)':>26}")
    for categoria, lista in grupos.items():
        ok = [r for r in lista if r["ok"]]
        prom = sum(r["vacios"] for r in ok) / len(ok) if ok else 0
        print(f"{categoria:<13} {len(ok):>10} {len(lista) - len(ok):>8} {prom:>26.1f}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--enviar":
        cantidad, token = int(args[1]), args[2]
        cvs = json.load(open("cvs_prueba.json", encoding="utf-8"))
        elegidos = muestra_balanceada(cvs, cantidad)
        resultados = []
        for n, cv in enumerate(elegidos, 1):
            categoria = cv["_esperado"]["completitud"]
            try:
                r = enviar(cv, token)
                vacios = contar_vacios(r["perfil"])
                print(f"[{n}/{len(elegidos)}] {categoria:<13} vacíos={vacios}  -> {r['recomendaciones'][0]['titulo']}")
                resultados.append({"categoria": categoria, "ok": True, "vacios": vacios,
                                   "perfil_id": r["perfil_id"], "esperado": cv["_esperado"]})
            except Exception as e:
                print(f"[{n}/{len(elegidos)}] {categoria:<13} error: {e}")
                resultados.append({"categoria": categoria, "ok": False, "vacios": 0,
                                   "esperado": cv["_esperado"]})
            time.sleep(8)  # respeta el límite por minuto del plan gratis
        json.dump(resultados, open("resultados_prueba.json", "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)
        resumen(resultados)
    else:
        total = int(args[0]) if args else 100
        cvs = [generar_cv(i) for i in range(total)]
        json.dump(cvs, open("cvs_prueba.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"Listo: {total} CVs generados en cvs_prueba.json. Separados por categoría:")
        separar_por_categoria(cvs)
        print("\nEjemplo:", cvs[0]["cv_texto"])