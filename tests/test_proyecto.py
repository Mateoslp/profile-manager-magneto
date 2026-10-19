"""Pruebas unitarias de Profile Manager (no usan internet ni la base de datos).
Correr desde la carpeta del proyecto con:  python -m pytest -v
"""
import os
import time

# Valores falsos solo para que los módulos importen sin tocar el .env real
os.environ.setdefault("JWT_SECRET", "secreto-solo-para-pruebas")
os.environ.setdefault("GOOGLE_API_KEY", "clave-falsa-para-pruebas")

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

import auth
from agents import (
    PESO_HABILIDAD,
    PESO_MODALIDAD,
    PESO_SALARIO,
    PESO_UBICACION,
    PUNTAJE_MAXIMO,
    agente_inari,
    agente_kenti,
    agente_postulacion,
    agente_vacantes,
    decidir_postulacion,
    extraer_texto,
    parsear_json,
    recomendador,
)
from perfil_utils import limpiar_perfil


class FakeRespuesta:
    def __init__(self, content):
        self.content = content


def vacante(id, ubic="Medellín", modalidad="remoto", salario_max=6_000_000):
    return {
        "id": id, "titulo": f"Vacante {id}", "ubicacion": ubic,
        "modalidad": modalidad, "salario_min": 3_000_000, "salario_max": salario_max,
    }


# ---------- Recomendador ----------
def test_recomendador_da_score_maximo_cuando_todo_coincide():
    estado = {
        "perfil_estructurado": {
            "ubicacion": "Medellín", "modalidad_preferida": "remoto",
            "aspiracion_salarial": 5_000_000,
        },
        "vacantes_disponibles": [vacante(1)],
    }
    assert recomendador(estado)["recomendaciones"][0]["score"] == 5


def test_recomendador_ordena_de_mayor_a_menor():
    estado = {
        "perfil_estructurado": {"ubicacion": "Medellín", "modalidad_preferida": "remoto"},
        "vacantes_disponibles": [
            vacante(1, ubic="Cali", modalidad="presencial"),
            vacante(2),
        ],
    }
    ids = [v["id"] for v in recomendador(estado)["recomendaciones"]]
    assert ids == [2, 1]


def test_recomendador_devuelve_maximo_5():
    estado = {
        "perfil_estructurado": {},
        "vacantes_disponibles": [vacante(i) for i in range(10)],
    }
    assert len(recomendador(estado)["recomendaciones"]) == 5


def test_recomendador_no_falla_con_perfil_vacio():
    estado = {"perfil_estructurado": {}, "vacantes_disponibles": [vacante(1)]}
    assert recomendador(estado)["recomendaciones"][0]["score"] == 0


# ---------- Constantes de Inari y cálculo de afinidad ----------
def test_constantes_scoring_y_puntaje_maximo():
    import agents
    assert agents.PESO_UBICACION == 2
    assert agents.PESO_MODALIDAD == 2
    assert agents.PESO_SALARIO == 1
    assert agents.PESO_HABILIDAD == 2
    assert agents.MAX_HABILIDADES_MATCH == 3
    assert agents.PUNTAJE_MAXIMO == 2 + 2 + 1 + (2 * 3)  # 11


def test_recomendaciones_incluyen_afinidad_y_habilidades_faltantes():
    estado = {
        "perfil_estructurado": {
            "ubicacion": "Medellín",
            "modalidad_preferida": "remoto",
            "aspiracion_salarial": 5_000_000,
            "habilidades": "Python, SQL",
        },
        "vacantes_disponibles": [
            {
                "id": 1, "titulo": "Dev Backend", "ubicacion": "Medellín",
                "modalidad": "remoto", "salario_min": 4_000_000, "salario_max": 6_000_000,
                "habilidades": "Python, SQL, Docker, AWS",
            }
        ],
    }
    rec = recomendador(estado)["recomendaciones"][0]
    # score: ubicacion (2) + modalidad (2) + salario (1) + 2 habilidades comunes (4) = 9
    assert rec["score"] == 9
    # afinidad: round(9 / 11 * 100) = 82
    assert rec["afinidad"] == round(9 / 11 * 100)
    assert isinstance(rec["afinidad"], int)
    assert 0 <= rec["afinidad"] <= 100
    # habilidades faltantes calculadas con reglas
    assert rec["habilidades_faltantes"] == ["aws", "docker"]
    assert rec["habilidades_en_comun"] == ["python", "sql"]


