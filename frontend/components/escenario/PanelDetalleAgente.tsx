"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MensajeAgente } from "@/lib/api";
import AgenteSvg, { AGENTES_META, AgenteNombre } from "./AgenteSvg";
import {
  DESCRIPCIONES_AGENTES,
  esOrigenRespaldo,
  evaluarParticipacionKenti,
  formatearDatosMensaje,
  nombreVisibleNodo,
  obtenerInfoTipo,
  resolverNodo,
} from "./mensajesUtils";

export interface PanelDetalleAgenteProps {
  agente: AgenteNombre | null;
  mensajes: MensajeAgente[];
  postulacionId?: number | null;
  onClose: () => void;
}

const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PanelDetalleAgente({
  agente,
  mensajes,
  postulacionId,
  onClose,
}: PanelDetalleAgenteProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cerrarBtnRef = useRef<HTMLButtonElement | null>(null);
  const focoPrevioRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const abierto = agente !== null;

  // Gestión de foco, atrapado global de teclado (Tab / Escape), bloqueo de scroll y retorno del foco al cerrar
  useEffect(() => {
    if (!abierto) return;

    focoPrevioRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const rafFocus = requestAnimationFrame(() => {
      cerrarBtnRef.current?.focus();
    });

    function manejarKeyDownGlobal(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const enfocables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
        );
        if (enfocables.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const primero = enfocables[0];
        const ultimo = enfocables[enfocables.length - 1];
        const activo = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!activo || activo === primero || !dialogRef.current.contains(activo)) {
            e.preventDefault();
            ultimo.focus();
          }
        } else {
          if (!activo || activo === ultimo || !dialogRef.current.contains(activo)) {
            e.preventDefault();
            primero.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", manejarKeyDownGlobal, true);

    return () => {
      cancelAnimationFrame(rafFocus);
      document.removeEventListener("keydown", manejarKeyDownGlobal, true);
      document.body.style.overflow = prevOverflow;
      const elementoAnterior = focoPrevioRef.current;
      if (elementoAnterior && typeof elementoAnterior.focus === "function") {
        requestAnimationFrame(() => {
          elementoAnterior.focus();
        });
      }
    };
  }, [abierto]);

  // Filtrar mensajes reales emitidos por este agente (sin distinguir mayúsculas)
  const mensajesDelAgente = useMemo(() => {
    if (!agente) return [];
    const objetivo = resolverNodo(agente);
    return mensajes.filter((m) => resolverNodo(m.agente) === objetivo);
  }, [agente, mensajes]);

  const { kentiNoPostulo, razonNoPostulo } = useMemo(
    () => evaluarParticipacionKenti(mensajes, postulacionId),
    [mensajes, postulacionId]
  );

  if (!agente || typeof document === "undefined") return null;

  const meta = AGENTES_META[agente];
  const descripcion = DESCRIPCIONES_AGENTES[agente];
  const esKentiSinPostulacion = agente === "Kenti" && kentiNoPostulo;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/65 backdrop-blur-xs animate-fade-in motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* En móvil (< md): hoja inferior; en escritorio (>= md): panel lateral derecho */}
      <div
        ref={dialogRef}
        id="panel-detalle-agente"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-agente-titulo"
        aria-describedby="panel-agente-descripcion"
        tabIndex={-1}
        className={[
          "relative flex w-full flex-col bg-surface-card text-text-primary shadow-card outline-none",
          "max-h-[85vh] rounded-t-3xl border-t border-surface-border",
          "md:h-full md:max-h-screen md:max-w-md md:rounded-none md:rounded-l-3xl md:border-t-0 md:border-l",
          "animate-slide-up motion-reduce:animate-none",
        ].join(" ")}
      >
        {/* Indicador superior tipo hoja inferior en móvil */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-surface-border md:hidden"
        />

        {/* Cabecera del agente */}
        <div className="flex items-start justify-between gap-4 border-b border-surface-border p-5 sm:p-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <AgenteSvg
              agente={agente}
              estado="reposo"
              atenuado={esKentiSinPostulacion}
              size={64}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="panel-agente-titulo"
                  className="text-lg font-bold leading-tight"
                  style={{ color: meta.color }}
                >
                  {meta.nombre}
                </h3>
                <span className="chip-gray text-[11px]">{meta.rol}</span>
                {esKentiSinPostulacion && (
                  <span className="chip-yellow text-[11px]">No postuló</span>
                )}
              </div>
              <p
                id="panel-agente-descripcion"
                className="mt-1 text-sm text-text-secondary"
              >
                {meta.nombre} {descripcion.charAt(0).toLowerCase() + descripcion.slice(1)}
              </p>
            </div>
          </div>

          <button
            ref={cerrarBtnRef}
            id="btn-cerrar-panel-agente"
            type="button"
            onClick={onClose}
            aria-label={`Cerrar detalle de ${meta.nombre}`}
            className="btn-ghost shrink-0 rounded-xl p-2 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Cuerpo desplazable: mensajes emitidos y sus datos legibles */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Mensajes emitidos ({mensajesDelAgente.length})
            </h4>
          </div>

          {mensajesDelAgente.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-elevated p-4 space-y-2">
              {esKentiSinPostulacion ? (
                <>
                  <p className="text-sm font-medium text-text-primary">
                    No postuló
                  </p>
                  {razonNoPostulo && (
                    <p className="text-xs leading-relaxed text-text-secondary">
                      {razonNoPostulo}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-text-secondary">
                  Este agente no emitió mensajes en este análisis.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mensajesDelAgente.map((msg, idx) => {
                const infoTipo = obtenerInfoTipo(msg.tipo);
                const mostrarRespaldo = esOrigenRespaldo(msg.datos);
                const emisorTxt = nombreVisibleNodo(msg.agente);
                const receptorTxt = nombreVisibleNodo(msg.para);
                const paresDatos = formatearDatosMensaje(msg.datos);

                return (
                  <article
                    key={idx}
                    className="rounded-2xl border border-surface-border bg-surface-elevated p-4 space-y-3"
                  >
                    {/* Ruta y etiquetas */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-bold"
                        style={{ color: meta.color }}
                      >
                        {emisorTxt} → {receptorTxt}
                      </span>
                      <span className={infoTipo.clase}>{infoTipo.etiqueta}</span>
                      {mostrarRespaldo && (
                        <span className="chip bg-surface-card text-text-muted border border-surface-border text-[11px]">
                          Respuesta de respaldo
                        </span>
                      )}
                    </div>

                    {/* Texto real */}
                    <p className="text-sm leading-relaxed text-text-primary">
                      {msg.texto}
                    </p>

                    {/* Datos adicionales como pares clave-valor legibles */}
                    {paresDatos.length > 0 && (
                      <div className="border-t border-surface-border pt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                          Detalles registrados
                        </p>
                        <dl className="grid grid-cols-1 gap-2">
                          {paresDatos.map((par) => (
                            <div
                              key={par.clave}
                              className="flex flex-col gap-0.5 rounded-xl border border-surface-border/70 bg-surface-card/70 px-3 py-2"
                            >
                              <dt className="text-[11px] font-medium text-text-muted">
                                {par.etiqueta}
                              </dt>
                              <dd className="text-xs text-text-primary break-words">
                                {par.valor}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie del panel */}
        <div className="border-t border-surface-border p-4 sm:px-6">
          <button
            id="btn-cerrar-panel-pie"
            type="button"
            onClick={onClose}
            className="btn-secondary w-full py-2.5 text-xs"
          >
            Cerrar panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
