"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGetPostulaciones, apiPatchEstado, Postulacion } from "@/lib/api";
import SimuladorEntrevista from "@/components/SimuladorEntrevista";

// ─── Tipos y constantes ───────────────────────────────────────────────────

type Estado = "postulado" | "en_revision" | "entrevista" | "descartado";

const COLUMNAS: Array<{ id: Estado; label: string; emoji: string; color: string }> = [
  { id: "postulado",   label: "Postulado",   emoji: "📤", color: "border-violet-700/40" },
  { id: "en_revision", label: "En revisión", emoji: "🔍", color: "border-blue-700/40"   },
  { id: "entrevista",  label: "Entrevista",  emoji: "🎤", color: "border-green-700/40"  },
  { id: "descartado",  label: "Descartado",  emoji: "❌", color: "border-red-700/40"    },
];

function formatSalario(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── Tarjeta Kanban Activa ────────────────────────────────────────────────

function KanbanCard({
  post,
  index = 0,
  onRetirar,
  onPracticarEntrevista,
}: {
  post: Postulacion;
  index?: number;
  onRetirar: (id: number) => Promise<void> | void;
  onPracticarEntrevista?: (post: Postulacion) => void;
}) {
  const [confirmandoRetiro, setConfirmandoRetiro] = useState(false);
  const [retirando, setRetirando] = useState(false);

  return (
    <div
      id={`card-post-${post.id}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className={[
        "kanban-card cursor-default animate-slide-up motion-reduce:animate-none transition-all duration-300",
        retirando ? "opacity-40 scale-95" : "opacity-100 scale-100",
      ].join(" ")}
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

      {/* Nota de la empresa si existe */}
      {post.nota_empresa && (
        <div className="mb-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-text-primary">
          <span className="font-semibold text-accent-light">Nota de la empresa: </span>
          <span>{post.nota_empresa}</span>
        </div>
      )}

      {/* Botón para practicar entrevista (solo en estado 'entrevista') */}
      {post.estado === "entrevista" && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => onPracticarEntrevista?.(post)}
            className="btn-primary text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
            title="Iniciar práctica de entrevista con feedback de IA"
          >
            <span aria-hidden="true">🎤</span>
            <span>Practicar entrevista</span>
          </button>
        </div>
      )}

      {/* Retirar postulación con confirmación */}
      <div className="mt-2 pt-2 border-t border-surface-border/50">
        {confirmandoRetiro ? (
          <div
            role="alert"
            className="rounded-lg border border-status-warning/40 bg-surface-elevated p-2 text-xs space-y-2 animate-fade-in"
          >
            <p className="text-text-primary font-medium">
              ¿Seguro que deseas retirar esta postulación?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                id={`btn-confirmar-retirar-${post.id}`}
                className="btn-ghost text-xs px-2 py-1 text-status-error hover:bg-status-error/10 font-semibold"
                disabled={retirando}
                onClick={async () => {
                  setRetirando(true);
                  try {
                    await onRetirar(post.id);
                  } finally {
                    setRetirando(false);
                    setConfirmandoRetiro(false);
                  }
                }}
              >
                {retirando ? "Retirando…" : "Sí, retirar"}
              </button>
              <button
                type="button"
                id={`btn-cancelar-retirar-${post.id}`}
                className="btn-ghost text-xs px-2 py-1 text-text-secondary"
                disabled={retirando}
                onClick={() => setConfirmandoRetiro(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            id={`btn-iniciar-retirar-${post.id}`}
            onClick={() => setConfirmandoRetiro(true)}
            className="btn-ghost text-xs text-text-muted hover:text-status-error w-full py-1 text-center transition-colors"
            title="Retirar esta postulación"
          >
            Retirar postulación
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta Archivada / Retirada ─────────────────────────────────────────

function TarjetaArchivada({ post }: { post: Postulacion }) {
  return (
    <div
      id={`card-archivada-${post.id}`}
      className="rounded-xl border border-surface-border bg-surface/50 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-sm text-text-primary leading-snug">{post.vacante}</p>
          {post.empresa && (
            <p className="text-xs text-text-secondary mt-0.5">{post.empresa}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-surface-border px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
          📁 Retirada
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mb-2">
        {post.modalidad && <span className="capitalize">🏠 {post.modalidad}</span>}
        {(post.salario_min || post.salario_max) && (
          <span>
            💰{" "}
            {[formatSalario(post.salario_min), formatSalario(post.salario_max)]
              .filter(Boolean)
              .join("–")}
          </span>
        )}
        {post.afinidad != null && (
          <span className="text-text-muted">⭐ {post.afinidad}% afinidad</span>
        )}
      </div>

      {post.nota_empresa && (
        <div className="mb-2 rounded-lg border border-surface-border bg-surface/30 px-2.5 py-1.5 text-xs text-text-muted truncate">
          <span>Nota empresa: </span>
          <span>{post.nota_empresa}</span>
        </div>
      )}

      {post.siguiente_paso && (
        <div className="rounded-lg border border-surface-border bg-surface/30 px-2.5 py-1.5 text-xs text-text-muted truncate">
          <span>Último paso registrado: </span>
          <span>{post.siguiente_paso}</span>
        </div>
      )}
    </div>
  );
}

// ─── Columna Kanban ───────────────────────────────────────────────────────

function KanbanColumna({
  col,
  postulaciones,
  onRetirar,
  onPracticarEntrevista,
}: {
  col: (typeof COLUMNAS)[0];
  postulaciones: Postulacion[];
  onRetirar: (id: number) => Promise<void> | void;
  onPracticarEntrevista?: (post: Postulacion) => void;
}) {
  return (
    <div
      id={`col-${col.id}`}
      className={`kanban-col ${col.color} flex-1 min-w-[220px]`}
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
          {postulaciones.map((p, idx) => (
            <KanbanCard
              key={p.id}
              post={p}
              index={idx}
              onRetirar={onRetirar}
              onPracticarEntrevista={onPracticarEntrevista}
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
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [postulacionSimulando, setPostulacionSimulando] = useState<Postulacion | null>(null);
  const avisoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seccionArchivadasRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (verArchivadas && seccionArchivadasRef.current) {
      seccionArchivadasRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [verArchivadas]);

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

  async function retirarPostulacion(id: number) {
    const original = postulaciones.find((p) => p.id === id);
    if (!original || original.estado === "retirado") return;

    /* Actualización optimista */
    setPostulaciones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: "retirado" } : p))
    );

    try {
      await apiPatchEstado(id, "retirado");
      mostrarAviso(`Postulación a "${original.vacante}" retirada con éxito.`);
    } catch (err: unknown) {
      /* Revertir */
      setPostulaciones((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: original.estado } : p))
      );
      mostrarAviso(
        `⚠️ No se pudo retirar: ${err instanceof Error ? err.message : "error"}`
      );
    }
  }

  const activas = postulaciones.filter((p) => p.estado !== "retirado");
  const archivadas = postulaciones.filter((p) => p.estado === "retirado");

  /* Filtrado por texto */
  const activasFiltradas = activas.filter((p) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      p.vacante?.toLowerCase().includes(q) ||
      p.empresa?.toLowerCase().includes(q) ||
      p.modalidad?.toLowerCase().includes(q)
    );
  });

  const archivadasFiltradas = archivadas.filter((p) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      p.vacante?.toLowerCase().includes(q) ||
      p.empresa?.toLowerCase().includes(q) ||
      p.modalidad?.toLowerCase().includes(q)
    );
  });

  /* Agrupadas por columna (solo activas) */
  const porColumna = (id: Estado) => activasFiltradas.filter((p) => p.estado === id);

  return (
    <div className="animate-slide-up mx-auto w-full max-w-7xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Tablero de postulaciones</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Consulta el avance de tus postulaciones y los comentarios de las empresas.
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

      {/* Buscador y switch de archivadas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          id="tablero-buscar"
          type="search"
          className="input max-w-sm"
          placeholder="Buscar por vacante, empresa o modalidad…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

        <button
          id="btn-toggle-archivadas"
          type="button"
          onClick={() => setVerArchivadas((v) => !v)}
          aria-pressed={verArchivadas}
          className={`btn-ghost text-xs flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
            verArchivadas
              ? "border-accent text-accent-light bg-accent/10"
              : "border-surface-border text-text-secondary hover:text-text-primary"
          }`}
          title={verArchivadas ? "Ocultar sección de archivadas" : "Mostrar postulaciones retiradas"}
        >
          <span>{verArchivadas ? "👁️ Ocultar archivadas" : "📁 Ver archivadas"}</span>
          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] font-bold text-text-muted">
            {archivadas.length}
          </span>
        </button>
      </div>

      {/* Sección de archivadas / retiradas */}
      {verArchivadas && (
        <section
          ref={seccionArchivadasRef}
          id="seccion-postulaciones-archivadas"
          aria-label="Postulaciones archivadas"
          className="rounded-2xl border border-surface-border bg-surface-elevated/40 p-5 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📁</span>
              <h3 className="text-base font-semibold text-text-primary">
                Postulaciones archivadas
              </h3>
              <span className="rounded-full bg-surface-border/50 px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                {archivadas.length}
              </span>
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Postulaciones retiradas. Ya no pueden reactivarse.
            </p>
          </div>

          {archivadasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-border p-6 text-center text-xs text-text-muted">
              {archivadas.length === 0
                ? "No tienes ninguna postulación archivada."
                : "No hay postulaciones archivadas que coincidan con la búsqueda."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivadasFiltradas.map((p) => (
                <TarjetaArchivada key={p.id} post={p} />
              ))}
            </div>
          )}
        </section>
      )}

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
              Analiza tu perfil para recibir recomendaciones y registrar tus postulaciones en el tablero.
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

      {/* Tablero (columnas activas) */}
      {!loading && postulaciones.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNAS.map((col) => (
            <KanbanColumna
              key={col.id}
              col={col}
              postulaciones={porColumna(col.id)}
              onRetirar={retirarPostulacion}
              onPracticarEntrevista={(post) => setPostulacionSimulando(post)}
            />
          ))}
        </div>
      )}

      {/* Modal Simulador de Entrevista */}
      {postulacionSimulando && (
        <SimuladorEntrevista
          postulacionId={postulacionSimulando.id}
          vacanteTitulo={postulacionSimulando.vacante}
          empresa={postulacionSimulando.empresa}
          onClose={() => setPostulacionSimulando(null)}
        />
      )}

      {/* Nota informativa */}
      <p className="text-center text-xs text-text-muted pb-4">
        Las empresas actualizan el estado de tus postulaciones. Puedes retirar cualquier postulación si ya no deseas continuar en el proceso.
      </p>
    </div>
  );
}
