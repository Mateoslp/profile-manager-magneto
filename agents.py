import re
import json
import urllib.parse
from collections import Counter
from perfil_utils import limpiar_perfil, parsear_perfil_rigido
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", timeout=30, max_retries=2)

# --- Pesos y scoring de Inari ---
PESO_UBICACION = 2
PESO_MODALIDAD = 2
PESO_SALARIO = 1
PESO_HABILIDAD = 2
MAX_HABILIDADES_MATCH = 3
PUNTAJE_MAXIMO = (
    PESO_UBICACION
    + PESO_MODALIDAD
    + PESO_SALARIO
    + (PESO_HABILIDAD * MAX_HABILIDADES_MATCH)
)

# Puntaje mínimo para que Kenti postule al candidato
UMBRAL_POSTULACION = 4

NOMBRES_LEGIBLES = {
    "aspiracion_salarial": "salario",
    "telefono": "teléfono",
    "educacion": "educación",
    "modalidad_preferida": "modalidad",
    "ubicacion": "ubicación",
    "habilidades": "habilidades",
    "disponibilidad": "disponibilidad",
    "email": "email",
}


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


def _agregar_mensaje(estado, agente, para, tipo, texto, datos=None):
    """Agrega un mensaje a la lista del estado de forma segura."""
    estado.setdefault("mensajes", [])
    estado["mensajes"].append({
        "agente": agente,
        "para": para,
        "tipo": tipo,
        "texto": texto,
        "datos": datos or {},
    })


class EstadoProceso(TypedDict):
    cv_texto: str
    expectativas: dict
    perfil_estructurado: Optional[dict]
    vacantes_disponibles: list
    recomendaciones: Optional[list]
    resultado_postulacion: Optional[dict]
    mensaje_seguimiento: Optional[str]
    mensajes: list


# --- Lexi: estructura el CV y detecta vacíos ---
def agente_lexi(estado: EstadoProceso) -> EstadoProceso:
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
    origen = "gemini"
    try:
        respuesta = llm.invoke(prompt)
        perfil = limpiar_perfil(parsear_json(extraer_texto(respuesta)))
    except Exception as exc:
        perfil_reglas = parsear_perfil_rigido(estado.get("cv_texto", ""))
        if perfil_reglas is not None:
            perfil = perfil_reglas
            origen = "respaldo"
        else:
            raise exc

    estado["perfil_estructurado"] = perfil

    # Clasificar todos los campos vacíos del perfil
    campos_match = {"ubicacion", "modalidad_preferida", "aspiracion_salarial", "habilidades"}
    campos_otros = {"email", "telefono", "educacion", "disponibilidad"}
    vacios_match = [c for c in sorted(campos_match) if not perfil.get(c)]
    vacios_otros = [c for c in sorted(campos_otros) if not perfil.get(c)]
    presentes_match = [c for c in sorted(campos_match) if perfil.get(c)]
    todos_vacios = vacios_match + vacios_otros

    if todos_vacios:
        n = len(todos_vacios)
        palabra = "campo vacío" if n == 1 else "campos vacíos"
        detalles = []
        if vacios_match:
            nm = len(vacios_match)
            verbo = "afecta" if nm == 1 else "afectan"
            nombres = [NOMBRES_LEGIBLES.get(c, c) for c in vacios_match]
            detalles.append(f"{nm} {verbo} el match ({', '.join(nombres)})")
        if vacios_otros:
            no = len(vacios_otros)
            verbo = "afecta" if no == 1 else "afectan"
            nombres = [NOMBRES_LEGIBLES.get(c, c) for c in vacios_otros]
            detalles.append(f"{no} no {verbo} el match ({', '.join(nombres)})")
        texto_alerta = f"Detecté {n} {palabra}: " + ", ".join(detalles) + "."
        _agregar_mensaje(
            estado, "Lexi", "Inari", "alerta",
            texto_alerta,
            {"vacios_match": vacios_match, "vacios_otros": vacios_otros,
             "campos_presentes": presentes_match, "origen": origen},
        )

    presentes_legibles = [NOMBRES_LEGIBLES.get(c, c) for c in presentes_match]
    _agregar_mensaje(
        estado, "Lexi", "Inari", "info",
        f"Perfil estructurado listo. Campos disponibles para match: "
        f"{', '.join(presentes_legibles) if presentes_legibles else 'ninguno'}.",
        {"perfil_nombre": perfil.get("nombre"), "origen": origen},
    )

    return estado


