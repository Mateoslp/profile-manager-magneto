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

export function clearToken(): void {
  sessionStorage.removeItem("likai_token");
  sessionStorage.removeItem("likai_user");
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
    throw new Error("Sesión expirada. Por favor iniciá sesión nuevamente.");
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
  estado: "postulado" | "en_revision" | "entrevista" | "descartado";
  siguiente_paso: string | null;
  fecha_postulacion: string;
  afinidad: number | null;
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
  return handleResponse<{ access_token: string; token_type: string }>(res);
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
