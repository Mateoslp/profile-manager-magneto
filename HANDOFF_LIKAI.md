# HANDOFF — LIKAI (Profile Manager para Magneto)

Documento de traspaso para continuar el proyecto con un asistente de IA (Antigravity). Está escrito para dos lectores: **la persona que recibe el trabajo** y **la IA que va a usar**. Si eres la IA, lee todo antes de proponer cambios y no asumas nada que no esté aquí o que no puedas comprobar en el repositorio.

Estado descrito: fin de octubre de 2026, rama `avance-front`. Todo lo que dice "según el último reporte" viene de lo que reportó la herramienta en la sesión anterior y **debes verificarlo corriendo los comandos de la sección 4**.

---

## 0. Antes de entregar este archivo (lista para quien entrega)

- [ ] Hacer `git push` de la rama `avance-front` con todo lo hecho (incluido el Hito 1 del escenario) y confirmar con `git status` que **no aparece `.env`**.
- [ ] Confirmar que `schema.sql` del repositorio incluye las tablas y columnas de la sección 5 (incluida `afinidad`).
- [ ] Pasar las claves por un canal privado, **nunca** dentro de este archivo ni en el repositorio (ver sección 4.3).
- [ ] Adjuntar, además de este archivo: `likai_ideas_interactividad.xlsx` (plan de ideas por hitos), el PDF del reto de Magneto y el documento de la Entrega 1.
- [ ] Decidir qué paquetes de trabajo se entregan (ver recomendación en la sección 7).

---

## 1. Qué es el proyecto

**LIKAI** es un asistente multi-agente de empleo, desarrollado para el reto "Profile Manager" de Magneto (curso de Ingeniería de Software, EAFIT). El candidato entrega su hoja de vida y el sistema la estructura, detecta lo que falta, recomienda vacantes con un puntaje explicable, simula la postulación y da un próximo paso.

- Repositorio: `github.com/Mateoslp/profile-manager-magneto`
- Rama de trabajo actual: `avance-front` (la rama `main` está atrasada y no se toca hasta probar todo).
- Enfoque técnico elegido del reto: **"Idea 2: arquitectura agéntica con LangGraph"**.

### Los cuatro agentes (nombres oficiales; usarlos siempre en código, logs, API y pantalla)

| Agente | Rol | Cómo trabaja |
|---|---|---|
| **Lexi** | Perfil | Estructura el CV con Gemini y detecta campos vacíos |
| **Inari** | Vacantes y match | Normaliza vacantes y puntúa por reglas (sin IA) |
| **Kenti** | Postulación | Simula el envío y guarda la postulación |
| **Iris** | Seguimiento | Da el próximo paso y feedback con Gemini, con respaldo por reglas |

### Qué busca la evaluación (decisión de producto)

En la revisión del Sprint 2, a los evaluadores les entusiasmó **ver cómo interactúan los agentes entre sí** y lo consideran lo más vendible. La prioridad actual es que el sistema sea **lo más interactivo y visual posible**, que el usuario escriba lo mínimo y que cada agente le diga qué hacer. Referencia de experiencia: el registro de Magneto empleos (te sugiere campos y te hace preguntas).

Restricción: solo hay **Gemini gratuito**; no hay presupuesto para un modelo de pago por ahora.

---

## 2. Principios del producto (obligatorios)

1. **Honestidad de los datos.** La interfaz muestra solo lo que devuelve la API. Nunca se inventan mensajes, porcentajes, nombres ni vacantes. Lo simulado se rotula como simulación (por ejemplo, la postulación).
2. **IA solo donde es indispensable.** Se usa Gemini para entender lenguaje libre y escribir texto personalizado. Todo lo demás (puntajes, rutas, estados, formularios) va con reglas. Razón: estabilidad y cuota; durante las pruebas hubo errores 503 y 504 de Gemini.
3. **Todo uso de Gemini tiene respaldo por reglas.** Si falla, el flujo no se cae.
4. **Enlaces generados por código, no por IA.** Gemini inventa direcciones que no existen.
5. **Texto de la interfaz en español neutro con tuteo** (tienes, usa, pega). Nada de voseo.
6. **Cada cosa nueva debe quedar real y probada antes de mencionarla en una presentación.**

---

## 3. Reglas para la IA (pegar al inicio de cada conversación nueva)

