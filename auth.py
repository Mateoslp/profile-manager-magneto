"""Autenticación y autorización básicas: hash de contraseñas, JWT, roles
y un limitador simple de llamadas (para proteger el endpoint que usa el LLM)."""
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "Falta JWT_SECRET en el archivo .env (genera uno con: "
        "python -c \"import secrets; print(secrets.token_hex(32))\")"
    )

ALGORITMO = "HS256"
EXPIRA_MINUTOS = 60
ITERACIONES = 200_000
MAX_LLAMADAS_POR_MINUTO = 10

esquema = HTTPBearer()


# ---------- Contraseñas ----------
def hashear_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERACIONES)
    return f"{salt.hex()}${h.hex()}"


def verificar_password(password: str, guardado: str) -> bool:
    try:
        salt_hex, hash_hex = guardado.split("$")
        h = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), ITERACIONES
        )
    except ValueError:
        return False
    return hmac.compare_digest(h.hex(), hash_hex)


# ---------- Tokens ----------
def crear_token(usuario_id: int, rol: str) -> str:
    payload = {
        "sub": str(usuario_id),
        "rol": rol,
        "exp": int(time.time()) + EXPIRA_MINUTOS * 60,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITMO)


def usuario_actual(cred: HTTPAuthorizationCredentials = Depends(esquema)) -> dict:
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[ALGORITMO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    return {"id": int(payload["sub"]), "rol": payload["rol"]}


def solo_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Requiere rol admin")
    return usuario


# ---------- Rate limiting ----------
_historial = defaultdict(deque)


def limitar_llamadas(usuario: dict = Depends(usuario_actual)) -> dict:
    ahora = time.time()
    cola = _historial[usuario["id"]]
    while cola and ahora - cola[0] > 60:
        cola.popleft()
    if len(cola) >= MAX_LLAMADAS_POR_MINUTO:
        raise HTTPException(
            status_code=429, detail="Demasiadas solicitudes, espera un minuto"
        )
    cola.append(ahora)
    return usuario