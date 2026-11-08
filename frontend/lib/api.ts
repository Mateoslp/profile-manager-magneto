/**
 * Cliente HTTP centralizado para la API de LIKAI.
 * Todos los endpoints requieren Authorization: Bearer <token>
 * excepto /auth/registro y /auth/login.
 *
 * Si cualquier llamada responde 401, limpia la sesión y redirige al login.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("likai_token");
}

export function setToken(token: string): void {
  sessionStorage.setItem("likai_token", token);
}

export function getRol(): "candidato" | "empresa" | "admin" | null {
  if (typeof window === "undefined") return null;
  const r = sessionStorage.getItem("likai_rol");
  if (r === "empresa" || r === "admin" || r === "candidato") return r;
  const token = getToken();
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.rol === "empresa" || payload.rol === "admin" || payload.rol === "candidato") {
          return payload.rol;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function setRol(rol: string): void {
  sessionStorage.setItem("likai_rol", rol);
}

export function clearToken(): void {
  sessionStorage.removeItem("likai_token");
  sessionStorage.removeItem("likai_user");
  sessionStorage.removeItem("likai_rol");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Maneja la respuesta: si es 401 limpia sesión; si no es ok lanza el mensaje de la API. */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("likai:unauthorized"));
    }
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* ignorar si el body no es JSON */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CvDemo {
  id: number;
  etiqueta: string;
  cv_texto: string;
}

export interface Perfil {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  ubicacion: string | null;
  experiencia_anios: number | null;
  educacion: string | null;
  aspiracion_salarial: number | null;
  modalidad_preferida: string | null;
  disponibilidad: string | null;
  habilidades: string | null;
}

export interface Recomendacion {
  id: number;
  titulo: string;
  empresa: string | null;
  ubicacion: string | null;
  modalidad: string | null;
  salario_min: number | null;
  salario_max: number | null;
  habilidades: string | null;
  score: number;
  afinidad: number;
  habilidades_en_comun: string[];
  habilidades_faltantes: string[];
}

export interface MensajeAgente {
  agente: string;
  para: string;
  tipo: string;
  texto: string;
  datos: Record<string, unknown>;
}

export interface ResultadoProcesar {
  perfil_id: number;
  postulacion_id: number | null;
  perfil: Perfil;
  recomendaciones: Recomendacion[];
  mensajes: MensajeAgente[];
  mensaje_seguimiento: string | null;
}

export interface Postulacion {
  id: number;
  perfil_id: number;
  vacante_id: number;
  estado: "postulado" | "en_revision" | "entrevista" | "descartado" | "retirado";
  siguiente_paso: string | null;
  fecha_postulacion: string;
  afinidad: number | null;
  nota_empresa?: string | null;
  candidato: string;
  vacante: string;
  empresa: string | null;
  modalidad: string | null;
  salario_min: number | null;
  salario_max: number | null;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export async function apiRegistro(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ id: number; email: string }>(res);
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ access_token: string; token_type: string; rol?: string }>(res);
}

export async function apiDemoCvs(): Promise<CvDemo[]> {
  const res = await fetch(`${API_URL}/demo/cvs`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<CvDemo[]>(res);
}

export async function apiProcesarCandidato(
  cv_texto: string,
  expectativas: Record<string, unknown> = {}
): Promise<ResultadoProcesar> {
  const res = await fetch(`${API_URL}/procesar-candidato`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ cv_texto, expectativas }),
  });
  return handleResponse<ResultadoProcesar>(res);
}

export async function apiGetPostulaciones(): Promise<Postulacion[]> {
  const res = await fetch(`${API_URL}/postulaciones`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<Postulacion[]>(res);
}

export interface PostulacionManualResponse {
  id: number;
  perfil_id: number;
  vacante_id: number;
  estado: string;
  afinidad: number;
  siguiente_paso: string | null;
  fecha_postulacion: string | null;
}

export async function apiCrearPostulacionManual(
  perfilId: number,
  vacanteId: number
): Promise<PostulacionManualResponse> {
  const res = await fetch(`${API_URL}/postulaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ perfil_id: perfilId, vacante_id: vacanteId }),
  });
  return handleResponse<PostulacionManualResponse>(res);
}

export async function apiPatchEstado(
  postulacionId: number,
  estado: string
): Promise<{ id: number; estado: string }> {
  const res = await fetch(`${API_URL}/postulaciones/${postulacionId}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ estado }),
  });
  return handleResponse<{ id: number; estado: string }>(res);
}

export async function apiGetBitacora(
  perfilId: number
): Promise<MensajeAgente[]> {
  const res = await fetch(`${API_URL}/bitacora/${perfilId}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<MensajeAgente[]>(res);
}

export interface PesosPrioridades {
  peso_ubicacion: number;
  peso_modalidad: number;
  peso_salario: number;
  peso_habilidad: number;
  perfil_id?: number | null;
}

export interface ResultadoRecalculo {
  perfil_id: number;
  pesos: {
    peso_ubicacion: number;
    peso_modalidad: number;
    peso_salario: number;
    peso_habilidad: number;
  };
  recomendaciones: Recomendacion[];
}

export async function apiRecalcularRecomendaciones(
  pesos: PesosPrioridades
): Promise<ResultadoRecalculo> {
  const res = await fetch(`${API_URL}/perfil/recalcular-recomendaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(pesos),
  });
  return handleResponse<ResultadoRecalculo>(res);
}