Antigravity permite guardar reglas del proyecto (carpeta `.agents/rules/`); si no las encuentras en la interfaz, pega este bloque al inicio de cada conversación.

```
CONTEXTO Y REGLAS
Proyecto LIKAI (Profile Manager para Magneto). Backend Python/FastAPI con agentes en LangGraph (psycopg2 sin ORM, PostgreSQL en Neon, Gemini vía langchain-google-genai). Frontend en frontend/ (Next.js 15 App Router, TypeScript, Tailwind). Agentes: Lexi (perfil), Inari (vacantes y match), Kenti (postulación), Iris (seguimiento).

Reglas:
- Nunca leer, imprimir ni modificar .env. Nunca subir secretos.
- No ejecutar git commit ni git push; lo hace el usuario.
- Antes de cambiar el esquema SQL, mostrar el SQL y esperar confirmación; el usuario lo corre en Neon.
- SQL parametrizado (%s). Entradas validadas con Pydantic.
- Mantener las capas: main.py (rutas), agents.py (agentes), auth.py (seguridad), perfil_utils.py (limpieza).
- Textos de interfaz y mensajes en español neutro con tuteo. Comentarios solo cuando explican un porqué.
- Cada cambio de comportamiento lleva su prueba. Al terminar: correr pytest y, si se tocó el front, npm run build, y mostrar el resultado completo.
- Cambios pequeños y enfocados; no refactorizar lo que no se pidió. No agregar dependencias sin preguntar.
- No inventar librerías, métricas ni datos. Si algo no se puede verificar, decirlo.
- Primero leer los archivos relevantes y mostrar un plan; no escribir código hasta que el usuario lo apruebe.
- Comandos con el Python del proyecto, sin depender de activar el entorno:
  .venv\Scripts\python.exe -m pytest -v
  .venv\Scripts\python.exe demo_agentes.py
  (la API la levanta el usuario)
```

---

## 4. Cómo arrancar y verificar el estado

Sistema: Windows, PowerShell, Antigravity (basado en VS Code). Node.js 24 y npm 11 instalados.

### 4.1 Preparación (una sola vez)

```
git clone https://github.com/Mateoslp/profile-manager-magneto.git
cd profile-manager-magneto
git switch avance-front
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
cd frontend
npm install
```

Si `pip` o `npm` fallan por políticas de Windows, llama los módulos así: `python -m pip ...`.

### 4.2 Arranque diario (dos terminales a la vez)

- **Terminal 1, backend** (desde la raíz del proyecto):
  `.venv\Scripts\python.exe -m uvicorn main:app --reload`
  Espera `Application startup complete`. Esa terminal queda ocupada: no se usa para otros comandos.
- **Terminal 2, front:** `cd frontend` y luego `npm run dev`.
- Abrir `http://localhost:3000` (app) y `http://127.0.0.1:8000/docs` (Swagger de la API).

### 4.3 Secretos (no están en el repositorio)

Cada persona crea su propio archivo `.env` en la raíz (está en `.gitignore`) con:

```
DATABASE_URL=...        # cadena de conexión de Neon, pasada por canal privado
GOOGLE_API_KEY=...      # cada quien crea la suya gratis en aistudio.google.com/apikey
JWT_SECRET=...          # python -c "import secrets; print(secrets.token_hex(32))"
```

