"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGetPostulaciones, apiPatchEstado, Postulacion } from "@/lib/api";

// ─── Tipos y constantes ───────────────────────────────────────────────────

type Estado = "postulado" | "en_revision" | "entrevista" | "descartado";

const COLUMNAS: Array<{ id: Estado; label: string; emoji: string; color: string }> = [
  { id: "postulado",   label: "Postulado",   emoji: "📤", color: "border-violet-700/40" },
  { id: "en_revision", label: "En revisión", emoji: "🔍", color: "border-blue-700/40"   },
  { id: "entrevista",  label: "Entrevista",  emoji: "🎤", color: "border-green-700/40"  },
  { id: "descartado",  label: "Descartado",  emoji: "❌", color: "border-red-700/40"    },
];

const ORDEN_ESTADOS = COLUMNAS.map((c) => c.id);

function formatSalario(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── Tarjeta Kanban ───────────────────────────────────────────────────────

function KanbanCard({
  post,
  onMover,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  post: Postulacion;
  onMover: (id: number, estado: Estado) => void;
  isDragging: boolean;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
}) {
  const idx    = ORDEN_ESTADOS.indexOf(post.estado as Estado);
  const puedePrev = idx > 0;
  const puedeNext = idx < ORDEN_ESTADOS.length - 1;

  return (
    <div
      id={`card-post-${post.id}`}
      className={`kanban-card ${isDragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("postulacion_id", String(post.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart(post.id);
      }}
      onDragEnd={onDragEnd}
    >
      {/* Vacante y empresa */}
      <div className="mb-3">
        <p className="font-semibold text-sm text-text-primary leading-snug">{post.vacante}</p>
        {post.empresa && (
          <p className="text-xs text-text-secondary mt-0.5">{post.empresa}</p>
        )}
      </div>

      {/* Detalles */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mb-3">
        {post.modalidad && (
          <span className="capitalize">🏠 {post.modalidad}</span>
        )}
        {(post.salario_min || post.salario_max) && (
          <span>
            💰{" "}
            {[formatSalario(post.salario_min), formatSalario(post.salario_max)]
              .filter(Boolean)
              .join("–")}
          </span>
        )}
        {post.afinidad != null && (
          <span
            className={
              post.afinidad >= 70
                ? "text-status-success"
                : post.afinidad >= 45
                ? "text-status-warning"
                : "text-status-error"
            }
          >
            ⭐ {post.afinidad}% afinidad
          </span>
        )}
      </div>

      {/* Siguiente paso */}
      {post.siguiente_paso && (
        <div className="mb-3 rounded-lg border border-surface-border bg-surface/60 px-3 py-2 text-xs text-text-secondary leading-relaxed">
          <span className="font-medium text-accent-light">Próximo paso: </span>
          {post.siguiente_paso.length > 120
            ? post.siguiente_paso.slice(0, 117) + "…"
            : post.siguiente_paso}
        </div>
      )}

      {/* Botones de movimiento (accesibilidad y mobile) */}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          aria-label="Mover al estado anterior"
          className="btn-ghost text-xs px-2 py-1 flex-1"
          disabled={!puedePrev}
          onClick={() => onMover(post.id, ORDEN_ESTADOS[idx - 1])}
        >
          ← Anterior
        </button>
        <button
          type="button"
          aria-label="Mover al siguiente estado"
          className="btn-ghost text-xs px-2 py-1 flex-1"
          disabled={!puedeNext}
          onClick={() => onMover(post.id, ORDEN_ESTADOS[idx + 1])}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ─── Columna Kanban ───────────────────────────────────────────────────────

function KanbanColumna({
  col,
  postulaciones,
  onMover,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  col: (typeof COLUMNAS)[0];
  postulaciones: Postulacion[];
  onMover: (id: number, estado: Estado) => void;
  draggingId: number | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const id = Number(e.dataTransfer.getData("postulacion_id"));
    if (id) onMover(id, col.id);
  }

  return (
    <div
      id={`col-${col.id}`}
      className={`kanban-col ${col.color} ${dragOver ? "drag-over" : ""} flex-1 min-w-[220px]`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{col.emoji}</span>
          <span className="text-sm font-semibold text-text-primary">{col.label}</span>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated text-[11px] font-bold text-text-secondary">
          {postulaciones.length}
        </span>
      </div>

      {/* Tarjetas */}
      {postulaciones.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-surface-border py-8 text-center">
          <p className="text-xs text-text-muted">Sin postulaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {postulaciones.map((p) => (
            <KanbanCard
              key={p.id}
              post={p}
              onMover={onMover}
              isDragging={draggingId === p.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tablero principal ────────────────────────────────────────────────────

interface KanbanPageProps {
  onVolverResultados: () => void;
}

export default function KanbanPage({ onVolverResultados }: KanbanPageProps) {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [aviso,   setAviso]   = useState<string | null>(null);
  const [filtro,  setFiltro]  = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const avisoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mostrarAviso(msg: string) {
    setAviso(msg);
    if (avisoClearRef.current) clearTimeout(avisoClearRef.current);
    avisoClearRef.current = setTimeout(() => setAviso(null), 4000);
  }

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetPostulaciones();
      setPostulaciones(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar postulaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    return () => { if (avisoClearRef.current) clearTimeout(avisoClearRef.current); };
  }, [cargar]);

  async function moverPostulacion(id: number, nuevoEstado: Estado) {
    const original = postulaciones.find((p) => p.id === id);
    if (!original || original.estado === nuevoEstado) return;

    /* Actualización optimista */
    setPostulaciones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
    );

    try {
      await apiPatchEstado(id, nuevoEstado);
      mostrarAviso(`Postulación movida a "${COLUMNAS.find(c => c.id === nuevoEstado)?.label}"`);
    } catch (err: unknown) {
      /* Revertir */
      setPostulaciones((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: original.estado } : p))
      );
      mostrarAviso(
        `⚠️ No se pudo mover: ${err instanceof Error ? err.message : "error"}`
      );
    }
  }

  /* Filtrado por texto */
  const filtradas = postulaciones.filter((p) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      p.vacante?.toLowerCase().includes(q) ||
      p.empresa?.toLowerCase().includes(q) ||
      p.modalidad?.toLowerCase().includes(q)
    );
  });

  /* Agrupadas por columna */
  const porColumna = (id: Estado) => filtradas.filter((p) => p.estado === id);

  return (
    <div className="animate-slide-up mx-auto w-full max-w-7xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Tablero de postulaciones</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Arrastra las tarjetas entre columnas para actualizar el estado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-recargar-tablero"
            type="button"
            className="btn-ghost text-xs"
            onClick={cargar}
            disabled={loading}
          >
            ↺ Recargar
          </button>
          <button
            id="btn-volver-resultados"
            type="button"
            className="btn-secondary text-xs"
            onClick={onVolverResultados}
          >
            ← Resultados
          </button>
        </div>
      </div>

      {/* Buscador */}
      <input
        id="tablero-buscar"
        type="search"
        className="input max-w-sm"
        placeholder="Buscar por vacante, empresa o modalidad…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      {/* Aviso temporal */}
      {aviso && (
        <div
          className={`alert ${aviso.startsWith("⚠️") ? "alert-warning" : "alert-success"} animate-fade-in`}
        >
          <span>{aviso.startsWith("⚠️") ? "⚠️" : "✅"}</span>
          <span>{aviso.replace(/^⚠️\s*/, "")}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert-error">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-surface-border border-t-accent animate-spin" />
            <p className="text-sm text-text-secondary">Cargando postulaciones…</p>
          </div>
        </div>
      )}

      {/* Estado vacío total */}
      {!loading && !error && postulaciones.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <span className="text-6xl">📋</span>
          <div>
            <p className="text-lg font-semibold text-text-primary">Sin postulaciones aún</p>
            <p className="mt-1 text-sm text-text-secondary max-w-sm">
              Analiza tu CV y si tu puntaje supera el umbral, Kenti registrará
              una postulación simulada que aparecerá aquí.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={onVolverResultados}
          >
            Ir a analizar CV
          </button>
        </div>
      )}

      {/* Tablero */}
      {!loading && postulaciones.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNAS.map((col) => (
            <KanbanColumna
              key={col.id}
              col={col}
              postulaciones={porColumna(col.id)}
              onMover={moverPostulacion}
              draggingId={dragging}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
            />
          ))}
        </div>
      )}

      {/* Nota de simulación */}
      <p className="text-center text-xs text-text-muted pb-4">
        Las postulaciones en este tablero son simulaciones de un proceso de selección.
        Puedes mover las tarjetas para practicar cómo funcionaría el seguimiento.
      </p>
    </div>
  );
}