# --- Agente de Vacantes: normaliza lo que ya devuelve GET /vacantes ---
def agente_vacantes(estado: EstadoProceso) -> EstadoProceso:
    normalizadas = []
    for v in estado["vacantes_disponibles"]:
        normalizadas.append({
            "id": v.get("id"),
            "titulo": v.get("titulo"),
            "empresa": v.get("empresa"),
            "ubicacion": v.get("ubicacion"),
            "modalidad": v.get("modalidad"),
            "salario_min": v.get("salario_min"),
            "salario_max": v.get("salario_max"),
            "habilidades": v.get("habilidades"),
        })
    estado["vacantes_disponibles"] = normalizadas
    return estado


# --- Función parametrizada de scoring y recomendación ---
def calcular_recomendaciones(
    perfil: dict,
    vacantes: list[dict],
    peso_ubicacion: int = PESO_UBICACION,
    peso_modalidad: int = PESO_MODALIDAD,
    peso_salario: int = PESO_SALARIO,
    peso_habilidad: int = PESO_HABILIDAD,
    limite: int = 5,
) -> list[dict]:
    """Calcula el score y afinidad de cada vacante respecto al perfil según pesos configurables.
    Devuelve las vacantes ordenadas de mayor a menor score (hasta `limite` vacantes).
    """
    puntaje_maximo = (
        peso_ubicacion
        + peso_modalidad
        + peso_salario
        + (peso_habilidad * MAX_HABILIDADES_MATCH)
    )
    habilidades_candidato = _habilidades(perfil.get("habilidades"))
    candidatas = []
    for v in vacantes:
        score = 0
        if perfil.get("ubicacion") and v.get("ubicacion") == perfil["ubicacion"]:
            score += peso_ubicacion
        if perfil.get("modalidad_preferida") and v.get("modalidad") == perfil["modalidad_preferida"]:
            score += peso_modalidad
        aspiracion = perfil.get("aspiracion_salarial")
        if aspiracion and v.get("salario_max"):
            if v["salario_max"] >= aspiracion:
                score += peso_salario
        habilidades_vacante = _habilidades(v.get("habilidades"))
        comunes = habilidades_candidato & habilidades_vacante
        faltantes = sorted(habilidades_vacante - habilidades_candidato)
        score += min(len(comunes), MAX_HABILIDADES_MATCH) * peso_habilidad
        afinidad = round(score / puntaje_maximo * 100) if puntaje_maximo > 0 else 0
        candidatas.append({
            **v,
            "score": score,
            "afinidad": afinidad,
            "habilidades_en_comun": sorted(comunes),
            "habilidades_faltantes": faltantes,
        })
    candidatas.sort(key=lambda x: x["score"], reverse=True)
    return candidatas[:limite] if limite else candidatas


# --- Recomendador: scoring simple por reglas (no necesita IA) ---
def recomendador(estado: EstadoProceso) -> EstadoProceso:
    perfil = estado["perfil_estructurado"]
    estado["recomendaciones"] = calcular_recomendaciones(
        perfil=perfil,
        vacantes=estado["vacantes_disponibles"],
        peso_ubicacion=PESO_UBICACION,
        peso_modalidad=PESO_MODALIDAD,
        peso_salario=PESO_SALARIO,
        peso_habilidad=PESO_HABILIDAD,
        limite=5,
    )
    return estado


def _extraer_area_vacante(titulo: str) -> str:
    if not titulo:
        return ""
    t = titulo.lower()
    if "backend" in t:
        return "backend"
    if "frontend" in t:
        return "frontend"
    if "fullstack" in t or "full stack" in t:
        return "fullstack"
    if "qa" in t or "calidad" in t or "testing" in t:
        return "qa"
    if "devops" in t or "sre" in t or "cloud" in t:
        return "devops"
    if "dato" in t or "data" in t or "analista" in t or "bi" in t:
        return "datos"
    if "mobile" in t or "android" in t or "ios" in t:
        return "mobile"
    if "ux" in t or "ui" in t or "diseño" in t or "diseñador" in t:
        return "diseño"
    if "soporte" in t or "helpdesk" in t:
        return "soporte"
    if "comercial" in t or "ventas" in t:
        return "ventas"
    palabras = t.split()
    return palabras[0] if palabras else ""