Y en `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.

**Base de datos compartida:** si ambos usan la misma base de Neon, los cambios de esquema se pisan. Recomendación: crear en Neon una **rama de base de datos** (menú Branches) para quien recibe el trabajo, o coordinar que **todo cambio de esquema pase por quien entrega** (ver 6.2).

### 4.4 Verificación del estado actual

```
.venv\Scripts\python.exe -m pytest -v        # según el último reporte: 54 pruebas pasando
cd frontend
npm run build                                 # debe terminar sin "Failed to compile"
```

Y revisar: `git log --oneline -10` y `git status`.

---

## 5. Estado actual del código

### 5.1 Backend (raíz del repositorio)

| Archivo | Qué contiene |
|---|---|
| `main.py` | API FastAPI y conexión con transacciones (`conexion()`) |
| `agents.py` | Grafo LangGraph con los cuatro agentes, mensajes y enrutamiento |
| `auth.py` | JWT (vence a los 60 min), roles `candidato` y `admin`, contraseñas con PBKDF2, límite de 10 llamadas por minuto |
| `perfil_utils.py` | `limpiar_perfil` y `_entero`: normaliza lo que devuelve Gemini (listas, salarios como texto, modalidades, largos) |
| `demo_agentes.py` | Demo en consola: muestra qué hace cada agente y sus mensajes |
| `generar_cvs.py` | Genera 100 CVs de prueba en `casos_prueba/` (completo, sin_salario, sin_contacto, minimo) y los procesa contra la API |
| `tests/test_proyecto.py` | Pruebas unitarias (sin internet ni base de datos) |
| `schema.sql` | Esquema de la base de datos |

**Endpoints**

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `POST /auth/registro`, `POST /auth/login` | Público | Alta y token |
| `GET /vacantes`, `GET /vacantes/{id}` | Público | Vacantes (20 de ejemplo) |
| `POST /procesar-candidato` | Token, límite 10/min | Corre los cuatro agentes y guarda perfil, postulación y bitácora. Devuelve perfil, recomendaciones, mensajes y mensaje de seguimiento |
| `GET /postulaciones` | Token | Candidato ve las suyas; admin ve todas |
| `PATCH /postulaciones/{id}/estado` | Admin o candidato dueño | Cambia el estado: `postulado`, `en_revision`, `entrevista`, `descartado` |
| `GET /bitacora/{perfil_id}` | Token | Mensajes guardados de los agentes |
| `GET /demo/cvs` | Token | Hasta 6 CVs de ejemplo para el botón "Cargar CV de ejemplo" |

**Flujo de los agentes** (`agents.py`)

```
Lexi → Inari ──(puntaje ≥ UMBRAL_POSTULACION = 4)──► Kenti → Iris → fin
              └─(puntaje < 4)────────────────────────────► Iris → fin
