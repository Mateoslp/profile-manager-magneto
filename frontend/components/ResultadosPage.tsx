"use client";

import { useEffect, useState } from "react";
import {
  MensajeAgente,
  Perfil,
  PesosPrioridades,
  Recomendacion,
  ResultadoPlanBCoaching,
  ResultadoProcesar,
  apiCrearPostulacionManual,
  apiGetPlanBCoaching,
  apiGetPostulaciones,
  apiRecalcularRecomendaciones,
} from "@/lib/api";
import { AGENTES_META, AgenteNombre } from "@/components/escenario/AgenteSvg";
import EscenarioAgentes from "@/components/escenario/EscenarioAgentes";
import {
  esOrigenRespaldo,
  nombreVisibleNodo,
  obtenerInfoTipo,
  usePrefersReducedMotion,
} from "@/components/escenario/mensajesUtils";

// ─── Helpers ───────────────────────────────────────────────────────────────

function colorPorAgente(agente: string): string {
  const nombre = nombreVisibleNodo(agente) as AgenteNombre;
  return AGENTES_META[nombre]?.color ?? "#9090b0";
}

function formatSalario(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Tarjeta de perfil ────────────────────────────────────────────────────

const PERFIL_CAMPOS: Array<{ key: keyof Perfil; label: string; format?: (v: unknown) => string }> = [
  { key: "nombre",            label: "Nombre" },
  { key: "email",             label: "Email" },
  { key: "telefono",          label: "Teléfono" },
  { key: "ubicacion",         label: "Ubicación" },
  { key: "experiencia_anios", label: "Experiencia", format: (v) => v ? `${v} años` : "" },
  { key: "educacion",         label: "Educación" },
  {
    key: "aspiracion_salarial",
    label: "Aspiración salarial",
    format: (v) => (v ? formatSalario(v as number) ?? "" : ""),
  },
  { key: "modalidad_preferida", label: "Modalidad preferida" },
  { key: "disponibilidad",    label: "Disponibilidad" },
  { key: "habilidades",       label: "Habilidades" },
];

function TarjetaPerfil({ perfil }: { perfil: Perfil }) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">👤</span>
        <h3 className="font-semibold text-text-primary">
          Perfil detectado por Lexi
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PERFIL_CAMPOS.map(({ key, label, format }) => {
          const raw   = perfil[key];
          const valor =
            raw != null && raw !== ""
              ? format
                ? format(raw)
                : String(raw)
              : null;
          return (
            <div
              key={key}
              className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                {label}
              </p>
              {valor ? (
                <p className="mt-0.5 text-sm text-text-primary break-words">{valor}</p>
              ) : (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-warning" />
                  <p className="text-sm italic text-text-muted">No detectado</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conversación de agentes en texto (acordeón de respaldo) ──────────────

function BurbujaMensaje({ msg }: { msg: MensajeAgente }) {
  const emisor = nombreVisibleNodo(msg.agente);
  const receptor = nombreVisibleNodo(msg.para);
  const color = colorPorAgente(msg.agente);
  const badge = obtenerInfoTipo(msg.tipo);
  const mostrarRespaldo = esOrigenRespaldo(msg.datos);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: `${color}22`, color, border: `1.5px solid ${color}66` }}
      >
        {emisor[0] ?? "?"}
      </div>

      {/* Burbuja */}
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold" style={{ color }}>
            {emisor}
          </span>
          <svg
            className="h-3 w-3 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-text-muted">{receptor}</span>
          <span className={badge.clase}>{badge.etiqueta}</span>
          {mostrarRespaldo && (
            <span className="chip bg-surface-elevated text-text-muted border border-surface-border text-[10px]">
              Respuesta de respaldo
            </span>
          )}
        </div>
        <div className="rounded-xl rounded-tl-none border border-surface-border bg-surface-elevated px-4 py-3">
          <p className="text-sm leading-relaxed text-text-primary">{msg.texto}</p>
        </div>
      </div>
    </div>
  );
}

function AcordeonConversacionTexto({
  mensajes,
  abiertoPorDefecto,
}: {
  mensajes: MensajeAgente[];
  abiertoPorDefecto: boolean;
}) {
  return (
    <details
      id="acordeon-conversacion-texto"
      open={abiertoPorDefecto || undefined}
      className="card group overflow-hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">💬</span>
          <span>Ver conversación en texto</span>
          <span className="chip-gray text-[11px]">{mensajes.length}</span>
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="border-t border-surface-border px-6 py-5">
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {mensajes.map((msg, idx) => (
            <BurbujaMensaje key={idx} msg={msg} />
          ))}
        </div>
      </div>
    </details>
  );
}

// ─── Indicador circular de afinidad ──────────────────────────────────────

function CirculoAfinidad({ pct }: { pct: number }) {
  const r   = 22;
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = pct >= 70 ? "#34d399" : pct >= 45 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#2d2d50" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
        <text x="30" y="35" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
          {pct}%
        </text>
      </svg>
      <span className="text-[10px] text-text-muted uppercase tracking-wide">Afinidad</span>
    </div>
  );
}

// ─── Tarjeta de vacante ───────────────────────────────────────────────────

function TarjetaVacante({
  rec,
  esPostulada,
  esKenti,
  onPostular,
  cargando,
  confirmandoBajaAfinidad,
  onIniciarConfirmacion,
  onCancelarConfirmacion,
  errorMsg,
}: {
  rec: Recomendacion;
  esPostulada: boolean;
  esKenti?: boolean;
  onPostular?: (id: number) => void;
  cargando?: boolean;
  confirmandoBajaAfinidad?: boolean;
  onIniciarConfirmacion?: (id: number) => void;
  onCancelarConfirmacion?: () => void;
  errorMsg?: string | null;
}) {
  return (
    <div
      className={[
        "card p-5 space-y-4 transition-all motion-reduce:transition-none",
        esPostulada ? "border-accent shadow-glow-sm" : "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {esPostulada && (
              <span className="chip-violet text-[11px]">
                ✓ Postulada
              </span>
            )}
          </div>
          <h4 className="font-semibold text-text-primary truncate">{rec.titulo}</h4>
          {rec.empresa && (
            <p className="text-sm text-text-secondary">{rec.empresa}</p>
          )}
        </div>
        <CirculoAfinidad pct={rec.afinidad} />
      </div>

      {/* Detalles */}
      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {rec.ubicacion && <span>📍 {rec.ubicacion}</span>}
        {rec.modalidad && (
          <span className="capitalize">🏠 {rec.modalidad}</span>
        )}
        {(rec.salario_min || rec.salario_max) && (
          <span>
            💰{" "}
            {[formatSalario(rec.salario_min), formatSalario(rec.salario_max)]
              .filter(Boolean)
              .join(" – ")}
          </span>
        )}
      </div>

      {/* Habilidades */}
      {rec.habilidades_en_comun.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.habilidades_en_comun.map((h) => (
            <span key={h} className="chip-green">{h}</span>
          ))}
        </div>
      )}
      {rec.habilidades_faltantes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.habilidades_faltantes.map((h) => (
            <span key={h} className="chip-gray">{h}</span>
          ))}
        </div>
      )}

      {/* Acción de postulación manual (cuando aún no se ha postulado) */}
      {!esPostulada && onPostular && (
        <div className="pt-3 border-t border-surface-border/40 space-y-2">
          {confirmandoBajaAfinidad ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <span>⚠️</span>
                <span>Aviso de baja afinidad ({rec.afinidad}%)</span>
              </div>
              <p className="text-text-secondary">
                Esta vacante tiene menor afinidad con tu perfil actual. ¿Deseas confirmar tu postulación de todos modos?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  id={`btn-confirmar-postular-${rec.id}`}
                  disabled={cargando}
                  onClick={() => onPostular(rec.id)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  {cargando ? "Postulando..." : "Sí, confirmar postulación"}
                </button>
                <button
                  type="button"
                  id={`btn-cancelar-postular-${rec.id}`}
                  disabled={cargando}
                  onClick={onCancelarConfirmacion}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] text-text-muted">
                Postulación registrada en LIKAI
              </span>
              <button
                type="button"
                id={`btn-postular-${rec.id}`}
                disabled={cargando}
                onClick={() => {
                  if (rec.afinidad < 36) {
                    onIniciarConfirmacion?.(rec.id);
                  } else {
                    onPostular(rec.id);
                  }
                }}
                className="btn-primary text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5"
              >
                {cargando ? (
                  <>
                    <span className="animate-spin text-xs">⏳</span>
                    <span>Postulando...</span>
                  </>
                ) : (
                  <>
                    <span>Postularme</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-status-error font-medium">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Configuración de prioridades personalizadas ─────────────────────────

const PESOS_DEFECTO: PesosPrioridades = {
  peso_ubicacion: 2,
  peso_modalidad: 2,
  peso_salario: 1,
  peso_habilidad: 2,
};

const CONTROLES_PRIORIDADES = [
  {
    clave: "peso_ubicacion" as const,
    label: "Ubicación",
    icono: "📍",
    descripcion: "Coincidencia de ciudad o sede de trabajo",
  },
  {
    clave: "peso_modalidad" as const,
    label: "Modalidad",
    icono: "🏠",
    descripcion: "Remoto, híbrido o presencial",
  },
  {
    clave: "peso_salario" as const,
    label: "Salario",
    icono: "💰",
    descripcion: "Cubre tu aspiración salarial esperada",
  },
  {
    clave: "peso_habilidad" as const,
    label: "Habilidades",
    icono: "⚡",
    descripcion: "Coincidencia técnica (hasta 3 habilidades)",
  },
];

// ─── Pantalla completa de resultados ─────────────────────────────────────

interface ResultadosPageProps {
  resultado: ResultadoProcesar;
  onOtroCv: () => void;
  onVerTablero: () => void;
}

export default function ResultadosPage({
  resultado,
  onOtroCv,
  onVerTablero,
}: ResultadosPageProps) {
  const {
    perfil,
    mensajes,
    mensaje_seguimiento,
    postulacion_id,
    perfil_id,
  } = resultado;
  const reducedMotion = usePrefersReducedMotion();

  // Estados de prioridades y recomendaciones reactivas
  const [pesos, setPesos] = useState<PesosPrioridades>(PESOS_DEFECTO);
  const [recsActuales, setRecsActuales] = useState<Recomendacion[]>(resultado.recomendaciones);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primeraCarga, setPrimeraCarga] = useState(true);

  // Estados para Plan B y Coaching de mejora
  const [infoPlanB, setInfoPlanB] = useState<ResultadoPlanBCoaching | null>(null);
  const [cargandoPlanB, setCargandoPlanB] = useState(false);
  const [errorPlanB, setErrorPlanB] = useState<string | null>(null);

  // Estados de postulaciones (automática de Kenti y manuales)
  const idVacanteKenti = postulacion_id !== null ? resultado.recomendaciones[0]?.id : null;
  const [postuladasIds, setPostuladasIds] = useState<Set<number>>(
    new Set(idVacanteKenti ? [idVacanteKenti] : [])
  );
  const [cargandoPostulacionId, setCargandoPostulacionId] = useState<number | null>(null);
  const [confirmandoBajaAfinidadId, setConfirmandoBajaAfinidadId] = useState<number | null>(null);
  const [errorPostulacion, setErrorPostulacion] = useState<{ vacanteId: number; mensaje: string } | null>(null);

  // Sincronizar con las postulaciones existentes en el backend
  useEffect(() => {
    apiGetPostulaciones()
      .then((posts) => {
        setPostuladasIds((prev) => {
          const nuevo = new Set(prev);
          posts.forEach((p) => {
            if (perfil_id && p.perfil_id === perfil_id) {
              nuevo.add(p.vacante_id);
            } else if (!perfil_id) {
              nuevo.add(p.vacante_id);
            }
          });
          return nuevo;
        });
      })
      .catch(() => {});
  }, [perfil_id]);

  async function handlePostular(vacanteId: number) {
    if (!perfil_id) return;
    setCargandoPostulacionId(vacanteId);
    setErrorPostulacion(null);
    try {
      await apiCrearPostulacionManual(perfil_id, vacanteId);
      setPostuladasIds((prev) => new Set([...prev, vacanteId]));
      setConfirmandoBajaAfinidadId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al postularse a la vacante";
      setErrorPostulacion({ vacanteId, mensaje: msg });
    } finally {
      setCargandoPostulacionId(null);
    }
  }

  const todosEnCero =
    pesos.peso_ubicacion === 0 &&
    pesos.peso_modalidad === 0 &&
    pesos.peso_salario === 0 &&
    pesos.peso_habilidad === 0;

  const sonPesosPorDefecto =
    pesos.peso_ubicacion === PESOS_DEFECTO.peso_ubicacion &&
    pesos.peso_modalidad === PESOS_DEFECTO.peso_modalidad &&
    pesos.peso_salario === PESOS_DEFECTO.peso_salario &&
    pesos.peso_habilidad === PESOS_DEFECTO.peso_habilidad;

  // Restaurar si el análisis completo cambia desde afuera
  useEffect(() => {
    setRecsActuales(resultado.recomendaciones);
    setPesos(PESOS_DEFECTO);
    setError(null);
    setCargando(false);
  }, [resultado]);

  // Debounce de 400ms para recalcular al cambiar sliders
  useEffect(() => {
    if (primeraCarga) {
      setPrimeraCarga(false);
      return;
    }

    if (sonPesosPorDefecto) {
      setRecsActuales(resultado.recomendaciones);
      setError(null);
      setCargando(false);
      return;
    }

    if (todosEnCero) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const respuesta = await apiRecalcularRecomendaciones({
          ...pesos,
          perfil_id,
        });
        setRecsActuales(respuesta.recomendaciones);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al recalcular las recomendaciones");
      } finally {
        setCargando(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pesos, perfil_id, resultado.recomendaciones, primeraCarga, sonPesosPorDefecto, todosEnCero]);

  // Carga determinista de Plan B y coaching de mejora técnica
  useEffect(() => {
    let cancelado = false;
    async function cargarPlanBCoaching() {
      setCargandoPlanB(true);
      setErrorPlanB(null);
      try {
        const datos = await apiGetPlanBCoaching(perfil_id);
        if (!cancelado) {
          setInfoPlanB(datos);
        }
      } catch (err) {
        if (!cancelado) {
          setErrorPlanB(
            err instanceof Error ? err.message : "Error al cargar alternativas y plan de mejora"
          );
        }
      } finally {
        if (!cancelado) {
          setCargandoPlanB(false);
        }
      }
    }

    cargarPlanBCoaching();
    return () => {
      cancelado = true;
    };
  }, [perfil_id]);

  const handleRestablecer = () => {
    setPesos(PESOS_DEFECTO);
    setRecsActuales(resultado.recomendaciones);
    setError(null);
  };

  return (
    <div className="animate-slide-up motion-reduce:animate-none mx-auto w-full max-w-4xl space-y-8">
      {/* Barra superior de resultados con acceso rápido al tablero */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-surface-border/50">
        <div className="text-xs text-text-muted flex items-center gap-1.5">
          <span>🎯</span>
          <span>Recomendaciones personalizadas según tu perfil profesional.</span>
        </div>
        <button
          id="btn-ir-tablero-superior"
          type="button"
          onClick={onVerTablero}
          className="btn-secondary text-xs sm:text-sm py-1.5 px-3 flex items-center gap-1.5 font-medium"
        >
          <span>📋 Ir al tablero</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Resultados del análisis</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Así interpretaron tu CV los cuatro agentes de LIKAI.
        </p>
      </div>

      {/* Escenario visual interactivo (arriba del perfil; con prefers-reduced-motion prioriza solo la lista de mensajes) */}
      {mensajes.length > 0 && !reducedMotion && (
        <EscenarioAgentes
          mensajes={mensajes}
          postulacionId={postulacion_id}
          nombreCandidato={perfil.nombre}
        />
      )}

      {/* Conversación en formato lista dentro del acordeón "Ver conversación en texto" */}
      {mensajes.length > 0 && (
        <AcordeonConversacionTexto
          key={reducedMotion ? "reduced" : "normal"}
          mensajes={mensajes}
          abiertoPorDefecto={reducedMotion}
        />
      )}

      {/* Perfil */}
      <TarjetaPerfil perfil={perfil} />

      {/* Vacantes recomendadas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <h3 className="font-semibold text-text-primary">Vacantes recomendadas</h3>
            {cargando && (
              <span className="text-xs text-accent-light animate-pulse ml-2">
                Recalculando afinidades...
              </span>
            )}
          </div>
          {!sonPesosPorDefecto && (
            <span className="chip-violet text-[11px]">Prioridades ajustadas</span>
          )}
        </div>

        {/* Panel plegable de prioridades */}
        <details
          id="panel-ajuste-prioridades"
          className="card group overflow-hidden border-surface-border bg-surface-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-lg">⚖️</span>
              <span>Ajusta tus prioridades</span>
              {!sonPesosPorDefecto && (
                <span className="chip-violet text-[10px]">Personalizado</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted font-normal hidden sm:inline">
                Explora el orden de vacantes
              </span>
              <svg
                className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>

          <div className="border-t border-surface-border px-6 py-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-text-secondary">
                Asigna un valor de <strong>0</strong> (sin importancia) a <strong>5</strong> (máxima prioridad) para cada criterio:
              </p>
              <button
                id="btn-restablecer-prioridades"
                type="button"
                onClick={handleRestablecer}
                disabled={sonPesosPorDefecto && !cargando}
                className="btn-secondary text-xs px-3 py-1.5"
                title="Volver a los valores por defecto (2, 2, 1, 2)"
              >
                ↺ Restablecer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTROLES_PRIORIDADES.map((c) => {
                const valorActual = pesos[c.clave];
                return (
                  <div
                    key={c.clave}
                    className="rounded-xl border border-surface-border bg-surface-elevated/70 p-3.5 space-y-2 transition-colors hover:border-surface-border/80"
                  >
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`slider-${c.clave}`}
                        className="text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-pointer"
                      >
                        <span aria-hidden="true">{c.icono}</span>
                        <span>{c.label}</span>
                      </label>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-card border border-surface-border text-accent-light">
                        {valorActual} / 5
                      </span>
                    </div>

                    <p className="text-[11px] text-text-muted leading-tight">{c.descripcion}</p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-text-muted font-mono">0</span>
                      <input
                        id={`slider-${c.clave}`}
                        type="range"
                        min={0}
                        max={5}
                        step={1}
                        value={valorActual}
                        onChange={(e) =>
                          setPesos((prev) => ({
                            ...prev,
                            [c.clave]: Number(e.target.value),
                          }))
                        }
                        aria-label={`Prioridad para ${c.label}, valor actual ${valorActual} de 5`}
                        className="w-full accent-accent cursor-pointer h-1.5 bg-surface-card rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                      <span className="text-[10px] text-text-muted font-mono">5</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso si todos los pesos están en cero */}
            {todosEnCero && (
              <div className="alert-warning text-xs mt-3 flex items-start gap-2">
                <span className="text-sm select-none" aria-hidden="true">⚠️</span>
                <p>
                  Al menos una prioridad debe ser mayor que 0 para poder calcular afinidades y ordenar las vacantes.
                </p>
              </div>
            )}

            {/* Aviso de error al llamar a la API */}
            {error && (
              <div className="alert-error text-xs mt-3 flex items-start gap-2">
                <span className="text-sm select-none" aria-hidden="true">❌</span>
                <p>{error}</p>
              </div>
            )}

            {/* Ajuste de prioridades */}
            <div className="rounded-lg bg-surface-elevated/40 border border-surface-border/70 px-3.5 py-2.5 text-xs text-text-muted flex items-start gap-2 mt-2">
              <span className="text-sm select-none" aria-hidden="true">ℹ️</span>
              <p>
                <strong>Ajuste de prioridades:</strong> Tus prioridades solo cambian el orden que ves, no tu postulación registrada.
              </p>
            </div>
          </div>
        </details>

        {recsActuales.length === 0 ? (
          <div className="alert-info">
            <span>ℹ️</span>
            <p>No se encontraron vacantes disponibles para analizar.</p>
          </div>
        ) : (
          <div
            className={`space-y-4 transition-opacity duration-200 ${
              cargando ? "opacity-60" : "opacity-100"
            }`}
          >
            {recsActuales.map((rec) => (
              <TarjetaVacante
                key={rec.id}
                rec={rec}
                esPostulada={postuladasIds.has(rec.id)}
                esKenti={rec.id === idVacanteKenti}
                onPostular={handlePostular}
                cargando={cargandoPostulacionId === rec.id}
                confirmandoBajaAfinidad={confirmandoBajaAfinidadId === rec.id}
                onIniciarConfirmacion={(id) => setConfirmandoBajaAfinidadId(id)}
                onCancelarConfirmacion={() => setConfirmandoBajaAfinidadId(null)}
                errorMsg={errorPostulacion?.vacanteId === rec.id ? errorPostulacion.mensaje : null}
              />
            ))}
          </div>
        )}

        {/* Aviso si no se postuló automáticamente */}
        {postulacion_id === null && (
          <div className="alert-warning">
            <span>ℹ️</span>
            <div>
              <p className="font-medium">Kenti no realizó postulación automática</p>
              <p className="text-xs mt-0.5 opacity-80">
                La afinidad no alcanzó el umbral automático de 4 puntos. Puedes revisar las vacantes recomendadas o el Plan B y pulsar &quot;Postularme&quot; en la que elijas para practicar tu proceso.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta de Iris */}
      {mensaje_seguimiento && (
        <div className="card p-6 border-blue-800/30 bg-gradient-to-br from-blue-900/10 to-surface-card">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "#60a5fa22", color: "#60a5fa", border: "1.5px solid #60a5fa66" }}
            >
              I
            </div>
            <div>
              <p className="font-semibold text-blue-300">Iris — Seguimiento</p>
              <p className="text-xs text-text-muted">
                {postulacion_id !== null
                  ? "Orientación para tu postulación"
                  : "Recomendaciones de mejora"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-text-primary">{mensaje_seguimiento}</p>
        </div>
      )}

      {/* Estado de carga de Plan B y Coaching */}
      {cargandoPlanB && !infoPlanB && (
        <div className="card p-6 text-center space-y-2 border-surface-border/50">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs text-text-muted">Analizando alternativas de Plan B y plan de mejora...</p>
        </div>
      )}

      {/* Error al cargar Plan B o Coaching */}
      {errorPlanB && (
        <div className="alert-error text-xs flex items-center gap-2">
          <span>❌</span>
          <p>{errorPlanB}</p>
        </div>
      )}

      {/* Tarjeta Plan B (solo visible si plan_b.activo) */}
      {infoPlanB?.plan_b.activo && infoPlanB.plan_b.grupos && Object.keys(infoPlanB.plan_b.grupos).length > 0 && (
        <div
          id="seccion-plan-b"
          className="card p-6 space-y-6 border-status-warning/40 bg-gradient-to-br from-yellow-900/10 to-surface-card"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-lg">Plan B: Alternativas recomendadas</h3>
                <span className="chip-yellow text-[10px]">Afinidad alternativa</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Dado que el puntaje de coincidencia no alcanzó el umbral mínimo para postulación, exploramos estas alternativas según tu perfil:
              </p>
            </div>
          </div>

          {/* Grupo 1: Ampliar modalidades */}
          {infoPlanB.plan_b.grupos.ampliar_modalidades && infoPlanB.plan_b.grupos.ampliar_modalidades.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span>🔄</span>
                <h4>Ampliar modalidades</h4>
                <span className="text-xs font-normal text-text-muted">
                  (Opciones considerando otras modalidades de trabajo)
                </span>
              </div>
              <div className="space-y-3">
                {infoPlanB.plan_b.grupos.ampliar_modalidades.map((rec) => (
                  <TarjetaVacante
                    key={`planb-mod-${rec.id}`}
                    rec={rec}
                    esPostulada={postuladasIds.has(rec.id)}
                    esKenti={rec.id === idVacanteKenti}
                    onPostular={handlePostular}
                    cargando={cargandoPostulacionId === rec.id}
                    confirmandoBajaAfinidad={confirmandoBajaAfinidadId === rec.id}
                    onIniciarConfirmacion={(id) => setConfirmandoBajaAfinidadId(id)}
                    onCancelarConfirmacion={() => setConfirmandoBajaAfinidadId(null)}
                    errorMsg={errorPostulacion?.vacanteId === rec.id ? errorPostulacion.mensaje : null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grupo 2: Áreas afines y cercanas */}
          {infoPlanB.plan_b.grupos.areas_cercanas && infoPlanB.plan_b.grupos.areas_cercanas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span>🎯</span>
                <h4>Áreas afines y cercanas</h4>
                <span className="text-xs font-normal text-text-muted">
                  (Roles en otros campos que comparten tus habilidades técnicas)
                </span>
              </div>
              <div className="space-y-3">
                {infoPlanB.plan_b.grupos.areas_cercanas.map((rec) => (
                  <TarjetaVacante
                    key={`planb-area-${rec.id}`}
                    rec={rec}
                    esPostulada={postuladasIds.has(rec.id)}
                    esKenti={rec.id === idVacanteKenti}
                    onPostular={handlePostular}
                    cargando={cargandoPostulacionId === rec.id}
                    confirmandoBajaAfinidad={confirmandoBajaAfinidadId === rec.id}
                    onIniciarConfirmacion={(id) => setConfirmandoBajaAfinidadId(id)}
                    onCancelarConfirmacion={() => setConfirmandoBajaAfinidadId(null)}
                    errorMsg={errorPostulacion?.vacanteId === rec.id ? errorPostulacion.mensaje : null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grupo 3: Casi cumples */}
          {infoPlanB.plan_b.grupos.casi_cumples && infoPlanB.plan_b.grupos.casi_cumples.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span>⚡</span>
                <h4>Casi cumples los requisitos</h4>
                <span className="text-xs font-normal text-text-muted">
                  (Vacantes donde solo te faltan 2 o menos habilidades)
                </span>
              </div>
              <div className="space-y-3">
                {infoPlanB.plan_b.grupos.casi_cumples.map((rec) => (
                  <TarjetaVacante
                    key={`planb-casi-${rec.id}`}
                    rec={rec}
                    esPostulada={postuladasIds.has(rec.id)}
                    esKenti={rec.id === idVacanteKenti}
                    onPostular={handlePostular}
                    cargando={cargandoPostulacionId === rec.id}
                    confirmandoBajaAfinidad={confirmandoBajaAfinidadId === rec.id}
                    onIniciarConfirmacion={(id) => setConfirmandoBajaAfinidadId(id)}
                    onCancelarConfirmacion={() => setConfirmandoBajaAfinidadId(null)}
                    errorMsg={errorPostulacion?.vacanteId === rec.id ? errorPostulacion.mensaje : null}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tarjeta Tu plan de mejora (Coaching con enlaces seguros) */}
      {infoPlanB?.coaching && infoPlanB.coaching.length > 0 && (
        <div
          id="seccion-plan-mejora"
          className="card p-6 space-y-4 border-surface-border bg-surface-card"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🚀</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-lg">Tu plan de mejora técnica</h3>
                <span className="chip-violet text-[10px]">Coaching sugerido</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Acciones basadas en las habilidades más pedidas en las vacantes analizadas para potenciar tu perfil:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {infoPlanB.coaching.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-surface-border bg-surface-elevated/70 p-4 flex flex-col justify-between space-y-3 transition-colors hover:border-accent/40"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip-violet text-[10px] font-bold uppercase tracking-wider">
                      {item.habilidad}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">#{idx + 1}</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">{item.accion}</p>
                </div>

                <a
                  href={item.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 hover:text-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={`Buscar cursos gratuitos de ${item.habilidad} en Google`}
                >
                  <span>Buscar curso gratis</span>
                  <span aria-hidden="true" className="text-[11px]">↗</span>
                </a>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-muted pt-2 border-t border-surface-border/60">
            ℹ️ <em>Búsquedas seguras:</em> Los enlaces te dirigen a consultas preconfiguradas en Google para encontrar tutoriales y cursos gratuitos de cada habilidad.
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          id="btn-otro-cv"
          type="button"
          className="btn-secondary flex-1 py-3"
          onClick={onOtroCv}
        >
          ← Pegar otro CV
        </button>
        <button
          id="btn-ver-tablero"
          type="button"
          className="btn-primary flex-1 py-3"
          onClick={onVerTablero}
        >
          Ver tablero →
        </button>
      </div>
    </div>
  );
}