def calcular_plan_b(
    perfil: dict,
    vacantes: list[dict],
    recomendaciones: list[dict],
    umbral: int = UMBRAL_POSTULACION,
) -> dict:
    """Calcula las alternativas de Plan B cuando el mejor score no alcanza el umbral.
    Devuelve hasta 3 grupos:
    - ampliar_modalidades: vacantes ignorando la modalidad preferida (máx 3).
    - areas_cercanas: vacantes de otro tipo/área que comparten >= 2 habilidades (máx 3).
    - casi_cumples: vacantes donde faltan 2 habilidades o menos (máx 3).
    Los grupos vacíos se omiten.
    """
    mejor_score = recomendaciones[0]["score"] if recomendaciones else 0
    if mejor_score >= umbral:
        return {"activo": False, "grupos": {}}

    grupos = {}
    mejor_rec = recomendaciones[0] if recomendaciones else None
    mejor_id = mejor_rec.get("id") if mejor_rec else None

    # a) "ampliar_modalidades": las mejores vacantes ignorando la modalidad preferida
    mod_pref = perfil.get("modalidad_preferida")
    if mod_pref:
        vacs_otra_mod = [
            v for v in vacantes if v.get("modalidad") and v.get("modalidad") != mod_pref
        ]
        if vacs_otra_mod:
            recs_otra_mod = []
            for v in vacs_otra_mod:
                p_sim = {**perfil, "modalidad_preferida": v.get("modalidad")}
                recs_sim = calcular_recomendaciones(p_sim, [v], limite=1)
                if recs_sim:
                    recs_otra_mod.append(recs_sim[0])
            recs_otra_mod.sort(key=lambda x: x["score"], reverse=True)
            if recs_otra_mod:
                grupos["ampliar_modalidades"] = recs_otra_mod[:3]

    # Evaluamos todas las vacantes para b y c
    todas_puntuadas = calcular_recomendaciones(perfil, vacantes, limite=len(vacantes))

    # b) "areas_cercanas": vacantes de otro tipo que comparten al menos 2 habilidades
    areas_cercanas = []
    mejor_area = _extraer_area_vacante(mejor_rec.get("titulo", "")) if mejor_rec else ""
    for r in todas_puntuadas:
        if r.get("id") == mejor_id:
            continue
        if len(r.get("habilidades_en_comun", [])) >= 2:
            area_r = _extraer_area_vacante(r.get("titulo", ""))
            if not mejor_area or area_r != mejor_area:
                areas_cercanas.append(r)
    if areas_cercanas:
        areas_cercanas.sort(
            key=lambda x: (len(x.get("habilidades_en_comun", [])), x.get("score", 0)),
            reverse=True,
        )
        grupos["areas_cercanas"] = areas_cercanas[:3]

    # c) "casi_cumples": vacantes donde faltan 2 habilidades o menos
    casi_cumples = [
        r for r in todas_puntuadas
        if len(r.get("habilidades_faltantes", [])) <= 2
    ]
    if casi_cumples:
        casi_cumples.sort(
            key=lambda x: (x.get("score", 0), -len(x.get("habilidades_faltantes", []))),
            reverse=True,
        )
        grupos["casi_cumples"] = casi_cumples[:3]

    return {"activo": True, "grupos": grupos}


PLANTILLAS_COACHING = [
    "Aprende los fundamentos de {habilidad} para cumplir con los requisitos más solicitados en las vacantes.",
    "Crea un proyecto práctico donde apliques {habilidad} para fortalecer tu portafolio.",
    "Profundiza en conceptos y buenas prácticas de {habilidad} para destacar en tus entrevistas técnicas.",
]


