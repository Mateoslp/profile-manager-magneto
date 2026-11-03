"use client";

import { useEffect, useState } from "react";
import { MensajeAgente } from "@/lib/api";
import { AgenteNombre } from "./AgenteSvg";

export type NodoId = "tu" | "lexi" | "inari" | "kenti" | "iris";

/** Descripciones fijas oficiales de cada agente (Paquete B). */
export const DESCRIPCIONES_AGENTES: Record<AgenteNombre, string> = {
  Lexi: "Estructura tu CV y detecta lo que falta.",
  Inari: "Normaliza vacantes y calcula la afinidad.",
  Kenti: "Simula la postulación.",
  Iris: "Te da el próximo paso.",
};

const NOMBRES_CAMPOS_PERFIL: Record<string, string> = {
  nombre: "Nombre",
  email: "Email",
  telefono: "Teléfono",
  ubicacion: "Ubicación",
  experiencia_anios: "Años de experiencia",
  educacion: "Educación",
  aspiracion_salarial: "Salario",
  modalidad_preferida: "Modalidad",
  disponibilidad: "Disponibilidad",
  habilidades: "Habilidades",
};

const ETIQUETAS_DATOS: Record<string, string> = {
  vacios_match: "Campos vacíos que afectan el match",
  vacios_otros: "Otros campos vacíos",
  campos_presentes: "Campos disponibles para match",
  perfil_nombre: "Candidato",
  top_3: "Top 3 vacantes evaluadas",
  mejor_score: "Mejor puntaje",
  umbral: "Umbral mínimo",
  cumple: "Cumple el umbral",
  vacante_id: "ID de vacante",
  postulado: "Postulación registrada",
  origen: "Origen de la respuesta",
  vacante: "Vacante evaluada",
  puntaje: "Puntaje obtenido",
  habilidades_faltantes: "Habilidades por reforzar",
};