export interface GruposPlanB {
  ampliar_modalidades?: Recomendacion[];
  areas_cercanas?: Recomendacion[];
  casi_cumples?: Recomendacion[];
}

export interface PlanBInfo {
  activo: boolean;
  grupos: GruposPlanB;
}

export interface AccionCoaching {
  accion: string;
  habilidad: string;
  enlace: string;
}

export interface ResultadoPlanBCoaching {
  perfil_id: number;
  plan_b: PlanBInfo;
  coaching: AccionCoaching[];
}

export async function apiGetPlanBCoaching(
  perfilId?: number | null
): Promise<ResultadoPlanBCoaching> {
  const res = await fetch(`${API_URL}/perfil/plan-b-coaching`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(perfilId != null ? { perfil_id: perfilId } : {}),
  });
  return handleResponse<ResultadoPlanBCoaching>(res);
}

// ─── Simulador de entrevista ───────────────────────────────────────────────

export interface PreguntaEntrevista {
  id: number;
  tipo: "motivacion" | "tecnica" | "situacion";
  pregunta: string;
}

export interface PreguntasEntrevistaResponse {
  postulacion_id: number;
  vacante: string;
  empresa: string | null;
  preguntas: PreguntaEntrevista[];
}

export interface EvaluacionItem {
  id_pregunta: number;
  claridad: string;
  pertinencia: string;
  aspecto_a_mejorar: string;
}

export interface FeedbackEntrevista {
  evaluacion_respuestas: EvaluacionItem[];
  comentario_general: string;
}

export interface FeedbackEntrevistaResponse {
  postulacion_id: number;
  origen: "gemini" | "respaldo";
  feedback: FeedbackEntrevista;
}

export interface RespuestasEntrevistaInput {
  respuesta_1: string;
  respuesta_2: string;
  respuesta_3: string;
}

export async function apiGetPreguntasEntrevista(
  postulacionId: number
): Promise<PreguntasEntrevistaResponse> {
  const res = await fetch(
    `${API_URL}/postulaciones/${postulacionId}/entrevista-simulada/preguntas`,
    {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    }
  );
  return handleResponse<PreguntasEntrevistaResponse>(res);
}

export async function apiPostFeedbackEntrevista(
  postulacionId: number,
  respuestas: RespuestasEntrevistaInput
): Promise<FeedbackEntrevistaResponse> {
  const res = await fetch(
    `${API_URL}/postulaciones/${postulacionId}/entrevista-simulada/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(respuestas),
    }
  );
  return handleResponse<FeedbackEntrevistaResponse>(res);
}

// ─── Paquete E: Rol empresa y notificaciones ─────────────────────────────────

export interface PostulacionEmpresa {
  id: number;
  estado: "postulado" | "en_revision" | "entrevista" | "descartado" | "retirado";
  afinidad: number | null;
  nota_empresa: string | null;
  fecha_postulacion: string | null;
  vacante: {
    id: number;
    titulo: string;
  };
  candidato: {
    nombre: string;
    ubicacion: string | null;
    experiencia_anios: number | null;
    educacion: string | null;
    habilidades: string | null;
  };
}

export interface Notificacion {
  id: number;
  postulacion_id: number | null;
  mensaje: string;
  leida: boolean;
  creado_en: string | null;
}

export interface NotificacionesResponse {
  total_no_leidas: number;
  notificaciones: Notificacion[];
}

export async function apiGetPostulacionesEmpresa(): Promise<PostulacionEmpresa[]> {
  const res = await fetch(`${API_URL}/empresa/postulaciones`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<PostulacionEmpresa[]>(res);
}

export async function apiPatchPostulacionEmpresa(
  postulacionId: number,
  datos: { estado?: "en_revision" | "entrevista" | "descartado"; nota?: string }
): Promise<{ id: number; estado: string; nota_empresa: string | null }> {
  const res = await fetch(`${API_URL}/empresa/postulaciones/${postulacionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(datos),
  });
  return handleResponse<{ id: number; estado: string; nota_empresa: string | null }>(res);
}

export async function apiGetNotificaciones(): Promise<NotificacionesResponse> {
  const res = await fetch(`${API_URL}/notificaciones`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<NotificacionesResponse>(res);
}

export async function apiMarcarNotificacionLeida(
  notificacionId: number
): Promise<{ id: number; leida: boolean }> {
  const res = await fetch(`${API_URL}/notificaciones/${notificacionId}/leida`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  return handleResponse<{ id: number; leida: boolean }>(res);
}
