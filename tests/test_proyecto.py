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


# ---------- A1: empresa en recomendaciones ----------

def test_agente_vacantes_conserva_empresa():
    """agente_vacantes debe incluir empresa en el dict normalizado."""
    from agents import agente_vacantes

    v = {"id": 1, "titulo": "Vacante 1", "ubicacion": "Medellin",
         "modalidad": "remoto", "salario_min": 3_000_000, "salario_max": 6_000_000}
    estado = {
        "vacantes_disponibles": [
            {**v, "empresa": "Empresa XYZ", "descripcion": "ignorar"},
        ]
    }
    resultado = agente_vacantes(estado)["vacantes_disponibles"][0]
    assert resultado["empresa"] == "Empresa XYZ"
    assert "descripcion" not in resultado


def test_inari_incluye_empresa_en_recomendaciones():
    """Las recomendaciones de Inari deben propagar el campo empresa."""
    from agents import agente_inari

    estado = {
        "perfil_estructurado": {"ubicacion": "Medellin", "modalidad_preferida": "remoto"},
        "vacantes_disponibles": [
            {
                "id": 1, "titulo": "Dev Backend", "empresa": "TechCorp S.A.",
                "ubicacion": "Medellin", "modalidad": "remoto",
                "salario_min": 4_000_000, "salario_max": 6_000_000,
                "habilidades": "Python",
            }
        ],
        "mensajes": [],
    }
    resultado = agente_inari(estado)
    recs = resultado["recomendaciones"]
    assert len(recs) >= 1
    assert recs[0]["empresa"] == "TechCorp S.A."


# ---------- A3: PATCH /postulaciones/{id}/estado ----------

def _patch_cliente_y_mock(monkeypatch, postulacion_usuario_id,
                           rol_peticionario, usuario_id_peticionario):
    """Configura TestClient con conexion() parcheada para no tocar la BD."""
    import main as main_mod
    from contextlib import contextmanager

    @contextmanager
    def fake_conexion():
        class FakeCursor:
            def __init__(self):
                self._rows = []

            def execute(self, sql, params=None):
                sql_lower = sql.lower().strip()
                if sql_lower.startswith("select"):
                    self._rows = [{"id": 1, "estado": "postulado",
                                   "usuario_id": postulacion_usuario_id}]
                elif sql_lower.startswith("update"):
                    estado_nuevo = params[0] if params else "postulado"
                    self._rows = [{"id": 1, "estado": estado_nuevo}]
                else:
                    self._rows = []

            def fetchone(self):
                return self._rows[0] if self._rows else None

        class FakeConn:
            def cursor(self): return FakeCursor()
            def commit(self): pass
            def rollback(self): pass
            def close(self): pass

        yield FakeConn()

    monkeypatch.setattr(main_mod, "conexion", fake_conexion)
    token = auth.crear_token(usuario_id_peticionario, rol_peticionario)
    client = TestClient(main_mod.app)
    return client, token


