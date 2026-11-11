"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BotonDictado from "./BotonDictado";
import {
  FeedbackEntrevistaResponse,
  PreguntaEntrevista,
  apiGetPreguntasEntrevista,
  apiPostFeedbackEntrevista,
} from "@/lib/api";

export interface SimuladorEntrevistaProps {
  postulacionId: number;
  vacanteTitulo: string;
  empresa?: string | null;
  onClose: () => void;
}

export default function SimuladorEntrevista({
  postulacionId,
  vacanteTitulo,
  empresa,
  onClose,
}: SimuladorEntrevistaProps) {
  const [preguntas, setPreguntas] = useState<PreguntaEntrevista[]>([]);
  const [pasoActual, setPasoActual] = useState(0); // 0, 1, 2
  const [respuestas, setRespuestas] = useState({
    respuesta_1: "",
    respuesta_2: "",
    respuesta_3: "",
  });

  const [cargandoPreguntas, setCargandoPreguntas] = useState(true);
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [resultadoFeedback, setResultadoFeedback] =
    useState<FeedbackEntrevistaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const focoPrevioRef = useRef<HTMLElement | null>(null);
  const cerrarBtnRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Manejo de foco, Escape y bloqueo de scroll
  useEffect(() => {
    focoPrevioRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      cerrarBtnRef.current?.focus();
    });

    function manejarKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", manejarKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", manejarKeyDown);
      focoPrevioRef.current?.focus();
    };
  }, [onClose]);

  // Cargar las 3 preguntas
  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargandoPreguntas(true);
      setError(null);
      try {
        const data = await apiGetPreguntasEntrevista(postulacionId);
        if (!cancelado) {
          setPreguntas(data.preguntas);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar las preguntas"
          );
        }
      } finally {
        if (!cancelado) setCargandoPreguntas(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [postulacionId]);

  // Auto-foco en textarea al cambiar de pregunta
  useEffect(() => {
    if (!cargandoPreguntas && !resultadoFeedback) {
      textareaRef.current?.focus();
    }
  }, [pasoActual, cargandoPreguntas, resultadoFeedback]);

  const claveRespuesta = `respuesta_${pasoActual + 1}` as keyof typeof respuestas;
  const valorActual = respuestas[claveRespuesta];

  const handleCambioTexto = (texto: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [claveRespuesta]: texto,
    }));
  };

  const handleSiguiente = () => {
    if (pasoActual < preguntas.length - 1) {
      setPasoActual((prev) => prev + 1);
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual((prev) => prev - 1);
    }
  };

  const handleEnviarRespuestas = async () => {
    setEnviandoFeedback(true);
    setError(null);
    try {
      const resp = await apiPostFeedbackEntrevista(postulacionId, respuestas);
      setResultadoFeedback(resp);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al generar feedback de la entrevista"
      );
    } finally {
      setEnviandoFeedback(false);
    }
  };

  const handleReiniciar = () => {
    setPasoActual(0);
    setRespuestas({
      respuesta_1: "",
      respuesta_2: "",
      respuesta_3: "",
    });
    setResultadoFeedback(null);
    setError(null);
  };

  const preguntaActiva = preguntas[pasoActual];
  const puedeAvanzar = valorActual.trim().length >= 5;
  const todasRespondidas =
    respuestas.respuesta_1.trim().length >= 5 &&
    respuestas.respuesta_2.trim().length >= 5 &&
    respuestas.respuesta_3.trim().length >= 5;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulador-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface-card border-surface-border shadow-card overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-start justify-between p-5 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🎤</span>
              <h3 id="simulador-titulo" className="text-lg font-bold text-text-primary">
                Práctica de entrevista técnica
              </h3>
              <span className="chip-violet text-[10px]">Feedback con IA</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Vacante: <strong className="text-text-primary">{vacanteTitulo}</strong>
              {empresa && ` • ${empresa}`}
            </p>
          </div>
          <button
            ref={cerrarBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar práctica de entrevista"
            className="btn-ghost p-2 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* Banner informativo */}
        <div className="px-5 py-2.5 bg-surface-elevated/60 border-b border-surface-border/60 text-[11px] text-text-muted flex items-center gap-2">
          <span aria-hidden="true">💡</span>
          <span>
            Práctica de entrevista técnica con evaluación y feedback de IA en tiempo real.
          </span>
        </div>

        {/* Cuerpo */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {cargandoPreguntas ? (
            <div className="py-12 text-center space-y-3">
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-xs text-text-muted">Cargando preguntas de la vacante...</p>
            </div>
          ) : error && !resultadoFeedback ? (
            <div className="space-y-4 py-4">
              <div className="alert-error text-xs flex items-start gap-2">
                <span className="text-sm select-none" aria-hidden="true">❌</span>
                <div className="flex-1">
                  <p className="font-semibold">No se pudo completar la acción</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : resultadoFeedback ? (
            /* Vista de Feedback final */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-text-primary">
                    Evaluación y retroalimentación
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Revisa las sugerencias de mejora para cada una de tus respuestas:
                  </p>
                </div>
                {resultadoFeedback.origen === "respaldo" && (
                  <span className="chip-yellow text-[10px]">
                    Evaluación por reglas de respaldo
                  </span>
                )}
              </div>

              {/* Evaluación por cada pregunta */}
              <div className="space-y-3">
                {resultadoFeedback.feedback.evaluacion_respuestas.map((ev, i) => {
                  const preg = preguntas[i];
                  return (
                    <div
                      key={ev.id_pregunta}
                      className="rounded-xl border border-surface-border bg-surface-elevated/70 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary">
                          Pregunta {i + 1}: {preg ? preg.tipo : "Respuesta"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="chip-gray">Claridad: {ev.claridad}</span>
                          <span className="chip-violet">Pertinencia: {ev.pertinencia}</span>
                        </div>
                      </div>

                      {preg && (
                        <p className="text-xs text-text-muted italic leading-relaxed">
                          &ldquo;{preg.pregunta}&rdquo;
                        </p>
                      )}

                      <div className="rounded-lg bg-surface-card border border-surface-border/70 p-3">
                        <p className="text-xs font-medium text-accent-light">
                          💡 Aspecto por mejorar:
                        </p>
                        <p className="text-xs text-text-primary mt-1 leading-relaxed">
                          {ev.aspecto_a_mejorar}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comentario general */}
              <div className="card p-4 border-blue-300/70 bg-blue-50/80 dark:border-blue-800/30 dark:bg-blue-900/10 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Comentario general del entrevistador:
                </p>
                <p className="text-xs text-text-primary leading-relaxed">
                  {resultadoFeedback.feedback.comentario_general}
                </p>
              </div>

              {/* Botones de acción final */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-border flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReiniciar}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  🔄 Practicar de nuevo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary text-xs px-5 py-2"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* Vista de Pregunta interactiva (Paso a Paso) */
            <div className="space-y-4">
              {/* Barra de progreso */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>
                    Pregunta <strong>{pasoActual + 1}</strong> de {preguntas.length}
                  </span>
                  <span className="capitalize chip-gray text-[10px]">
                    {preguntaActiva?.tipo}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${((pasoActual + 1) / preguntas.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Enunciado de la pregunta */}
              <div className="rounded-xl border border-surface-border bg-surface-elevated/70 p-4">
                <h4 className="text-sm font-semibold text-text-primary leading-relaxed">
                  {preguntaActiva?.pregunta}
                </h4>
              </div>

              {/* Textarea de respuesta */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`textarea-pregunta-${pasoActual + 1}`}
                    className="text-xs font-medium text-text-secondary block"
                  >
                    Tu respuesta:
                  </label>
                  <BotonDictado
                    onTextoReconocido={(t) => {
                      const nuevo = valorActual ? `${valorActual} ${t}` : t;
                      handleCambioTexto(nuevo.slice(0, 1500));
                    }}
                    label="Dictar"
                  />
                </div>
                <textarea
                  id={`textarea-pregunta-${pasoActual + 1}`}
                  ref={textareaRef}
                  value={valorActual}
                  onChange={(e) => handleCambioTexto(e.target.value)}
                  placeholder="Escribe aquí tu respuesta como si estuvieras conversando con el entrevistador..."
                  rows={6}
                  maxLength={1500}
                  className="textarea w-full text-xs"
                />
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Mínimo 5 caracteres para avanzar</span>
                  <span>{valorActual.length} / 1500</span>
                </div>
              </div>

              {/* Error si ocurre durante el envío */}
              {error && (
                <div className="alert-error text-xs flex items-center gap-2">
                  <span>❌</span>
                  <p>{error}</p>
                </div>
              )}

              {/* Navegación */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={handleAnterior}
                  disabled={pasoActual === 0 || enviandoFeedback}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  ← Anterior
                </button>

                {pasoActual < preguntas.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleSiguiente}
                    disabled={!puedeAvanzar || enviandoFeedback}
                    className="btn-primary text-xs px-5 py-2"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnviarRespuestas}
                    disabled={!todasRespondidas || enviandoFeedback}
                    className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2"
                  >
                    {enviandoFeedback ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Analizando respuestas...</span>
                      </>
                    ) : (
                      <span>Finalizar y evaluar →</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

