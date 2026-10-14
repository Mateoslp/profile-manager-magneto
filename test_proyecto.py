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

import auth
from agents import (
    agente_postulacion,
    agente_vacantes,
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