def test_patch_estado_candidato_dueno_puede_mover(monkeypatch):
    """El candidato dueno de la postulacion puede cambiar su estado."""
    client, token = _patch_cliente_y_mock(
        monkeypatch,
        postulacion_usuario_id=42,
        rol_peticionario="candidato",
        usuario_id_peticionario=42,
    )
    res = client.patch(
        "/postulaciones/1/estado",
        json={"estado": "en_revision"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "en_revision"


def test_patch_estado_candidato_ajeno_da_403(monkeypatch):
    """Un candidato que intenta mover la postulacion de otro recibe 403."""
    client, token = _patch_cliente_y_mock(
        monkeypatch,
        postulacion_usuario_id=99,
        rol_peticionario="candidato",
        usuario_id_peticionario=42,
    )
    res = client.patch(
        "/postulaciones/1/estado",
        json={"estado": "entrevista"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_patch_estado_admin_puede_mover_cualquiera(monkeypatch):
    """El admin puede mover la postulacion de cualquier candidato."""
    client, token = _patch_cliente_y_mock(
        monkeypatch,
        postulacion_usuario_id=99,
        rol_peticionario="admin",
        usuario_id_peticionario=1,
    )
    res = client.patch(
        "/postulaciones/1/estado",
        json={"estado": "descartado"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "descartado"


def test_patch_estado_invalido_da_422():
    """Un estado no reconocido es rechazado por la validacion de Pydantic (422)."""
    from main import app as main_app
    token = auth.crear_token(1, "admin")
    client = TestClient(main_app)
    res = client.patch(
        "/postulaciones/1/estado",
        json={"estado": "rechazado"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_patch_estado_requiere_autenticacion():
    """Sin token, el endpoint devuelve 401 o 403."""
    from main import app as main_app
    client = TestClient(main_app)
    res = client.patch("/postulaciones/1/estado", json={"estado": "entrevista"})
    assert res.status_code in (401, 403)


# ---------- Paquete C: Unicidad por (usuario_id, email) ----------

def _mock_procesar_candidato_db(monkeypatch):
    """Mock de app_grafo y conexion() para probar la insercion/actualizacion de perfiles."""
    import main as main_mod
    from contextlib import contextmanager

    class FakeGrafo:
        def invoke(self, estado):
            return {
                "perfil_estructurado": {
                    "nombre": "Candidato Demo",
                    "email": "ejemplo@demo.com",
                    "telefono": "3001234567",
                    "ubicacion": "Medellin",
                    "modalidad_preferida": "remoto",
                    "aspiracion_salarial": 5_000_000,
                    "habilidades": "Python",
                },
                "resultado_postulacion": None,
                "mensajes": [],
                "recomendaciones": [],
            }

    monkeypatch.setattr(main_mod, "app_grafo", FakeGrafo())

    perfiles_guardados = {}

    @contextmanager
    def fake_conexion():
        class FakeCursor:
            def __init__(self):
                self._last_id = None

            def execute(self, sql, params=None):
                sql_lower = sql.lower()
                if "insert into perfiles" in sql_lower:
                    assert "on conflict (usuario_id, email)" in sql_lower
                    uid = params["usuario_id"]
                    mail = params["email"]
                    clave = (uid, mail)
                    if clave not in perfiles_guardados:
                        perfiles_guardados[clave] = len(perfiles_guardados) + 1
                    self._last_id = perfiles_guardados[clave]

            def fetchone(self):
                if self._last_id is not None:
                    return {"id": self._last_id}
                return None

            def fetchall(self):
                return []

        class FakeConn:
            def cursor(self): return FakeCursor()
            def commit(self): pass
            def rollback(self): pass
            def close(self): pass

        yield FakeConn()

    monkeypatch.setattr(main_mod, "conexion", fake_conexion)
    return TestClient(main_mod.app), perfiles_guardados


def test_dos_usuarios_distintos_con_mismo_email_no_chocan(monkeypatch):
    """Dos usuarios diferentes pueden procesar el mismo email sin recibir 409."""
    client, perfiles_guardados = _mock_procesar_candidato_db(monkeypatch)
    token_u1 = auth.crear_token(1, "candidato")
    token_u2 = auth.crear_token(2, "candidato")

    cv_valido = "Ingeniero de Sistemas con experiencia en Python y bases de datos SQL."
    res1 = client.post(
        "/procesar-candidato",
        json={"cv_texto": cv_valido, "expectativas": {}},
        headers={"Authorization": f"Bearer {token_u1}"},
    )
    assert res1.status_code == 200
    id1 = res1.json()["perfil_id"]

    res2 = client.post(
        "/procesar-candidato",
        json={"cv_texto": cv_valido, "expectativas": {}},
        headers={"Authorization": f"Bearer {token_u2}"},
    )
    assert res2.status_code == 200
    id2 = res2.json()["perfil_id"]

    assert id1 != id2
    assert (1, "ejemplo@demo.com") in perfiles_guardados
    assert (2, "ejemplo@demo.com") in perfiles_guardados


def test_mismo_usuario_actualiza_su_perfil_en_reintento(monkeypatch):
    """El mismo usuario que reenvia su CV actualiza su registro y recibe el mismo perfil_id."""
    client, perfiles_guardados = _mock_procesar_candidato_db(monkeypatch)
    token_u1 = auth.crear_token(10, "candidato")

    cv_v1 = "Ingeniero de Sistemas con experiencia en Python y desarrollo backend."
    cv_v2 = "Ingeniero de Sistemas con experiencia en Python, FastAPI y PostgreSQL."

    res1 = client.post(
        "/procesar-candidato",
        json={"cv_texto": cv_v1, "expectativas": {}},
        headers={"Authorization": f"Bearer {token_u1}"},
    )
    assert res1.status_code == 200
    id1 = res1.json()["perfil_id"]

    res2 = client.post(
        "/procesar-candidato",
        json={"cv_texto": cv_v2, "expectativas": {}},
        headers={"Authorization": f"Bearer {token_u1}"},
    )
    assert res2.status_code == 200
    id2 = res2.json()["perfil_id"]

    assert id1 == id2
    assert len(perfiles_guardados) == 1


def test_usuario_no_puede_consultar_bitacora_de_perfil_ajeno(monkeypatch):
    """Un usuario que intenta consultar la bitacora de otro recibe 403 Forbidden."""
    import main as main_mod
    from contextlib import contextmanager

    perfil_dueno_id = 99
    usuario_peticionario_id = 42

    @contextmanager
    def fake_conexion():
        class FakeCursor:
            def __init__(self):
                self._rows = []

            def execute(self, sql, params=None):
                sql_lower = sql.lower()
                if "from perfiles" in sql_lower:
                    # SELECT id FROM perfiles WHERE id = %s AND usuario_id = %s;
                    pid, uid = params
                    if uid == perfil_dueno_id:
                        self._rows = [{"id": pid}]
                    else:
                        self._rows = []
                else:
                    self._rows = []

            def fetchone(self):
                return self._rows[0] if self._rows else None

            def fetchall(self):
                return self._rows

        class FakeConn:
            def cursor(self): return FakeCursor()
            def commit(self): pass
            def rollback(self): pass
            def close(self): pass

        yield FakeConn()

    monkeypatch.setattr(main_mod, "conexion", fake_conexion)
    token = auth.crear_token(usuario_peticionario_id, "candidato")
    client = TestClient(main_mod.app)

    res = client.get("/bitacora/1", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "acceso" in res.json()["detail"].lower()


# ---------- Paquete D: Respaldo por reglas para Lexi ----------

class FalloGeminiLLM:
    """Simula una caída de Gemini lanzando una excepción."""
    def invoke(self, prompt):
        raise Exception("Gemini no disponible / cuota agotada")


def test_lexi_respaldo_formato_rigido_cuando_gemini_falla(monkeypatch):
    """Si Gemini falla pero el texto tiene formato rígido, Lexi extrae los datos por reglas."""
    import agents
    monkeypatch.setattr(agents, "llm", FalloGeminiLLM())

    cv_rigido = (
        "Nombre: Laura Martínez\n"
        "Email: laura.martinez@test.com\n"
        "Teléfono: 3009876543\n"
        "Ubicación: Medellín\n"
        "Modalidad preferida: remoto\n"
        "Experiencia (años): 3\n"
        "Educación: Ingeniera de Software\n"
        "Disponibilidad: inmediata\n"
        "Habilidades: Python, SQL, Docker\n"
        "Aspiración salarial: 4500000 COP"
    )

    estado = {"cv_texto": cv_rigido, "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)

    perfil = resultado["perfil_estructurado"]
    assert perfil is not None
    assert perfil["nombre"] == "Laura Martínez"
    assert perfil["email"] == "laura.martinez@test.com"
    assert perfil["telefono"] == "3009876543"
    assert perfil["ubicacion"] == "Medellín"
    assert perfil["modalidad_preferida"] == "remoto"
    assert perfil["experiencia_anios"] == 3
    assert perfil["educacion"] == "Ingeniera de Software"
    assert perfil["disponibilidad"] == "inmediata"
    assert perfil["habilidades"] == "Python, SQL, Docker"
    assert perfil["aspiracion_salarial"] == 4_500_000

    # Verifica que el mensaje emitido por Lexi indica origen respaldo
    msg_info = [m for m in resultado["mensajes"] if m["agente"] == "Lexi" and m["tipo"] == "info"][0]
    assert msg_info["datos"]["origen"] == "respaldo"


def test_lexi_falla_con_texto_libre_si_gemini_no_responde(monkeypatch):
    """Si Gemini falla y el texto es libre sin formato, Lexi propaga el error (502)."""
    import agents
    monkeypatch.setattr(agents, "llm", FalloGeminiLLM())

    cv_libre = (
        "Ingeniero de sistemas con 5 años de experiencia liderando proyectos web. "
        "Apasionado por la tecnología, he trabajado en startups y empresas grandes. "
        "Manejo Python, JavaScript y bases de datos relacionales y no relacionales."
    )

    estado = {"cv_texto": cv_libre, "expectativas": {}, "mensajes": []}
    with pytest.raises(Exception) as exc:
        agents.agente_lexi(estado)
    assert "Gemini no disponible" in str(exc.value)


def test_lexi_respaldo_primer_empleo_experiencia_cero(monkeypatch):
    """En la rama de primer empleo, experiencia_anios queda en 0 sin inventar experiencia."""
    import agents
    monkeypatch.setattr(agents, "llm", FalloGeminiLLM())

    cv_primer_empleo = (
        "Nombre: Mateo Gómez\n"
        "Email: mateo@test.com\n"
        "Teléfono: 3123456789\n"
        "Ubicación: Bogotá\n"
        "Modalidad preferida: remoto\n"
        "Experiencia (años): 0\n"
        "Situación laboral: En búsqueda de primer empleo\n"
        "Estudios en curso o recientes: 8vo semestre Ingeniería de Sistemas\n"
        "Proyectos destacados: Bot de Discord y API con FastAPI\n"
        "Educación: Estudiante universitario\n"
        "Disponibilidad: inmediata\n"
        "Habilidades: Python, Git, SQL\n"
        "Aspiración salarial: 2000000 COP"
    )

    estado = {"cv_texto": cv_primer_empleo, "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    perfil = resultado["perfil_estructurado"]

    assert perfil["experiencia_anios"] == 0
    assert perfil["nombre"] == "Mateo Gómez"
    assert "primer empleo" in cv_primer_empleo.lower()


def test_lexi_respaldo_salario_cop_a_entero(monkeypatch):
    """El salario en formato '3500000 COP' queda parseado como entero 3500000."""
    import agents
    monkeypatch.setattr(agents, "llm", FalloGeminiLLM())

    cv_salario = (
        "Nombre: Sofía Morales\n"
        "Email: sofia@test.com\n"
        "Teléfono: 3105556677\n"
        "Ubicación: Cali\n"
        "Modalidad preferida: presencial\n"
        "Experiencia (años): 1\n"
        "Educación: Tecnóloga en Sistemas\n"
        "Disponibilidad: inmediata\n"
        "Habilidades: SQL, Excel avanzado\n"
        "Aspiración salarial: 3500000 COP"
    )

    estado = {"cv_texto": cv_salario, "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    perfil = resultado["perfil_estructurado"]

    assert perfil["aspiracion_salarial"] == 3_500_000
    assert isinstance(perfil["aspiracion_salarial"], int)


def test_lexi_respaldo_correo_extraido_coincide(monkeypatch):
    """El correo extraído por el lector de reglas coincide con el valor de la línea Email."""
    import agents
    monkeypatch.setattr(agents, "llm", FalloGeminiLLM())

    correo_esperado = "candidato.verificado@magneto.com"
    cv_correo = (
        "Nombre: David Restrepo\n"
        f"Email: {correo_esperado}\n"
        "Teléfono: 3012223344\n"
        "Ubicación: Barranquilla\n"
        "Modalidad preferida: hibrido\n"
        "Experiencia (años): 2\n"
        "Educación: Profesional\n"
        "Disponibilidad: en 15 días\n"
        "Habilidades: React, TypeScript, APIs REST\n"
        "Aspiración salarial: 4000000 COP"
    )

    estado = {"cv_texto": cv_correo, "expectativas": {}, "mensajes": []}
    resultado = agents.agente_lexi(estado)
    perfil = resultado["perfil_estructurado"]

    assert perfil["email"] == correo_esperado


# ---------- Paquete F: Recálculo de recomendaciones con pesos personalizados ----------

def _mock_db_recalcular(monkeypatch, perfiles=None, vacantes=None):
    from contextlib import contextmanager
    import main as main_mod

    @contextmanager
    def fake_conexion():
        class FakeCursor:
            def __init__(self):
                self._rows = []

            def execute(self, sql, params=None):
                sql_lower = sql.lower()
                if "from perfiles" in sql_lower:
                    res = list(perfiles or [])
                    if params:
                        if len(params) == 2:
                            pid, uid = params
                            res = [p for p in res if p.get("id") == pid and p.get("usuario_id") == uid]
                        elif len(params) == 1:
                            param = params[0]
                            if "usuario_id = %s" in sql_lower:
                                res = [p for p in res if p.get("usuario_id") == param]
                                res.sort(key=lambda p: p.get("id", 0), reverse=True)
                            else:
                                res = [p for p in res if p.get("id") == param]
                    self._rows = res
                elif "from vacantes" in sql_lower:
                    self._rows = list(vacantes or [])
                else:
                    self._rows = []

            def fetchone(self):
                return self._rows[0] if self._rows else None

            def fetchall(self):
                return list(self._rows)

        class FakeConn:
            def cursor(self): return FakeCursor()
            def commit(self): pass
            def rollback(self): pass
            def close(self): pass

        yield FakeConn()

    monkeypatch.setattr(main_mod, "conexion", fake_conexion)
    return TestClient(main_mod.app)


def test_recalcular_pesos_por_defecto_mismos_puntajes_que_flujo_actual(monkeypatch):
    """Con pesos por defecto (2,2,1,2), el scoring da exactamente el mismo resultado."""
    perfil = {
        "id": 1,
        "usuario_id": 10,
        "nombre": "Ana Pérez",
        "email": "ana@test.com",
        "telefono": "3001234567",
        "ubicacion": "Medellín",
        "modalidad_preferida": "remoto",
        "aspiracion_salarial": 4_000_000,
        "experiencia_anios": 3,
        "educacion": "Ingeniera",
        "disponibilidad": "inmediata",
        "habilidades": "Python, Docker",
    }
    vacantes = [
        {
            "id": 101,
            "titulo": "Dev Python",
            "empresa": "Tech Co",
            "ubicacion": "Medellín",
            "modalidad": "remoto",
            "salario_min": 3_000_000,
            "salario_max": 5_000_000,
            "habilidades": "Python, Docker, SQL",
        }
    ]
    client = _mock_db_recalcular(monkeypatch, perfiles=[perfil], vacantes=vacantes)
    token = auth.crear_token(10, "candidato")

    res = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert res.status_code == 200
    datos = res.json()
    assert datos["perfil_id"] == 1
    assert datos["pesos"] == {
        "peso_ubicacion": 2,
        "peso_modalidad": 2,
        "peso_salario": 1,
        "peso_habilidad": 2,
    }
    rec = datos["recomendaciones"][0]
    # Ubicación (2) + Modalidad (2) + Salario (1) + Habilidades (2 * 2 = 4) = 9
    assert rec["score"] == 9
    assert rec["afinidad"] == round(9 / 11 * 100)
    assert rec["habilidades_en_comun"] == ["docker", "python"]
    assert rec["habilidades_faltantes"] == ["sql"]


def test_recalcular_subir_peso_salario_cambia_orden(monkeypatch):
    """Subir el peso del salario prioriza la vacante de mejor sueldo sobre la de mejor ubicación/modalidad."""
    perfil = {
        "id": 1,
        "usuario_id": 10,
        "nombre": "Carlos Gómez",
        "email": "carlos@test.com",
        "telefono": "3000000000",
        "ubicacion": "Medellín",
        "modalidad_preferida": "remoto",
        "aspiracion_salarial": 5_000_000,
        "experiencia_anios": 2,
        "educacion": "Profesional",
        "disponibilidad": "inmediata",
        "habilidades": "",
    }
    vacante_cercana = {
        "id": 1,
        "titulo": "Vacante Cercana",
        "empresa": "A",
        "ubicacion": "Medellín",
        "modalidad": "remoto",
        "salario_min": 2_000_000,
        "salario_max": 4_000_000,
        "habilidades": "",
    }
    vacante_bien_paga = {
        "id": 2,
        "titulo": "Vacante Mejor Paga",
        "empresa": "B",
        "ubicacion": "Bogotá",
        "modalidad": "presencial",
        "salario_min": 5_000_000,
        "salario_max": 7_000_000,
        "habilidades": "",
    }
    client = _mock_db_recalcular(monkeypatch, perfiles=[perfil], vacantes=[vacante_cercana, vacante_bien_paga])
    token = auth.crear_token(10, "candidato")

    res_defecto = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={"peso_ubicacion": 2, "peso_modalidad": 2, "peso_salario": 1, "peso_habilidad": 0},
    )
    assert res_defecto.status_code == 200
    ids_defecto = [r["id"] for r in res_defecto.json()["recomendaciones"]]
    assert ids_defecto == [1, 2]

    res_salario = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={"peso_ubicacion": 1, "peso_modalidad": 1, "peso_salario": 5, "peso_habilidad": 0},
    )
    assert res_salario.status_code == 200
    ids_salario = [r["id"] for r in res_salario.json()["recomendaciones"]]
    assert ids_salario == [2, 1]
    assert ids_salario != ids_defecto


def test_recalcular_todos_los_pesos_en_cero_da_422(monkeypatch):
    """Poner todos los pesos en 0 debe ser rechazado con 422 Unprocessable Entity."""
    client = _mock_db_recalcular(monkeypatch, perfiles=[], vacantes=[])
    token = auth.crear_token(10, "candidato")

    res = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={"peso_ubicacion": 0, "peso_modalidad": 0, "peso_salario": 0, "peso_habilidad": 0},
    )
    assert res.status_code == 422


def test_recalcular_peso_mayor_a_cinco_da_422(monkeypatch):
    """Un peso mayor que 5 debe ser rechazado con 422 Unprocessable Entity."""
    client = _mock_db_recalcular(monkeypatch, perfiles=[], vacantes=[])
    token = auth.crear_token(10, "candidato")

    res = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={"peso_salario": 6},
    )
    assert res.status_code == 422


def test_recalcular_perfil_id_ajeno_da_403(monkeypatch):
    """Solicitar un perfil_id que no pertenece al usuario autenticado da 403 Forbidden."""
    perfil_ajeno = {
        "id": 99,
        "usuario_id": 20,
        "nombre": "Otro Usuario",
    }
    client = _mock_db_recalcular(monkeypatch, perfiles=[perfil_ajeno], vacantes=[])
    token = auth.crear_token(10, "candidato")

    res = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={"perfil_id": 99},
    )
    assert res.status_code == 403
    assert "acceso" in res.json()["detail"].lower()


def test_recalcular_usuario_sin_perfiles_da_404(monkeypatch):
    """Si el usuario no tiene ningún perfil registrado y no pasa perfil_id, da 404."""
    client = _mock_db_recalcular(monkeypatch, perfiles=[], vacantes=[])
    token = auth.crear_token(10, "candidato")

    res = client.post(
        "/perfil/recalcular-recomendaciones",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert res.status_code == 404
    assert "perfil" in res.json()["detail"].lower()


def test_recalcular_sin_token_da_401():
    """Llamar al endpoint sin encabezado de autenticación responde 401."""
    import main as main_mod
    client = TestClient(main_mod.app)
    res = client.post("/perfil/recalcular-recomendaciones", json={})
    assert res.status_code == 401