# ---------- Agente de Vacantes y Postulación ----------
def test_agente_vacantes_conserva_solo_campos_necesarios():
    estado = {"vacantes_disponibles": [{**vacante(1), "descripcion": "texto largo"}]}
    resultado = agente_vacantes(estado)["vacantes_disponibles"][0]
    assert "descripcion" not in resultado
    assert resultado["titulo"] == "Vacante 1"


def test_postulacion_elige_la_mejor_recomendacion():
    estado = {"recomendaciones": [{"id": 7, "score": 5}, {"id": 3, "score": 1}]}
    resultado = agente_postulacion(estado)["resultado_postulacion"]
    assert resultado == {"vacante_id": 7, "estado": "postulado"}


def test_postulacion_sin_recomendaciones_no_inventa_vacante():
    resultado = agente_postulacion({"recomendaciones": []})["resultado_postulacion"]
    assert resultado["vacante_id"] is None


# ---------- Lectura de respuestas del LLM ----------
def test_extraer_texto_acepta_texto_plano():
    assert extraer_texto(FakeRespuesta("hola")) == "hola"


def test_extraer_texto_acepta_lista_de_partes():
    r = FakeRespuesta([{"type": "text", "text": "ho"}, "la"])
    assert extraer_texto(r) == "hola"


def test_parsear_json_ignora_marcas_de_codigo():
    assert parsear_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_parsear_json_sin_json_lanza_error():
    with pytest.raises(ValueError):
        parsear_json("no hay nada aquí")


# ---------- Limpieza del perfil ----------
def test_limpiar_perfil_convierte_lista_de_habilidades_a_texto():
    assert limpiar_perfil({"habilidades": ["Python", "SQL"]})["habilidades"] == "Python, SQL"


def test_limpiar_perfil_normaliza_modalidad():
    assert limpiar_perfil({"modalidad_preferida": "Híbrido"})["modalidad_preferida"] == "hibrido"


def test_limpiar_perfil_descarta_modalidad_invalida():
    assert limpiar_perfil({"modalidad_preferida": "en la luna"})["modalidad_preferida"] is None


def test_limpiar_perfil_trunca_telefono_y_convierte_numeros():
    p = limpiar_perfil({"telefono": "3" * 40, "aspiracion_salarial": "5000000"})
    assert len(p["telefono"]) == 20
    assert p["aspiracion_salarial"] == 5_000_000


# ---------- Seguridad ----------
def test_password_correcta_se_verifica():
    guardado = auth.hashear_password("clave-segura-123")
    assert auth.verificar_password("clave-segura-123", guardado)


def test_password_incorrecta_se_rechaza():
    guardado = auth.hashear_password("clave-segura-123")
    assert not auth.verificar_password("otra-clave", guardado)


def test_dos_hashes_de_la_misma_clave_son_distintos():
    assert auth.hashear_password("igual-igual") != auth.hashear_password("igual-igual")


