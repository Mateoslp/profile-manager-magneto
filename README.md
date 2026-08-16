# Profile Manager — Backend y Datos

Este es el punto de partida para la parte de **base de datos, API y dataset
de vacantes** del proyecto Profile Manager (Entrega 1).

## ¿Qué hace esto?

- Guarda vacantes de prueba en una base de datos PostgreSQL.
- Expone esas vacantes a través de una API (`GET /vacantes`) para que los
  agentes de IA (y el frontend) puedan consultarlas.

## Decisiones y trade-offs

- **PostgreSQL en la nube (Neon/Supabase) en vez de instalación local:**
  evita configurar Postgres en cada computador del equipo. Cualquiera con
  el connection string puede conectarse desde su máquina.
- **FastAPI en vez de Flask/Django:** menos código para exponer un
  endpoint, y genera documentación interactiva automática en `/docs`,
  útil para que el resto del equipo pruebe la API sin escribir código.
- **Dataset simulado (JSON) en vez de scraping real:** el reto permite
  explícitamente simular vacantes, y evita depender de acceso a fuentes
  externas o APIs reales de Magneto.

## Setup (una sola vez)

1. **Crear la base de datos gratis:**
   - Entra a [neon.tech](https://neon.tech) (o [supabase.com](https://supabase.com))
     y crea una cuenta gratis.
   - Crea un proyecto nuevo. Te va a mostrar un **connection string** que
     empieza con `postgresql://...` — cópialo.
2. **Configurar el proyecto local:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate        # en Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   ```
   Abre `.env` y pega tu connection string en `DATABASE_URL`.
3. **Crear las tablas y cargar el dataset de prueba:**
   ```bash
   python load_data.py
   ```
   Deberías ver: `Se cargaron 20 vacantes de prueba.`

## Correr la API

```bash
uvicorn main:app --reload
```

Abre en el navegador: `http://127.0.0.1:8000/docs` — ahí puedes probar el
endpoint `GET /vacantes` directamente (botón "Try it out").

También puedes probarlo por terminal:
```bash
curl http://127.0.0.1:8000/vacantes
```

## Estructura de archivos

| Archivo | Qué hace |
|---|---|
| `schema.sql` | Define las tablas `vacantes`, `perfiles` y `postulaciones` |
| `seed_vacantes.json` | Dataset de 20 vacantes de prueba |
| `load_data.py` | Crea las tablas y carga el dataset a la base de datos |
| `main.py` | La API (FastAPI) que expone las vacantes |
| `requirements.txt` | Librerías de Python necesarias |
| `.env.example` | Plantilla de configuración (el `.env` real no se sube a GitHub) |

## Próximos pasos (fuera del alcance de Entrega 1)

- Endpoint para crear/consultar `perfiles` (cuando el agente de lectura
  de CV esté listo).
- Endpoint para registrar `postulaciones` (cuando el agente de
  postulación esté listo).
- Filtros en `/vacantes` (por ciudad, modalidad, salario) para que el
  motor de recomendación pueda acotar la búsqueda.
