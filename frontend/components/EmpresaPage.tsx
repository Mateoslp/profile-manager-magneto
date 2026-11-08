"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiGetPostulacionesEmpresa,
  apiPatchPostulacionEmpresa,
  PostulacionEmpresa,
} from "@/lib/api";

const ESTADOS_PERMITIDOS: Array<{
  id: "en_revision" | "entrevista" | "descartado";
  label: string;
}> = [
  { id: "en_revision", label: "En revisión" },
  { id: "entrevista",  label: "Entrevista"  },
  { id: "descartado",  label: "Descartado"  },
];

interface TarjetaEmpresaProps {
  post: PostulacionEmpresa;
  onActualizado: (
    id: number,
    nuevoEstado: "en_revision" | "entrevista" | "descartado",
    nuevaNota: string
  ) => void;
}

function TarjetaEmpresa({ post, onActualizado }: TarjetaEmpresaProps) {
  const esRetirada = post.estado === "retirado";

  const [estado, setEstado] = useState<"en_revision" | "entrevista" | "descartado">(
    post.estado === "en_revision" || post.estado === "entrevista" || post.estado === "descartado"
      ? post.estado
      : "en_revision"
  );
  const [nota, setNota] = useState(post.nota_empresa ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    setExito(false);
    try {
      await apiPatchPostulacionEmpresa(post.id, {
        estado,
        nota: nota.trim(),
      });
      setExito(true);
      onActualizado(post.id, estado, nota.trim());
      setTimeout(() => setExito(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const afinidad = post.afinidad ?? 0;
  const afinidadColor =
    afinidad >= 70
      ? "bg-status-success text-status-success"
      : afinidad >= 45
      ? "bg-status-warning text-status-warning"
      : "bg-status-error text-status-error";

  return (
    <div
      id={`postulacion-empresa-${post.id}`}
      className="card p-5 transition-all hover:border-surface-border/80 flex flex-col justify-between"
    >
      <div>
        {/* Cabecera del candidato */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="font-semibold text-base text-text-primary">
              {post.candidato.nombre}
            </h4>
            {post.candidato.ubicacion && (
              <p className="text-xs text-text-secondary mt-0.5">
                📍 {post.candidato.ubicacion}
              </p>
            )}
          </div>

          {esRetirada ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-surface-border px-2.5 py-1 text-xs font-semibold text-text-muted">
              Retirada por el candidato
            </span>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                post.estado === "entrevista"
                  ? "bg-status-success/20 text-status-success border border-status-success/40"
                  : post.estado === "descartado"
                  ? "bg-status-error/20 text-status-error border border-status-error/40"
                  : "bg-status-info/20 text-status-info border border-status-info/40"
              }`}
            >
              {post.estado === "en_revision" ? "En revisión" : post.estado}
            </span>
          )}
        </div>

        {/* Datos permitidos del perfil */}
        <div className="space-y-1.5 text-xs text-text-secondary mb-4">
          {post.candidato.experiencia_anios != null && (
            <p>
              💼 <span className="text-text-primary">{post.candidato.experiencia_anios}</span> años de experiencia
            </p>
          )}
          {post.candidato.educacion && (
            <p>
              🎓 <span className="text-text-primary">{post.candidato.educacion}</span>
            </p>
          )}
          {post.candidato.habilidades && (
            <p className="line-clamp-2">
              🛠️ <span className="text-text-primary">{post.candidato.habilidades}</span>
            </p>
          )}
        </div>

        {/* Barra de afinidad */}
        <div className="mb-4 rounded-xl border border-surface-border bg-surface-elevated/60 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-text-secondary">Afinidad técnica</span>
            <span className="font-bold text-text-primary">{afinidad}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${afinidadColor.split(" ")[0]}`}
              style={{ width: `${Math.min(100, Math.max(0, afinidad))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controles para empresa */}
      {esRetirada ? (
        <div className="mt-2 rounded-xl border border-surface-border bg-surface-elevated/40 p-3 text-xs text-text-muted">
          Esta postulación fue retirada por el candidato. No se puede modificar su estado ni nota.
          {post.nota_empresa && (
            <p className="mt-2 text-text-secondary">
              <span className="font-medium">Última nota guardada:</span> {post.nota_empresa}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-3 pt-3 border-t border-surface-border/60">
          {/* Selector de estado */}
          <div>
            <label
              htmlFor={`select-estado-${post.id}`}
              className="label"
            >
              Estado de postulación
            </label>
            <select
              id={`select-estado-${post.id}`}
              className="input py-2 text-xs"
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value as "en_revision" | "entrevista" | "descartado")
              }
            >
              {ESTADOS_PERMITIDOS.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          {/* Caja de nota */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`nota-empresa-${post.id}`}
                className="label mb-0"
              >
                Nota para el candidato
              </label>
              <span className="text-[10px] text-text-muted">
                {nota.length}/1000
              </span>
            </div>
            <textarea
              id={`nota-empresa-${post.id}`}
              rows={2}
              maxLength={1000}
              className="textarea py-2 text-xs"
              placeholder="Deja una nota interna o actualización sobre el proceso…"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {/* Feedback de error o éxito */}
          {error && <p className="text-xs text-status-error">{error}</p>}
          {exito && <p className="text-xs text-status-success">✓ Guardado y notificado al candidato</p>}

          {/* Botón Guardar */}
          <button
            id={`btn-guardar-postulacion-${post.id}`}
            type="button"
            className="btn-primary text-xs w-full py-2"
            disabled={guardando}
            onClick={handleGuardar}
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function EmpresaPage() {
  const [postulaciones, setPostulaciones] = useState<PostulacionEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetPostulacionesEmpresa();
      setPostulaciones(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar postulaciones de la empresa");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function handleActualizado(
    id: number,
    nuevoEstado: "en_revision" | "entrevista" | "descartado",
    nuevaNota: string
  ) {
    setPostulaciones((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, estado: nuevoEstado, nota_empresa: nuevaNota } : p
      )
    );
  }

  // Agrupar postulaciones por vacante
  const gruposVacantes = postulaciones.reduce<
    Record<number, { titulo: string; items: PostulacionEmpresa[] }>
  >((acc, p) => {
    const vId = p.vacante.id;
    if (!acc[vId]) {
      acc[vId] = {
        titulo: p.vacante.titulo,
        items: [],
      };
    }
    acc[vId].items.push(p);
    return acc;
  }, {});

  const vacantesList = Object.entries(gruposVacantes);

  return (
    <div className="animate-slide-up mx-auto w-full max-w-6xl space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-surface-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Panel de gestión para empresas
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Revisa las postulaciones a tus vacantes, actualiza su estado y comparte notas con los candidatos.
          </p>
        </div>
        <button
          id="btn-recargar-empresa"
          type="button"
          className="btn-secondary text-xs self-start sm:self-auto"
          onClick={cargar}
          disabled={loading}
        >
          ↺ Recargar postulaciones
        </button>
      </div>

      {/* Estados de carga y error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-surface-border border-t-accent animate-spin" />
            <p className="text-sm text-text-secondary">Cargando postulaciones de la empresa…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-error">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* Sin postulaciones */}
      {!loading && !error && postulaciones.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center rounded-2xl border border-dashed border-surface-border">
          <span className="text-5xl">🏢</span>
          <div>
            <p className="text-lg font-semibold text-text-primary">
              No tienes postulaciones activas
            </p>
            <p className="mt-1 text-sm text-text-secondary max-w-md">
              Aún no se registran postulaciones para las vacantes asignadas a tu cuenta de empresa.
            </p>
          </div>
        </div>
      )}

      {/* Listado agrupado por vacante */}
      {!loading && !error && vacantesList.length > 0 && (
        <div className="space-y-10">
          {vacantesList.map(([vacanteId, grupo]) => (
            <section
              key={vacanteId}
              id={`seccion-vacante-${vacanteId}`}
              className="space-y-4"
            >
              <div className="flex items-center justify-between border-b border-surface-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💼</span>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {grupo.titulo}
                  </h2>
                </div>
                <span className="rounded-full bg-surface-elevated border border-surface-border px-3 py-0.5 text-xs font-semibold text-text-secondary">
                  {grupo.items.length}{" "}
                  {grupo.items.length === 1 ? "postulación" : "postulaciones"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.items.map((post) => (
                  <TarjetaEmpresa
                    key={post.id}
                    post={post}
                    onActualizado={handleActualizado}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

