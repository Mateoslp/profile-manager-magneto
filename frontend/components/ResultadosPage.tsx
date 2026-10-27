"use client";

import { useEffect, useRef, useState } from "react";
import { MensajeAgente, Perfil, Recomendacion, ResultadoProcesar } from "@/lib/api";

// ─── Helpers ───────────────────────────────────────────────────────────────

const AGENT_COLORS: Record<string, string> = {
  Lexi:  "#a78bfa",
  Inari: "#34d399",
  Kenti: "#fbbf24",
  Iris:  "#60a5fa",
};

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  info:     { label: "Info",     cls: "chip-violet" },
  alerta:   { label: "Alerta",   cls: "chip-yellow" },
  decision: { label: "Decisión", cls: "chip bg-orange-900/40 text-orange-300 border border-orange-800/50" },
};

function formatSalario(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

// ─── Tarjeta de perfil ────────────────────────────────────────────────────

const PERFIL_CAMPOS: Array<{ key: keyof Perfil; label: string; format?: (v: unknown) => string }> = [
  { key: "nombre",            label: "Nombre" },
  { key: "email",             label: "Email" },
  { key: "telefono",          label: "Teléfono" },
  { key: "ubicacion",         label: "Ubicación" },
  { key: "experiencia_anios", label: "Experiencia", format: (v) => v ? `${v} años` : "" },
  { key: "educacion",         label: "Educación" },
  { key: "aspiracion_salarial", label: "Aspiración salarial",
    format: (v) => v ? (formatSalario(v as number) ?? "") : "" },
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
          const valor = raw != null && raw !== ""
            ? (format ? format(raw) : String(raw))
            : null;
          return (
            <div key={key} className="rounded-xl border border-surface-border bg-surface-elevated px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
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

// ─── Conversación de agentes ──────────────────────────────────────────────

function BurbujaMensaje({ msg, visible }: { msg: MensajeAgente; visible: boolean }) {
  if (!visible) return null;
  const color = AGENT_COLORS[msg.agente] ?? "#9090b0";
  const badge = TIPO_BADGE[msg.tipo] ?? { label: msg.tipo, cls: "chip-gray" };
  const esRespaldo = msg.agente === "Iris" && (msg.datos as { origen?: string }).origen === "respaldo";

  return (
    <div className="animate-slide-in flex gap-3">
      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: `${color}22`, color, border: `1.5px solid ${color}66` }}
      >
        {msg.agente[0]}
      </div>

      {/* Burbuja */}
      <div className="flex-1 space-y-1.5">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold" style={{ color }}>
            {msg.agente}
          </span>
          <svg className="h-3 w-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-text-muted">{msg.para}</span>
          <span className={badge.cls}>{badge.label}</span>
          {esRespaldo && (
            <span className="chip bg-surface-elevated text-text-muted border border-surface-border text-[10px]">
              respuesta de respaldo
            </span>
          )}
        </div>
        {/* Texto */}
        <div className="rounded-xl rounded-tl-none border border-surface-border bg-surface-elevated px-4 py-3">
          <p className="text-sm leading-relaxed text-text-primary">{msg.texto}</p>
        </div>
      </div>
    </div>
  );
}

function ConversacionAgentes({ mensajes }: { mensajes: MensajeAgente[] }) {
  const [visibles, setVisibles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function iniciarAnimacion() {
    setVisibles(0);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setVisibles(i);
      if (i >= mensajes.length && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 600);
  }

  useEffect(() => {
    iniciarAnimacion();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensajes]);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="font-semibold text-text-primary">Conversación de los agentes</h3>
        </div>
        <button
          id="btn-repetir-animacion"
          type="button"
          className="btn-ghost text-xs"
          onClick={iniciarAnimacion}
        >
          ↺ Repetir
        </button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {mensajes.map((msg, idx) => (
          <BurbujaMensaje key={idx} msg={msg} visible={idx < visibles} />
        ))}
      </div>
    </div>
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
          cx="30" cy="30" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
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
        "card p-5 space-y-4 transition-all",
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

  return (
    <div className="animate-slide-up mx-auto w-full max-w-4xl space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Resultados del análisis</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Así interpretaron tu CV los cuatro agentes de LIKAI.
        </p>
      </div>

      {/* Perfil */}
      <TarjetaPerfil perfil={perfil} />

      {/* Conversación */}
      {mensajes.length > 0 && <ConversacionAgentes mensajes={mensajes} />}

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
