# LIKAI — Frontend

Interfaz web de LIKAI construida con **Next.js 15** (App Router), **TypeScript** y **Tailwind CSS**.

## Requisitos previos

- **Node.js ≥ 18** — [descargar](https://nodejs.org)
- Backend de LIKAI corriendo en `http://127.0.0.1:8000`

## Instalación y ejecución

```bash
cd frontend
cp .env.local.example .env.local   # ajustá la URL si el backend corre en otro puerto
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend FastAPI | `http://127.0.0.1:8000` |

El archivo `.env.local` **no se sube a git** (está en `.gitignore`). Hay una plantilla en `.env.local.example`.

## Estructura

```
frontend/
├── app/
│   ├── globals.css        # Diseño global: variables, componentes, animaciones
│   ├── layout.tsx         # Root layout con metadata SEO
│   └── page.tsx           # Orquestador de los 4 pasos
├── components/
│   ├── Header.tsx         # Encabezado con logo LIKAI, email y botón Salir
│   ├── StepIndicator.tsx  # Indicador de progreso de 4 pasos
│   ├── LoginPage.tsx      # Paso 1: Login / Registro con tabs
│   ├── CvPage.tsx         # Paso 2: Pegar CV + CVs demo + panel "pensando"
│   ├── ResultadosPage.tsx # Paso 3: Perfil + conversación animada + vacantes + Iris
│   └── KanbanPage.tsx     # Paso 4: Tablero drag & drop con 4 columnas
├── lib/
│   └── api.ts             # Cliente HTTP centralizado con tipos TypeScript
├── .env.local.example
├── .gitignore
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Flujo de la aplicación

```
[1 Login/Registro] → [2 Pegar CV] → [3 Resultados] → [4 Tablero Kanban]
```

- **Sesión**: el token JWT se guarda en `sessionStorage`. Si el backend responde 401 en cualquier llamada, la app limpia la sesión y vuelve al login.
- **Simulación**: se muestra explícitamente en la UI que las postulaciones son simuladas.
- **Sólo datos reales**: la interfaz muestra únicamente lo que devuelve la API, nunca inventa porcentajes ni vacantes.

## Cambios en el backend (Parte A)

| Archivo | Cambio |
|---|---|
| `agents.py` | `agente_vacantes` incluye ahora el campo `empresa` en cada vacante normalizada, que se propaga a las recomendaciones de Inari. |
| `main.py` | `POST /procesar-candidato` guarda `afinidad` en la tabla `postulaciones`. |
| `main.py` | `GET /postulaciones` devuelve `perfil_id, vacante_id, afinidad, empresa, modalidad, salario_min, salario_max` además de los campos originales. |
| `main.py` | `PATCH /postulaciones/{id}/estado` permite al candidato dueño mover su propia postulación (simula la respuesta de la empresa); candidatos ajenos reciben 403. |
| `tests/test_proyecto.py` | 7 pruebas nuevas cubren `empresa` en recomendaciones y los tres escenarios del PATCH. |
| `schema.sql` | Requiere `ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS afinidad INTEGER;` corrido en Neon. |