def generar_coaching(perfil: dict, recomendaciones: list[dict]) -> list[dict]:
    """Genera EXACTAMENTE 3 acciones de coaching deterministas basadas en brechas reales,
    con enlaces seguros construidos exclusivamente con urllib.parse.quote_plus."""
    faltantes = []
    for r in recomendaciones:
        faltantes.extend(r.get("habilidades_faltantes", []))

    conteo = Counter(faltantes)
    habilidades_top = [h for h, _ in conteo.most_common()]

    # Si hay menos de 3 habilidades faltantes en las vacantes, complementar con habilidades técnicas estándar
    # que el candidato no tenga aún en su perfil
    habilidades_candidato = _habilidades(perfil.get("habilidades"))
    suplementarias = ["git", "sql", "docker", "apis rest", "pruebas unitarias", "python", "javascript"]
    for s in suplementarias:
        if s not in habilidades_top and s not in habilidades_candidato:
            habilidades_top.append(s)
        if len(habilidades_top) >= 3:
            break

    # Si aún no alcanza 3 (caso extremo de perfil saturado), rellenar con las suplementarias disponibles
    for s in suplementarias:
        if s not in habilidades_top:
            habilidades_top.append(s)
        if len(habilidades_top) >= 3:
            break

    tres_habilidades = habilidades_top[:3]
    acciones = []
    for i, hab in enumerate(tres_habilidades):
        query = f"curso gratis {hab}"
        enlace = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
        accion_texto = PLANTILLAS_COACHING[i % len(PLANTILLAS_COACHING)].format(
            habilidad=hab.strip()
        )
        acciones.append({
            "accion": accion_texto,
            "habilidad": hab.strip(),
            "enlace": enlace,
        })
    return acciones


# --- Inari: normaliza vacantes + puntúa (fusiona vacantes y recomendador) ---
def agente_inari(estado: EstadoProceso) -> EstadoProceso:
    agente_vacantes(estado)
    recomendador(estado)

    recs = estado.get("recomendaciones") or []
    mejor = recs[0] if recs else None
    mejor_score = mejor["score"] if mejor else 0
    cumple = mejor_score >= UMBRAL_POSTULACION

    top_3 = recs[:3]
    if top_3:
        desc = ", ".join(
            f"{r.get('titulo', '?')} ({r['score']} pts)" for r in top_3
        )
        _agregar_mensaje(
            estado, "Inari", "Kenti" if cumple else "Iris", "info",
            f"Top 3 vacantes: {desc}.",
            {"top_3": [{"id": r["id"], "titulo": r.get("titulo"), "score": r["score"]} for r in top_3]},
        )

    razon = (
        f"El mejor puntaje es {mejor_score} (umbral: {UMBRAL_POSTULACION}). "
        + ("Cumple el umbral, se procede a postular." if cumple
           else "No cumple el umbral, no se postula.")
    )
    _agregar_mensaje(
        estado, "Inari", "Kenti" if cumple else "Iris", "decision",
        razon,
        {"mejor_score": mejor_score, "umbral": UMBRAL_POSTULACION, "cumple": cumple},
    )

    return estado


def decidir_postulacion(estado: EstadoProceso) -> str:
    """Conditional edge: decide si pasar a Kenti o saltar a Iris."""
    recs = estado.get("recomendaciones") or []
    mejor = recs[0] if recs else None
    if mejor and mejor["score"] >= UMBRAL_POSTULACION:
        return "Kenti"
    return "Iris"


# --- Kenti: simula la postulación ---
def agente_kenti(estado: EstadoProceso) -> EstadoProceso:
    recs = estado.get("recomendaciones") or []
    mejor = recs[0] if recs else None
    estado["resultado_postulacion"] = {
        "vacante_id": mejor["id"] if mejor else None,
        "estado": "postulado",
    }

    if mejor:
        titulo = mejor.get("titulo", f"id {mejor['id']}")
        texto = f"Postulación simulada a la vacante '{titulo}'."
    else:
        texto = "No hay vacante para postular."

    _agregar_mensaje(
        estado, "Kenti", "Iris", "info", texto,
        {"vacante_id": mejor["id"] if mejor else None},
    )
    return estado


