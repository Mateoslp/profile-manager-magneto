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