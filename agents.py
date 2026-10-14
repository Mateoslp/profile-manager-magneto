import re
import json
from perfil_utils import limpiar_perfil
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", timeout=30, max_retries=2)


def extraer_texto(respuesta):
    """Gemini a veces devuelve el contenido como texto plano y a veces como
    una lista de partes; esta función normaliza ambos casos."""
    contenido = respuesta.content
    if isinstance(contenido, str):
        return contenido
    if isinstance(contenido, list):
        partes = []
        for item in contenido:
            if isinstance(item, str):
                partes.append(item)
            elif isinstance(item, dict):
                partes.append(item.get("text", ""))
        return "".join(partes)
    return str(contenido)


def parsear_json(texto):
    """Extrae el primer objeto JSON del texto aunque el modelo agregue
    marcas de código o frases extra."""
    inicio = texto.find("{")
    fin = texto.rfind("}")
    if inicio == -1 or fin == -1:
        raise ValueError("La respuesta del modelo no contiene un JSON")
    return json.loads(texto[inicio : fin + 1])

def _habilidades(texto):
    """'Python, SQL; Docker' -> {'python', 'sql', 'docker'}"""
    if not texto:
        return set()
    partes = re.split(r"[,;/\n]", str(texto))
    return {p.strip().lower() for p in partes if p.strip()}


class EstadoProceso(TypedDict):
    cv_texto: str
    expectativas: dict
    perfil_estructurado: Optional[dict]
    vacantes_disponibles: list
    recomendaciones: Optional[list]
    resultado_postulacion: Optional[dict]
    mensaje_seguimiento: Optional[str]


# --- Agente de Perfil: estructura el CV y detecta vacios ---
def agente_perfil(estado: EstadoProceso) -> EstadoProceso:
    prompt = f"""
Eres un asistente que estructura hojas de vida para una plataforma de empleo en Colombia.
A partir del CV y las expectativas del candidato, extrae un JSON con EXACTAMENTE estos campos
(coinciden con las columnas de la tabla "perfiles"):
nombre, email, telefono, ubicacion, experiencia_anios, educacion, aspiracion_salarial,
modalidad_preferida (uno de: remoto, presencial, hibrido), disponibilidad, habilidades.

Si un campo no aparece en el texto, pon null en ese campo y agregalo a una lista "vacios".

CV:
{estado['cv_texto']}

Expectativas adicionales:
{json.dumps(estado.get('expectativas', {}), ensure_ascii=False)}

Responde UNICAMENTE con el JSON, sin texto adicional ni marcas de codigo.
"""
    respuesta = llm.invoke(prompt)
    perfil = limpiar_perfil(parsear_json(extraer_texto(respuesta)))
    estado["perfil_estructurado"] = perfil
    return estado


# --- Agente de Vacantes: normaliza lo que ya devuelve tu GET /vacantes ---
def agente_vacantes(estado: EstadoProceso) -> EstadoProceso:
    normalizadas = []
    for v in estado["vacantes_disponibles"]:
        normalizadas.append({
            "id": v.get("id"),
            "titulo": v.get("titulo"),
            "ubicacion": v.get("ubicacion"),
            "modalidad": v.get("modalidad"),
            "salario_min": v.get("salario_min"),
            "salario_max": v.get("salario_max"),
          "habilidades": v.get("habilidades"),
            
        })
    estado["vacantes_disponibles"] = normalizadas
    return estado


# --- Recomendador: scoring simple por reglas (no necesita IA) ---
def recomendador(estado: EstadoProceso) -> EstadoProceso:
    perfil = estado["perfil_estructurado"]
    candidatas = []
    for v in estado["vacantes_disponibles"]:
        score = 0
        if perfil.get("ubicacion") and v.get("ubicacion") == perfil["ubicacion"]:
            score += 2
        if perfil.get("modalidad_preferida") and v.get("modalidad") == perfil["modalidad_preferida"]:
            score += 2
        aspiracion = perfil.get("aspiracion_salarial")
        if aspiracion and v.get("salario_max"):
            if v["salario_max"] >= aspiracion:
                score += 1
        comunes = _habilidades(perfil.get("habilidades")) & _habilidades(v.get("habilidades"))
        score += min(len(comunes), 3) * 2
        candidatas.append({**v, "score": score, "habilidades_en_comun": sorted(comunes)})
    candidatas.sort(key=lambda x: x["score"], reverse=True)
    estado["recomendaciones"] = candidatas[:5]
    return estado


# --- Agente de Postulacion: simula la accion, deja listo el estado para guardar ---
def agente_postulacion(estado: EstadoProceso) -> EstadoProceso:
    mejor = estado["recomendaciones"][0] if estado["recomendaciones"] else None
    estado["resultado_postulacion"] = {
        "vacante_id": mejor["id"] if mejor else None,
        "estado": "postulado",
    }
    return estado


# --- Agente de Seguimiento: genera el proximo paso ---
def agente_seguimiento(estado: EstadoProceso) -> EstadoProceso:
    prompt = f"""
El candidato acaba de postularse a esta vacante: {estado['resultado_postulacion']}.
Genera un mensaje corto y profesional (maximo 2 frases) con el proximo paso sugerido
para el candidato.
"""
    respuesta = llm.invoke(prompt)
    estado["mensaje_seguimiento"] = extraer_texto(respuesta).strip()
    return estado


# --- Ensamble del grafo ---
grafo = StateGraph(EstadoProceso)
grafo.add_node("perfil", agente_perfil)
grafo.add_node("vacantes", agente_vacantes)
grafo.add_node("recomendador", recomendador)
grafo.add_node("postulacion", agente_postulacion)
grafo.add_node("seguimiento", agente_seguimiento)

grafo.set_entry_point("perfil")
grafo.add_edge("perfil", "vacantes")
grafo.add_edge("vacantes", "recomendador")
grafo.add_edge("recomendador", "postulacion")
grafo.add_edge("postulacion", "seguimiento")
grafo.add_edge("seguimiento", END)

app_grafo = grafo.compile()