# --- Iris: seguimiento con próximo paso ---
def agente_iris(estado: EstadoProceso) -> EstadoProceso:
    postulacion = estado.get("resultado_postulacion")
    recs = estado.get("recomendaciones") or []
    mejor = recs[0] if recs else None
    perfil = estado.get("perfil_estructurado") or {}
    se_postulo = bool(postulacion and postulacion.get("vacante_id"))

    # Datos calculados con reglas (nunca delegados a Gemini)
    titulo_vacante = mejor.get("titulo", "sin título") if mejor else "sin título"
    puntaje = mejor["score"] if mejor else 0
    if mejor and "habilidades_faltantes" in mejor:
        faltantes = mejor["habilidades_faltantes"]
    else:
        habilidades_candidato = _habilidades(perfil.get("habilidades"))
        habilidades_vacante = _habilidades(mejor.get("habilidades")) if mejor else set()
        faltantes = sorted(habilidades_vacante - habilidades_candidato)
    faltantes_txt = ", ".join(faltantes) if faltantes else "ninguna identificada"

    if se_postulo:
        prompt = (
            f"Esta es una simulación de postulación (no hay proceso real de selección).\n"
            f"Vacante: {titulo_vacante}. Puntaje de match: {puntaje}.\n"
            f"Habilidades que la vacante pide y el candidato no tiene: {faltantes_txt}.\n"
            f"Genera un mensaje en español, texto plano, sin markdown, sin emojis, sin listas, "
            f"máximo 3 frases. Sugiere qué preparar para una posible entrevista y qué "
            f"habilidades reforzar. No afirmes que un equipo revisará el perfil ni "
            f"prometas contacto. Mencioná que es una simulación con naturalidad."
        )
        mensaje_defecto = (
            f"Tu postulación simulada a '{titulo_vacante}' quedó registrada con {puntaje} puntos. "
            + (f"Te faltan estas habilidades respecto a la vacante: {faltantes_txt}. "
               if faltantes else "")
            + "Te sugerimos practicar entrevistas técnicas y reforzar las áreas donde no hubo coincidencia."
        )
    else:
        prompt = (
            f"El candidato NO fue postulado porque su puntaje de match fue bajo.\n"
            f"La mejor vacante era: {titulo_vacante}. Puntaje: {puntaje} (umbral: {UMBRAL_POSTULACION}).\n"
            f"Habilidades que la vacante pide y el candidato no tiene: {faltantes_txt}.\n"
            f"Genera un mensaje en español, texto plano, sin markdown, sin emojis, sin listas, "
            f"máximo 3 frases. Explicá por qué no se postuló y recomendá al candidato "
            f"mejorar en esas habilidades para subir su puntaje. No inventes habilidades "
            f"adicionales. No afirmes que un equipo revisará el perfil ni prometas contacto."
        )
        mensaje_defecto = (
            f"No se postuló a '{titulo_vacante}' porque el puntaje ({puntaje}) "
            f"no alcanzó el umbral ({UMBRAL_POSTULACION}). "
            + (f"Te faltan estas habilidades respecto a la vacante: {faltantes_txt}. "
               if faltantes else "No se identificaron habilidades faltantes específicas. ")
            + "Te recomendamos fortalecer esas áreas y volver a intentar."
        )

    # Una sola generación: la misma cadena va a mensaje_seguimiento y al mensaje de Iris
    origen = "gemini"
    try:
        respuesta = llm.invoke(prompt)
        texto_iris = extraer_texto(respuesta).strip()
    except Exception:
        texto_iris = mensaje_defecto
        origen = "respaldo"

    estado["mensaje_seguimiento"] = texto_iris

    _agregar_mensaje(
        estado, "Iris", "candidato", "info",
        texto_iris,
        {"postulado": se_postulo, "origen": origen,
         "vacante": titulo_vacante, "puntaje": puntaje,
         "habilidades_faltantes": faltantes},
    )

    return estado


# Aliases para compatibilidad con tests existentes
agente_perfil = agente_lexi
agente_postulacion = agente_kenti
agente_seguimiento = agente_iris


# --- Ensamble del grafo ---
grafo = StateGraph(EstadoProceso)
grafo.add_node("Lexi", agente_lexi)
grafo.add_node("Inari", agente_inari)
grafo.add_node("Kenti", agente_kenti)
grafo.add_node("Iris", agente_iris)

grafo.set_entry_point("Lexi")
grafo.add_edge("Lexi", "Inari")
grafo.add_conditional_edges("Inari", decidir_postulacion, {"Kenti": "Kenti", "Iris": "Iris"})
grafo.add_edge("Kenti", "Iris")
grafo.add_edge("Iris", END)

app_grafo = grafo.compile()