def _cred(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_token_valido_devuelve_usuario_y_rol():
    token = auth.crear_token(5, "candidato")
    assert auth.usuario_actual(_cred(token)) == {"id": 5, "rol": "candidato"}


def test_token_expirado_da_401():
    vencido = jwt.encode(
        {"sub": "1", "rol": "candidato", "exp": int(time.time()) - 10},
        auth.JWT_SECRET, algorithm=auth.ALGORITMO,
    )
    with pytest.raises(HTTPException) as e:
        auth.usuario_actual(_cred(vencido))
    assert e.value.status_code == 401


def test_token_alterado_da_401():
    with pytest.raises(HTTPException) as e:
        auth.usuario_actual(_cred(auth.crear_token(1, "admin") + "x"))
    assert e.value.status_code == 401


def test_candidato_no_pasa_el_filtro_de_admin():
    with pytest.raises(HTTPException) as e:
        auth.solo_admin({"id": 1, "rol": "candidato"})
    assert e.value.status_code == 403


def test_rate_limit_bloquea_despues_del_maximo():
    auth._historial.clear()
    usuario = {"id": 999, "rol": "candidato"}
    for _ in range(auth.MAX_LLAMADAS_POR_MINUTO):
        auth.limitar_llamadas(usuario)
    with pytest.raises(HTTPException) as e:
        auth.limitar_llamadas(usuario)
    assert e.value.status_code == 429


# ---------- Bug real: el LLM devolvió el salario como texto ----------
def test_limpiar_perfil_entiende_salario_con_texto_y_puntos():
    assert limpiar_perfil({"aspiracion_salarial": "6800000 COP"})["aspiracion_salarial"] == 6_800_000
    assert limpiar_perfil({"aspiracion_salarial": "5.000.000"})["aspiracion_salarial"] == 5_000_000
    assert limpiar_perfil({"aspiracion_salarial": "no dice"})["aspiracion_salarial"] is None


def test_agente_perfil_deja_el_salario_como_numero(monkeypatch):
    import agents

    class FakeLLM:
        def invoke(self, prompt):
            return FakeRespuesta('{"nombre": "Ana", "aspiracion_salarial": "6800000 COP", '
                                 '"modalidad_preferida": "Híbrido"}')

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = agents.agente_perfil({"cv_texto": "cv", "expectativas": {}})
    assert estado["perfil_estructurado"]["aspiracion_salarial"] == 6_800_000
    # y el recomendador ya no se rompe al comparar con el salario de la vacante
    estado["vacantes_disponibles"] = [vacante(1, modalidad="hibrido")]
    # modalidad coincide (+2); el salario no alcanza (6,0 M < 6,8 M), no suma
    assert agents.recomendador(estado)["recomendaciones"][0]["score"] == 2


# ---------- Recomendación por habilidades ----------
def test_habilidades_en_comun_pesan_mas_que_la_ciudad():
    estado = {
        "perfil_estructurado": {"ubicacion": "Cali", "habilidades": "Python, FastAPI, SQL"},
        "vacantes_disponibles": [
            {**vacante(1, ubic="Cali"), "habilidades": "Atención al cliente, Ventas"},
            {**vacante(2, ubic="Bogotá"), "habilidades": "python, sql, Docker"},
        ],
    }
    mejor = recomendador(estado)["recomendaciones"][0]
    assert mejor["id"] == 2
    assert mejor["habilidades_en_comun"] == ["python", "sql"]


def test_agente_vacantes_conserva_las_habilidades():
    estado = {"vacantes_disponibles": [{**vacante(1), "habilidades": "Python, SQL"}]}
    assert agente_vacantes(estado)["vacantes_disponibles"][0]["habilidades"] == "Python, SQL"


# ---------- Enrutamiento condicional ----------
def test_enrutamiento_puntaje_alto_pasa_a_kenti():
    estado = {"recomendaciones": [{"id": 1, "score": 5}]}
    assert decidir_postulacion(estado) == "Kenti"


def test_enrutamiento_puntaje_bajo_salta_a_iris():
    estado = {"recomendaciones": [{"id": 1, "score": 2}]}
    assert decidir_postulacion(estado) == "Iris"


def test_enrutamiento_sin_recomendaciones_salta_a_iris():
    assert decidir_postulacion({"recomendaciones": []}) == "Iris"
    assert decidir_postulacion({}) == "Iris"


# ---------- Mensajes entre agentes ----------
def test_lexi_genera_mensajes_campos_vacios(monkeypatch):
    import agents

    class FakeLLM:
        def invoke(self, prompt):
            return FakeRespuesta('{"nombre": "Ana", "ubicacion": "Medellín"}')

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = {"cv_texto": "cv de prueba", "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    alertas = [m for m in resultado["mensajes"] if m["tipo"] == "alerta"]
    assert len(alertas) == 1
    texto = alertas[0]["texto"]
    assert "campos vacíos" in texto
    # Nombres legibles con tildes y sin guiones bajos en el texto
    assert "afectan el match" in texto
    assert "modalidad" in texto
    assert "salario" in texto
    assert "teléfono" in texto
    assert "educación" in texto
    assert "_" not in texto
    assert texto.endswith(".")
    # En datos se conservan las claves técnicas
    assert "modalidad_preferida" in alertas[0]["datos"]["vacios_match"]
    assert "aspiracion_salarial" in alertas[0]["datos"]["vacios_match"]
    assert "telefono" in alertas[0]["datos"]["vacios_otros"]


def test_lexi_no_alerta_si_todo_completo(monkeypatch):
    import agents

    class FakeLLM:
        def invoke(self, prompt):
            return FakeRespuesta(
                '{"nombre": "Ana", "email": "ana@test.com", "telefono": "3001234567", '
                '"ubicacion": "Medellín", "modalidad_preferida": "remoto", '
                '"educacion": "Ingeniera de Sistemas", "disponibilidad": "inmediata", '
                '"aspiracion_salarial": 5000000, "habilidades": "Python, SQL"}'
            )

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = {"cv_texto": "cv completo", "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    alertas = [m for m in resultado["mensajes"] if m["tipo"] == "alerta"]
    assert len(alertas) == 0


def test_inari_genera_mensaje_decision():
    estado = {
        "perfil_estructurado": {"ubicacion": "Medellín", "modalidad_preferida": "remoto"},
        "vacantes_disponibles": [vacante(1)],
        "mensajes": [],
    }
    resultado = agente_inari(estado)
    decisiones = [m for m in resultado["mensajes"] if m["tipo"] == "decision"]
    assert len(decisiones) == 1
    assert "umbral" in decisiones[0]["texto"]
    assert "cumple" in decisiones[0]["datos"]


def test_kenti_genera_mensaje_info():
    estado = {
        "recomendaciones": [{"id": 7, "titulo": "Dev Python", "score": 5}],
        "mensajes": [],
    }
    resultado = agente_kenti(estado)
    infos = [m for m in resultado["mensajes"] if m["agente"] == "Kenti"]
    assert len(infos) == 1
    assert "Dev Python" in infos[0]["texto"]


def test_mensajes_acumulan_en_orden(monkeypatch):
    import agents

    class FakeLLM:
        def invoke(self, prompt):
            return FakeRespuesta('{"nombre": "Ana", "ubicacion": "Medellín", "habilidades": "Python"}')

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = {
        "cv_texto": "cv", "expectativas": {},
        "vacantes_disponibles": [vacante(1)],
        "mensajes": [],
    }
    agents.agente_lexi(estado)
    agents.agente_inari(estado)
    agentes_en_orden = [m["agente"] for m in estado["mensajes"]]
    assert agentes_en_orden[0] == "Lexi"
    idx_inari = next(i for i, a in enumerate(agentes_en_orden) if a == "Inari")
    idx_lexi_last = max(i for i, a in enumerate(agentes_en_orden) if a == "Lexi")
    assert idx_inari > idx_lexi_last


def test_iris_sin_postulacion_calcula_habilidades_faltantes(monkeypatch):
    import agents

    prompts_recibidos = []

    class FakeLLM:
        def invoke(self, prompt):
            prompts_recibidos.append(prompt)
            return FakeRespuesta("Mensaje de Iris redactado.")

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = {
        "perfil_estructurado": {"habilidades": "Python, SQL"},
        "recomendaciones": [
            {**vacante(1), "score": 2, "habilidades_en_comun": ["python"],
             "habilidades": "Python, SQL, Docker, Kubernetes"}
        ],
        "resultado_postulacion": None,
        "mensajes": [],
    }
    resultado = agents.agente_iris(estado)
    assert resultado["mensaje_seguimiento"] == "Mensaje de Iris redactado."
    # Las habilidades faltantes se calcularon con reglas y se pasaron al prompt
    assert "docker" in prompts_recibidos[0].lower()
    assert "kubernetes" in prompts_recibidos[0].lower()
    # Debe incluir título y puntaje en el prompt
    assert "vacante 1" in prompts_recibidos[0].lower()
    # origen = gemini cuando Gemini no falla
    msg_iris = [m for m in resultado["mensajes"] if m["agente"] == "Iris"][0]
    assert msg_iris["datos"]["origen"] == "gemini"


def test_iris_sin_postulacion_usa_mensaje_defecto_si_llm_falla(monkeypatch):
    import agents

    class FalloLLM:
        def invoke(self, prompt):
            raise Exception("Gemini no disponible")

    monkeypatch.setattr(agents, "llm", FalloLLM())
    estado = {
        "perfil_estructurado": {"habilidades": "Python"},
        "recomendaciones": [
            {**vacante(1), "score": 2, "habilidades_en_comun": ["python"],
             "habilidades": "Python, Docker, Kubernetes"}
        ],
        "resultado_postulacion": None,
        "mensajes": [],
    }
    resultado = agents.agente_iris(estado)
    # El mensaje por defecto menciona las habilidades faltantes calculadas por reglas
    assert "docker" in resultado["mensaje_seguimiento"].lower()
    assert "kubernetes" in resultado["mensaje_seguimiento"].lower()
    # origen = respaldo cuando Gemini falla
    msg_iris = [m for m in resultado["mensajes"] if m["agente"] == "Iris"][0]
    assert msg_iris["datos"]["origen"] == "respaldo"


def test_resultado_postulacion_none_cuando_no_se_postula():
    """Cuando el puntaje es bajo, decidir_postulacion redirige a Iris
    y resultado_postulacion no se establece."""
    estado = {
        "recomendaciones": [{"id": 1, "titulo": "Vacante 1", "score": 2}],
        "mensajes": [],
    }
    assert decidir_postulacion(estado) == "Iris"
    assert estado.get("resultado_postulacion") is None


def test_lexi_singular_cuando_falta_un_campo_de_match(monkeypatch):
    """Con un solo campo vacío de match, el verbo debe ser singular y legible."""
    import agents

    class FakeLLM:
        def invoke(self, prompt):
            return FakeRespuesta(
                '{"nombre": "Ana", "email": "ana@x.com", "telefono": "123", '
                '"ubicacion": "Medellín", "modalidad_preferida": "remoto", '
                '"educacion": "Ingeniería", "disponibilidad": "inmediata", '
                '"habilidades": "Python"}'
            )

    monkeypatch.setattr(agents, "llm", FakeLLM())
    estado = {"cv_texto": "cv", "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    alertas = [m for m in resultado["mensajes"] if m["tipo"] == "alerta"]
    assert len(alertas) == 1
    assert "1 campo vacío" in alertas[0]["texto"]
    assert "1 afecta el match (salario)" in alertas[0]["texto"]
    assert "_" not in alertas[0]["texto"]


# Frases prohibidas en los mensajes de respaldo de Iris
_FRASES_PROHIBIDAS = [
    "recursos humanos", "nos pondremos en contacto", "revisará tu perfil",
    "se pondrá en contacto", "equipo de selección", "nuestro equipo",
]


def test_iris_respaldo_postulado_no_promete_contacto_humano(monkeypatch):
    import agents

    class FalloLLM:
        def invoke(self, prompt):
            raise Exception("Gemini no disponible")

    monkeypatch.setattr(agents, "llm", FalloLLM())
    estado = {
        "perfil_estructurado": {"habilidades": "Python"},
        "recomendaciones": [
            {**vacante(1), "score": 5, "habilidades_en_comun": ["python"],
             "habilidades": "Python, Docker"}
        ],
        "resultado_postulacion": {"vacante_id": 1, "estado": "postulado"},
        "mensajes": [],
    }
    resultado = agents.agente_iris(estado)
    texto = resultado["mensaje_seguimiento"].lower()
    for frase in _FRASES_PROHIBIDAS:
        assert frase not in texto, f"El respaldo contiene frase prohibida: '{frase}'"
    # Debe mencionar que es simulación
    assert "simulad" in texto


def test_iris_respaldo_no_postulado_no_promete_contacto_humano(monkeypatch):
    import agents

    class FalloLLM:
        def invoke(self, prompt):
            raise Exception("Gemini no disponible")

    monkeypatch.setattr(agents, "llm", FalloLLM())
    estado = {
        "perfil_estructurado": {"habilidades": "Python"},
        "recomendaciones": [
            {**vacante(1), "score": 2, "habilidades_en_comun": ["python"],
             "habilidades": "Python, Docker, Kubernetes"}
        ],
        "resultado_postulacion": None,
        "mensajes": [],
    }
    resultado = agents.agente_iris(estado)
    texto = resultado["mensaje_seguimiento"].lower()
    for frase in _FRASES_PROHIBIDAS:
        assert frase not in texto, f"El respaldo contiene frase prohibida: '{frase}'"


# ---------- Pruebas del endpoint GET /demo/cvs ----------
def test_obtener_cvs_demo_devuelve_hasta_6_cvs():
    from main import obtener_cvs_demo
    cvs = obtener_cvs_demo()
    assert 0 < len(cvs) <= 6
    for item in cvs:
        assert "id" in item
        assert "etiqueta" in item
        assert "cv_texto" in item
        assert "_esperado" not in item
        assert "expectativas" not in item


def test_obtener_cvs_demo_carpeta_inexistente():
    from main import obtener_cvs_demo
    cvs = obtener_cvs_demo(carpeta="esta_carpeta_no_existe_seguro")
    assert cvs == []


def test_endpoint_demo_cvs_requiere_autenticacion():
    from main import app
    cliente = TestClient(app)
    res = cliente.get("/demo/cvs")
    assert res.status_code == 401


def test_endpoint_demo_cvs_con_token():
    from main import app
    token = auth.crear_token(1, "candidato")
    cliente = TestClient(app)
    res = cliente.get("/demo/cvs", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    datos = res.json()
    assert isinstance(datos, list)
    assert len(datos) <= 6
    if len(datos) > 0:
        assert "id" in datos[0]
        assert "etiqueta" in datos[0]
        assert "cv_texto" in datos[0]
        assert "_esperado" not in datos[0]
