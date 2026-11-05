"""Limpieza de lo que devuelve el Agente de Perfil antes de guardarlo en la BD.
El LLM a veces devuelve listas, números como texto o textos más largos que la
columna; aquí se normaliza todo para que el INSERT no falle."""
import re

MODALIDADES = {"remoto", "presencial", "hibrido"}


def _txt(valor, maximo):
    if valor is None or valor == "":
        return None
    return str(valor).strip()[:maximo]


def _entero(valor):
    """Convierte a entero lo que devuelva el LLM: 5000000, "5000000",
    "5.000.000", "6800000 COP", "3 años"..."""
    if isinstance(valor, bool) or valor is None:
        return None
    if isinstance(valor, (int, float)):
        return int(valor)
    try:
        return int(float(str(valor).strip()))
    except ValueError:
        digitos = re.sub(r"\D", "", str(valor))
        return int(digitos) if digitos else None


def limpiar_perfil(p: dict) -> dict:
    habilidades = p.get("habilidades")
    if isinstance(habilidades, list):
        habilidades = ", ".join(str(h) for h in habilidades)

    modalidad = p.get("modalidad_preferida")
    if isinstance(modalidad, str):
        modalidad = modalidad.strip().lower().replace("í", "i")
    if modalidad not in MODALIDADES:
        modalidad = None

    return {
        "nombre": _txt(p.get("nombre"), 100),
        "email": _txt(p.get("email"), 100).lower() if p.get("email") else None,
        "telefono": _txt(p.get("telefono"), 20),
        "ubicacion": _txt(p.get("ubicacion"), 100),
        "experiencia_anios": _entero(p.get("experiencia_anios")),
        "educacion": _txt(p.get("educacion"), 100),
        "aspiracion_salarial": _entero(p.get("aspiracion_salarial")),
        "modalidad_preferida": modalidad,
        "disponibilidad": _txt(p.get("disponibilidad"), 50),
        "habilidades": _txt(habilidades, 2000),
    }


MAPA_CAMPOS_RIGIDOS = {
    "nombre": "nombre",
    "nombre completo": "nombre",
    "email": "email",
    "correo": "email",
    "correo electronico": "email",
    "correo electrónico": "email",
    "telefono": "telefono",
    "teléfono": "telefono",
    "celular": "telefono",
    "ubicacion": "ubicacion",
    "ubicación": "ubicacion",
    "ciudad": "ubicacion",
    "modalidad": "modalidad_preferida",
    "modalidad preferida": "modalidad_preferida",
    "experiencia": "experiencia_anios",
    "experiencia (años)": "experiencia_anios",
    "experiencia (anios)": "experiencia_anios",
    "experiencia anos": "experiencia_anios",
    "experiencia anios": "experiencia_anios",
    "experiencia años": "experiencia_anios",
    "educacion": "educacion",
    "educación": "educacion",
    "nivel educativo": "educacion",
    "habilidades": "habilidades",
    "habilidades tecnicas": "habilidades",
    "habilidades técnicas": "habilidades",
    "aspiracion salarial": "aspiracion_salarial",
    "aspiración salarial": "aspiracion_salarial",
    "expectativa salarial": "aspiracion_salarial",
    "salario": "aspiracion_salarial",
    "disponibilidad": "disponibilidad",
}

CAMPOS_AUXILIARES_RIGIDOS = {
    "situacion laboral",
    "situación laboral",
    "estudios en curso o recientes",
    "estudios",
    "proyectos destacados",
    "proyectos",
    "voluntariado y actividades",
    "voluntariado",
    "cargo reciente",
    "cargo",
}


def parsear_perfil_rigido(cv_texto: str) -> dict | None:
    """Extrae los 10 campos del perfil cuando el texto tiene formato rígido
    de líneas 'Campo: Valor' (por ejemplo el generado por la entrevista guiada).
    Si encuentra al menos 4 campos reconocidos, devuelve el perfil normalizado con
    limpiar_perfil(). Si es texto libre o no tiene la estructura requerida, devuelve None.
    """
    if not cv_texto or not isinstance(cv_texto, str):
        return None

    perfil_crudo: dict = {}
    reconocidos = 0

    for linea in cv_texto.splitlines():
        match = re.match(r"^\s*([^:]+):\s*(.*)$", linea)
        if not match:
            continue

        clave_raw = match.group(1).strip().lower()
        valor = match.group(2).strip()

        if clave_raw in MAPA_CAMPOS_RIGIDOS:
            campo = MAPA_CAMPOS_RIGIDOS[clave_raw]
            perfil_crudo[campo] = valor
            reconocidos += 1
        elif clave_raw in CAMPOS_AUXILIARES_RIGIDOS:
            reconocidos += 1
            if "primer empleo" in valor.lower() and "experiencia_anios" not in perfil_crudo:
                perfil_crudo["experiencia_anios"] = 0
            elif "estudios" in clave_raw and ("educacion" not in perfil_crudo or not perfil_crudo["educacion"]):
                perfil_crudo["educacion"] = valor

    if reconocidos < 4:
        return None

    return limpiar_perfil(perfil_crudo)