```

- Pesos de Inari: ubicación 2, modalidad 2, salario 1, y 2 por cada habilidad en común (máximo 3). **Puntaje máximo 11.** `afinidad` = round(puntaje / 11 × 100). Cada recomendación incluye `habilidades_en_comun` y `habilidades_faltantes`.
- Cada agente agrega mensajes al estado: `{agente, para, tipo (info|alerta|decision), texto, datos}`. Los de Lexi, Inari y Kenti salen de reglas; solo Iris llama a Gemini y guarda en `datos` si el texto vino de `"gemini"` o de `"respaldo"`.
- Cuando el puntaje no alcanza, la decisión de no postular la emite **Inari** (Kenti no se ejecuta). Los destinos de los mensajes pueden ser un agente o `candidato` (en minúscula); **revisa `agents.py` para ver los valores reales**.
- Modelo en `agents.py`: `gemini-3.5-flash-lite` con `timeout` y reintentos configurados. Se cambió desde `gemini-3.6-flash` por errores 504.

**Base de datos (Neon, PostgreSQL)**

| Tabla | Notas |
|---|---|
| `usuarios` | email único, `password_hash`, `rol` (`candidato` o `admin`) |
| `perfiles` | `usuario_id`, **`email` con restricción UNIQUE global**, datos del candidato, `cv_texto` |
| `vacantes` | 20 vacantes de ejemplo, con `habilidades` como texto |
| `postulaciones` | `perfil_id`, `vacante_id`, `estado` (CHECK con 4 valores), `siguiente_paso`, `afinidad` |
| `bitacora_ia` | mensajes de los agentes: `perfil_id`, `postulacion_id`, `agente`, `para`, `tipo`, `texto`, `datos` JSONB |

### 5.2 Frontend (`frontend/`)

Next.js 15.5, React 19, TypeScript, Tailwind. Compiló correctamente a fines de octubre.

| Archivo | Función |
|---|---|
| `app/page.tsx` | Orquesta los 4 pasos y maneja el 401 global |
| `components/LoginPage.tsx` | Login y registro |
| `components/CvPage.tsx` | Pegar CV, botones de CV de ejemplo, panel de espera, manejo del 502 |
| `components/ResultadosPage.tsx` | Perfil, conversación de los agentes (lista animada), vacantes con afinidad, tarjeta de Iris |
| `components/KanbanPage.tsx` | Tablero con arrastre y botones, llama al PATCH |
| `lib/api.ts` | Cliente HTTP y tipos TypeScript |
| `components/escenario/AgenteSvg.tsx` | **Hito 1 hecho:** cuatro personajes SVG con estados reposo, pensando, hablando y alerta |
| `components/escenario/datosDemo.ts`, `app/dev/escenario/page.tsx` | Ruta de desarrollo `/dev/escenario` con mensajes de ejemplo |

Nota: según el último reporte, el Hito 1 quedó con 4 archivos y 729 líneas nuevas, pero la sesión se cortó por cuota antes de confirmar que estuvieran aplicados todos los ajustes (ver 7, paquete A).

### 5.3 Pendientes y problemas conocidos

| Tema | Detalle |
|---|---|
| **Perfil de otro usuario** | `perfiles.email` es único para toda la base. Si un CV de ejemplo trae un correo que pertenece a otro usuario, `/procesar-candidato` responde 409 "pertenece a otro usuario". Es un problema de diseño, no un error aislado (paquete C) |
| **23 de 100 CVs de prueba sin procesar** | Fallaron por un bug ya corregido (`import re` faltante). La función `--reintentar` de `generar_cvs.py` no se aplicó; hoy van 77 de 100 |
| **Inari no es semántico** | Compara por reglas y por coincidencia exacta de palabras ("PostgreSQL" no coincide con "SQL"). Las diapositivas decían "match semántico" |
| **El CV entra como texto** | La Entrega 1 prometía subir PDF |
| **Gemini inestable** | Errores 503 (alta demanda) y 504 (tiempo agotado). Cada llamada necesita respaldo |
| **Límite de llamadas en memoria** | Se reinicia al reiniciar el servidor |
| **Vulnerabilidades de `npm audit`** | 2 reportadas en el front; no usar `npm audit fix --force` |
| **Sin pruebas de integración ni CI** | Solo hay pruebas unitarias |

---

## 6. Cómo trabajar (protocolo)

### 6.1 Ramas y git

- Crear una rama propia desde `avance-front`: `git switch avance-front`, `git pull`, `git switch -c feature/<nombre-corto>`.
- **No hacer push a `main` ni a `avance-front`.** Subir solo la rama propia: `git push -u origin feature/<nombre-corto>`.
- Antes de cada commit: `git status` y confirmar que no aparecen `.env`, `.env.local`, `node_modules` ni `.next`.
- Commits pequeños, uno por hito terminado.

### 6.2 Quién toca qué (para no pisarse)

- **Solo uno edita a la vez `agents.py`, `main.py` y `schema.sql`.** Si tu paquete los toca, avisa a quien entrega antes de empezar.
- **Cualquier cambio de esquema SQL** (tablas, columnas, restricciones) se muestra primero a quien entrega y se registra tal cual en `schema.sql` y en el reporte de vuelta.
- Los paquetes que solo tocan `frontend/` pueden avanzar en paralelo sin riesgo de choque.

### 6.3 Ritmo de trabajo con la IA

1. Pegar el bloque de la sección 3 en una conversación nueva.
2. Pedir **un plan primero** y no aprobarlo hasta leerlo. En los paquetes que tocan backend o base de datos, enviar el plan a quien entrega antes de aprobar.
3. Trabajar por hitos y exigir `npm run build` (front) o `pytest` (backend) al final de cada uno.
4. **No confiar en el resumen de la IA**: ejecutar los comandos y probar la pantalla.
5. Si la sesión se corta por cuota, usar el prompt de retomar de la sección 8.

### 6.4 Modelos sugeridos

| Tipo de tarea | Modelo |
|---|---|
| Varios archivos, diseño de pantallas, backend con base de datos, integración | **Opus**, el más potente disponible. En la última sesión se usó Claude Opus 4.6 (Thinking); el autor mencionó una versión más nueva: confirma en el selector |
| Retoques, errores de build o de TypeScript, textos, CSS, pruebas sencillas | **Gemini 3.8 Flash en High** |
| Modelo "Argon" | El autor indicó que apareció, pero este documento **no tiene información verificada** sobre él. Probarlo primero con una tarea de bajo riesgo (por ejemplo, corregir un error de build) y comparar con Flash antes de usarlo en algo crítico |

Cuota: los planes base se agotan y se renuevan por fechas. Conviene juntar varios cambios pequeños en un solo prompt y dejar el modelo grande para lo que de verdad lo necesita.

---

## 7. Paquetes de trabajo

**Recomendación de reparto:** entregar los paquetes que tocan solo el front (A, B, F parcial). Quien entrega se queda con los que modifican base de datos y backend (C, D, E), que exigen coordinación.

| Paquete | Qué | Toca | Modelo | Estado |
|---|---|---|---|---|
| **A** | Escenario de agentes, Hito 2 | Front | Opus o Flash High | Pendiente |
| **B** | Escenario de agentes, Hito 3 (integración) | Front | Opus | Pendiente |
| **C** | Arreglo del perfil de otro usuario | Backend y SQL | Flash High | Pendiente |
| **D** | Entrevista adaptativa de Lexi | Backend, front | Opus | Pendiente |
| **E** | Cuentas de empresa, retiro del candidato, Iris reacciona, notificaciones | Backend, SQL, front | Opus | Pendiente |
| **F** | Prioridades con deslizadores, Plan B de Inari, Iris coach, más vacantes | Backend leve, front | Flash High, o Opus | Pendiente |
| **G** | Simulador de entrevista (extra) | Backend, front | Opus | Pendiente |

### Paquete A — Escenario de agentes, Hito 2 (front)

Antes de empezar, la IA debe verificar qué quedó aplicado del Hito 1: (a) `/dev/escenario` con un selector de dos ejemplos, uno con puntaje alto (Kenti postula) y otro con puntaje bajo (Kenti no postula), y la etiqueta "Solo desarrollo"; (b) la ruta devuelve `notFound()` cuando `NODE_ENV` es `production`; (c) los datos de ejemplo imitan el formato real de `agents.py` (nombres de agente y destinos reales, por ejemplo `candidato` en minúscula). Lo que falte, se aplica primero.

Después, `components/escenario/EscenarioAgentes.tsx` con:

1. Los cuatro personajes más un nodo "Tú". La **tarjeta del candidato empieza en "Tú"** y viaja a Lexi al comenzar el primer mensaje, sin agregar ningún texto inventado.
2. Cuando hay un mensaje, la tarjeta se mueve del agente emisor al receptor. Sobre el que habla aparece un **globo** con el `texto`, una etiqueta según el `tipo` (info, alerta, decisión) y la flecha "Lexi → Inari". Si `datos.origen` es `"respaldo"`, se muestra una etiqueta discreta "respuesta de respaldo".
3. **Controles:** anterior, reproducir o pausar, siguiente, repetir y velocidad (1x, 1.5x, 2x), más una **línea de tiempo** con un punto por mensaje, clicable. La reproducción arranca sola al llegar los resultados y se detiene cuando el usuario toca un control o un personaje.
4. **Comparar nombres sin distinguir mayúsculas.** Los destinos desconocidos (`todos` u otros) no deben romper la pantalla.
5. **Kenti atenuado** cuando no hubo postulación: etiqueta "No postuló" y la razón tomada del **último mensaje de tipo `decision` emitido por Inari**. No inventar texto.
6. **Atajos de teclado** (flechas, espacio, `r`) solo cuando el foco está dentro del escenario, no globales. `aria-live` sin repetir anuncios al saltar de mensaje.

Criterio de terminado: `npm run build` sin errores, y revisado a mano en `/dev/escenario` con los dos ejemplos (con el de puntaje bajo, Kenti atenuado con la razón; con el alto, la tarjeta recorre los cuatro).

### Paquete B — Escenario de agentes, Hito 3 (front)

1. `PanelDetalleAgente.tsx`: al tocar un personaje se abre un panel lateral (en móvil, una hoja inferior) con una descripción fija del agente y la lista de sus mensajes, con `datos` mostrados como pares clave-valor legibles, no como JSON. Textos fijos: Lexi estructura tu CV y detecta lo que falta; Inari normaliza vacantes y calcula la afinidad; Kenti simula la postulación; Iris te da el próximo paso. Accesible: `role="dialog"`, `aria-modal`, foco atrapado.
2. **Integración en `ResultadosPage.tsx`:** el escenario va arriba de todo, antes del perfil. La conversación actual en lista se renombra y queda dentro de un acordeón "Ver conversación en texto", como respaldo.
3. **`CvPage.tsx`:** mientras se espera la respuesta, mostrar los cuatro personajes en estado "pensando", iluminándose uno tras otro, con el texto "Los agentes están trabajando". Es una animación de espera: **sin porcentajes ni pasos reales de progreso**.
4. `prefers-reduced-motion`: sin animación, solo la lista de mensajes. Responsive: en pantallas angostas el escenario se apila en vertical.

### Paquete C — Arreglo del perfil de otro usuario (backend y SQL)

Cambiar la unicidad del correo del perfil de global a **por usuario**.

- SQL propuesto (mostrar antes de ejecutar; **verificar en Neon el nombre real de la restricción**, el predeterminado suele ser `perfiles_email_key`):
  `ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_email_key;`
  `ALTER TABLE perfiles ADD CONSTRAINT perfiles_usuario_email_key UNIQUE (usuario_id, email);`
- En `main.py`, `ON CONFLICT (usuario_id, email)` en el INSERT de `perfiles`, y quitar el caso del 409 "pertenece a otro usuario" (o dejarlo con un mensaje claro si sigue siendo posible).
- Pruebas. Actualizar `schema.sql`.

### Paquete D — Entrevista adaptativa de Lexi (backend y front)

Reemplaza el cuadro de texto gigante por una entrevista guiada, para quien no sabe qué escribir.

- Una pregunta por pantalla, respondida **con clics**: chips de ciudad, botones de modalidad, deslizadores de salario y de años de experiencia, chips de habilidades agrupadas por área con búsqueda, y disponibilidad. El perfil se arma **en vivo al costado** con un indicador de completitud.
- **Adaptativa:** Lexi solo pregunta lo que falta. El correo sale de la cuenta, no se pregunta.
- **Rama "primer empleo":** si dice que nunca trabajó, pregunta por estudios, proyectos y voluntariados.
- **Dictado por voz** con la API de reconocimiento de voz del navegador (idioma `es-CO`), sin gastar Gemini. Funciona en Chrome y Edge; no está garantizado en otros navegadores.
- **Subir PDF** (opcional, segunda etapa): con texto seleccionable, no escaneados. Lexi precarga el perfil y pregunta solo los campos vacíos.
- **Gemini una sola vez al final** (armar y pulir el perfil o el resumen) o en un paso opcional de texto libre; las preguntas van con reglas. Con respaldo si falla.
- Decisión de arquitectura a proponer **antes de implementar**: cómo entra al grafo un perfil ya estructurado (por ejemplo, un punto de entrada que saltea la extracción de Lexi y arranca en Inari, conservando los mensajes de Lexi por reglas). Enviar el plan a quien entrega.
- Referencia de preguntas: el registro de Magneto empleos (el reto recomienda registrarse allí para descubrir los campos). Si quien entrega aporta capturas, usar ese orden.

### Paquete E — Empresa, retiro, Iris reacciona y notificaciones (backend, SQL y front)

- **Rol `empresa` (moderador):** vinculado a una empresa de las que aparecen en `vacantes.empresa`. Ve solo las postulaciones a sus vacantes y las mueve de estado, con una **nota** para el candidato (Iris puede redactar un borrador que la empresa edita antes de enviar).
- **Candidato:** el tablero pasa a ser de lectura, con botón **"Retirar postulación"** y la opción de rechazar una invitación a entrevista. Nuevo estado `retirado`: exige modificar la restricción CHECK de `postulaciones.estado` (SQL a mostrar y registrar).
- **Iris reacciona:** cuando cambia el estado, escribe al candidato qué preparar en esa etapa (Gemini con respaldo por reglas), y queda en la bitácora.
- **Notificaciones:** campanita en el encabezado con un aviso cuando la empresa mueve su postulación, y un detalle visual (confeti) al llegar a "entrevista".
- **Demo:** botones "entrar como candidato demo" y "entrar como empresa demo", **detrás de una variable de entorno de demo**. Son credenciales fijas, algo que no se haría en producción; documentarlo. Un botón "Simular respuesta de la empresa" (rotulado como simulación) para quien pruebe con una sola cuenta.
- Cambios de esquema previstos: nuevo valor de `usuarios.rol`, vínculo usuario-empresa y estado `retirado`. **Mostrar todo el SQL a quien entrega antes de ejecutarlo.**

### Paquete F — Prioridades, Plan B, coach y vacantes

- **Prioridades con deslizadores:** el usuario mueve "¿qué te importa más?" (ubicación, modalidad, salario, habilidades) y las vacantes se reordenan al instante con el puntaje explicado. Requiere un endpoint de recomendación con pesos configurables, **sin IA**.
- **Plan B de Inari:** si el match es bajo, botones para ampliar la modalidad, ver áreas cercanas por habilidades en común, o ver vacantes que piden solo 1 o 2 habilidades que el candidato no tiene. Reglas.
- **Iris como coach:** 3 acciones con casillas para marcar y, por cada habilidad faltante, un **enlace de búsqueda armado por el código** (nunca generado por la IA).
- **Más vacantes de ejemplo:** de 20 a unas 50, con más variedad de áreas y habilidades escritas de forma consistente (separadas por comas). Sin esto el Plan B tiene poco que mostrar.

### Paquete G — Simulador de entrevista (extra)

Solo si sobra tiempo y cuota. Al pasar a "entrevista", Iris hace 3 preguntas basadas en la vacante, el usuario responde por texto y recibe feedback **en una sola llamada al final**. Es lo más pesado para el plan gratuito de Gemini: debe tener respaldo y un límite de uso.

---

## 8. Prompt para retomar si la sesión se corta por cuota

```
Estás retomando un trabajo a medias. Revisa el estado actual del repositorio (git status, git log y los archivos del paquete en curso) y dime en qué hito quedamos y qué ajustes ya están aplicados y cuáles no. No reescribas lo que ya funciona. Continúa desde el siguiente hito pendiente con las mismas reglas (no tocar .env, sin commit ni push, el SQL de esquema se muestra primero). Deja el proyecto compilando al final de cada hito.
```

---

## 9. Reporte de vuelta (obligatorio, para quien recibe el trabajo)

Al terminar o al detenerte, entrega un documento con estas secciones. También sirve de **evidencia para la declaración de uso de IA** que exige el curso.

1. **Rama y commits:** nombre de la rama y lista de commits con su mensaje.
2. **Paquetes trabajados:** cuáles, y cuánto de cada uno quedó terminado, parcial o sin empezar.
3. **Archivos creados y modificados:** lista con una línea por archivo.
4. **Verificación:** resultado completo de `pytest` y de `npm run build`, y qué probaste a mano en pantalla.
5. **SQL ejecutado o propuesto:** el texto exacto, y en qué base se corrió.
6. **Decisiones que tomaste** y por qué (en especial las que se apartan de este documento).
7. **Problemas y pendientes:** errores sin resolver, riesgos y cosas que no pudiste verificar.
8. **Prompts principales:** los que más trabajo hicieron, con el modelo usado en cada uno (declaración de uso de IA).
9. **Capturas:** de las pantallas nuevas, sin datos sensibles.

---

## 10. Pendientes que no son de código (no delegar a la IA)

- Excel de historias de usuario y cono de incertidumbre de la Entrega 2 (la plantilla trae filas de ejemplo de otra app; se reemplazan por las de LIKAI).
- Retrospectiva del Sprint 1, planning poker del Sprint 2 con captura y tablero de GitHub actualizado con criterios de aceptación.
- Diagramas: entidad-relación y componentes/despliegue **redibujados en draw.io** (la plantilla pide 4+1 UML o C4), más el comportamental y el de clases.
- Declaración de uso de IA con los prompts principales.
- Capturas de Swagger, de las tablas de Neon (incluida `bitacora_ia`) y de datos reales, **con los nombres reales de las tablas**.
- **Corregir las diapositivas**, que decían algo distinto del código:

| Las diapositivas decían | Lo real |
|---|---|
| `gemini-1.5-flash` y embeddings | `gemini-3.5-flash-lite`; no hay embeddings |
| JWT con refresh tokens | Solo token de acceso de 60 min |
| Cifrado en reposo propio | SSL en tránsito; en reposo lo gestiona el proveedor |
| Batching, caché en memoria y webhooks | No existen |
| Match semántico | Reglas y coincidencia de palabras |
| "Pytest unit e integration y CI" | Solo pruebas unitarias, sin CI |
| Puntaje "5/5" | Puntaje máximo 11, mostrado como porcentaje de afinidad |

- Guion de la sustentación de 10 minutos (equipo y roles, problema y solución, requisitos funcionales y no funcionales, y la app).
