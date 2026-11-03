"use client";

import { MensajeAgente, Perfil, Recomendacion, ResultadoProcesar } from "@/lib/api";
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
}: {
  rec: Recomendacion;
  esPostulada: boolean;
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
              <span className="chip-violet text-[11px]">✓ Postulada (simulación)</span>
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
    </div>
  );
}

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
  const { perfil, recomendaciones, mensajes, mensaje_seguimiento, postulacion_id } = resultado;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="animate-slide-up motion-reduce:animate-none mx-auto w-full max-w-4xl space-y-8">
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
        <div className="flex items-center gap-2">
          <span className="text-xl">💼</span>
          <h3 className="font-semibold text-text-primary">Vacantes recomendadas</h3>
        </div>

        {recomendaciones.length === 0 ? (
          <div className="alert-info">
            <span>ℹ️</span>
            <p>No se encontraron vacantes disponibles para analizar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recomendaciones.map((rec) => (
              <TarjetaVacante
                key={rec.id}
                rec={rec}
                esPostulada={postulacion_id !== null && rec.id === recomendaciones[0]?.id}
              />
            ))}
          </div>
        )}

        {/* Aviso si no se postuló */}
        {postulacion_id === null && (
          <div className="alert-warning">
            <span>⚠️</span>
            <div>
              <p className="font-medium">No se realizó ninguna postulación</p>
              <p className="text-xs mt-0.5 opacity-80">
                El puntaje de coincidencia con las vacantes disponibles no alcanzó el umbral mínimo.
                Iris evaluó los resultados y preparó una recomendación de mejora para tu perfil.
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
                  ? "Orientación para la postulación (simulación)"
                  : "Recomendaciones de mejora"}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-text-primary">{mensaje_seguimiento}</p>
          {postulacion_id !== null && (
            <p className="mt-3 text-xs text-text-muted italic">
              Recuerda que esta es una postulación simulada; no hay un proceso real de selección detrás.
            </p>
          )}
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