/** Normaliza texto sin tildes y en minúsculas para comparaciones tolerantes. */
export function normalizarClave(valor: string | null | undefined): string {
  return (valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Resuelve el identificador del nodo sin distinguir mayúsculas ni tildes. */
export function resolverNodo(valor: string | null | undefined): NodoId | null {
  const k = normalizarClave(valor);
  if (k === "lexi") return "lexi";
  if (k === "inari") return "inari";
  if (k === "kenti") return "kenti";
  if (k === "iris") return "iris";
  if (k === "candidato" || k === "tu" || k === "usuario") return "tu";
  return null;
}

export function nombreVisibleNodo(valor: string | null | undefined): string {
  const nodo = resolverNodo(valor);
  if (nodo === "lexi") return "Lexi";
  if (nodo === "inari") return "Inari";
  if (nodo === "kenti") return "Kenti";
  if (nodo === "iris") return "Iris";
  if (nodo === "tu") return "Tú";
  const texto = (valor ?? "").trim();
  return texto || "—";
}

export function obtenerInfoTipo(tipoRaw: string | null | undefined): {
  clave: "info" | "alerta" | "decision" | "otro";
  etiqueta: string;
  clase: string;
} {
  const k = normalizarClave(tipoRaw);
  if (k === "alerta") {
    return { clave: "alerta", etiqueta: "Alerta", clase: "chip-yellow" };
  }
  if (k === "decision") {
    return {
      clave: "decision",
      etiqueta: "Decisión",
      clase: "chip bg-orange-900/40 text-orange-300 border border-orange-800/50",
    };
  }
  if (k === "info") {
    return { clave: "info", etiqueta: "Info", clase: "chip-violet" };
  }
  const limpio = (tipoRaw ?? "").trim();
  return {
    clave: "otro",
    etiqueta: limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : "Mensaje",
    clase: "chip-gray",
  };
}

export function esOrigenRespaldo(
  datos: Record<string, unknown> | null | undefined
): boolean {
  if (!datos || typeof datos !== "object") return false;
  const origen = datos.origen;
  return typeof origen === "string" && normalizarClave(origen) === "respaldo";
}

/** Determina si Kenti se omitió y extrae la razón exacta del último mensaje decision de Inari. */
export function evaluarParticipacionKenti(
  mensajes: MensajeAgente[],
  postulacionId?: number | null
): { kentiNoPostulo: boolean; razonNoPostulo: string | null } {
  if (mensajes.length === 0) {
    return { kentiNoPostulo: false, razonNoPostulo: null };
  }
  const huboMensajeKenti = mensajes.some((m) => resolverNodo(m.agente) === "kenti");
  const ejecutado =
    huboMensajeKenti || (postulacionId !== undefined && postulacionId !== null);

  if (ejecutado) {
    return { kentiNoPostulo: false, razonNoPostulo: null };
  }

  const decisionesInari = mensajes.filter(
    (m) =>
      resolverNodo(m.agente) === "inari" &&
      normalizarClave(m.tipo) === "decision"
  );
  const ultimaDecision =
    decisionesInari.length > 0
      ? decisionesInari[decisionesInari.length - 1]
      : null;

  return {
    kentiNoPostulo: true,
    razonNoPostulo: ultimaDecision?.texto ?? null,
  };
}

export interface ParDatoLegible {
  clave: string;
  etiqueta: string;
  valor: string;
}

function embellecerClave(clave: string): string {
  if (ETIQUETAS_DATOS[clave]) return ETIQUETAS_DATOS[clave];
  if (NOMBRES_CAMPOS_PERFIL[clave]) return NOMBRES_CAMPOS_PERFIL[clave];
  const limpia = clave.replace(/_/g, " ").trim();
  if (!limpia) return "Dato";
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

function formatearItemLista(clavePadre: string, item: unknown): string {
  if (item === null || item === undefined || item === "") {
    return "No especificado";
  }
  if (typeof item === "string") {
    if (
      clavePadre === "vacios_match" ||
      clavePadre === "vacios_otros" ||
      clavePadre === "campos_presentes"
    ) {
      return NOMBRES_CAMPOS_PERFIL[item] ?? item.replace(/_/g, " ");
    }
    return item;
  }
  if (typeof item === "boolean") {
    return item ? "Sí" : "No";
  }
  if (typeof item === "number") {
    return item.toLocaleString("es-CO");
  }
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if ("titulo" in obj && "score" in obj) {
      const titulo = obj.titulo ? String(obj.titulo) : "Vacante";
      const score =
        typeof obj.score === "number" ? `${obj.score} pts` : String(obj.score ?? "");
      return score ? `${titulo} (${score})` : titulo;
    }
    const partes = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${embellecerClave(k)}: ${formatearValorDato(k, v)}`);
    return partes.length > 0 ? partes.join(", ") : "Sin detalle";
  }
  return String(item);
}

function formatearValorDato(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") {
    return "No especificado";
  }
  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }
  if (typeof valor === "number") {
    if (clave === "mejor_score" || clave === "umbral" || clave === "puntaje") {
      return `${valor.toLocaleString("es-CO")} pts`;
    }
    if (clave === "vacante_id") {
      return `#${valor}`;
    }
    return valor.toLocaleString("es-CO");
  }
  if (typeof valor === "string") {
    if (clave === "origen") {
      const norm = normalizarClave(valor);
      if (norm === "gemini") return "IA (Gemini)";
      if (norm === "respaldo") return "Reglas de respaldo";
    }
    return valor;
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "Ninguno";
    const separador = clave === "top_3" ? " · " : ", ";
    return valor.map((item) => formatearItemLista(clave, item)).join(separador);
  }
  if (typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>);
    if (entradas.length === 0) return "Sin datos";
    return entradas
      .map(([k, v]) => `${embellecerClave(k)}: ${formatearValorDato(k, v)}`)
      .join(" · ");
  }
  return String(valor);
}

/** Convierte el diccionario datos de un mensaje en pares clave-valor legibles (nunca JSON crudo). */
export function formatearDatosMensaje(
  datos: Record<string, unknown> | null | undefined
): ParDatoLegible[] {
  if (!datos || typeof datos !== "object") return [];
  return Object.entries(datos).map(([clave, valor]) => ({
    clave,
    etiqueta: embellecerClave(clave),
    valor: formatearValorDato(clave, valor),
  }));
}

/** Hook reactivo y seguro en SSR para respetar prefers-reduced-motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);

    function onChange(e: MediaQueryListEvent) {
      setReduced(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

