"use client";

import { useEffect, useState } from "react";
import {
  apiDemoCvs,
  apiProcesarCandidato,
  CvDemo,
  ResultadoProcesar,
} from "@/lib/api";
import AgenteSvg, { AGENTES_META, AgenteNombre } from "@/components/escenario/AgenteSvg";
import { usePrefersReducedMotion } from "@/components/escenario/mensajesUtils";
import EntrevistaLexi from "@/components/entrevista/EntrevistaLexi";

const AGENTES_ESPERA: AgenteNombre[] = ["Lexi", "Inari", "Kenti", "Iris"];

const MIN_CHARS = 30;

interface CvPageProps {
  onResult: (resultado: ResultadoProcesar) => void;
}

export default function CvPage({ onResult }: CvPageProps) {
  const [modo,     setModo]     = useState<"entrevista" | "pegar">("entrevista");
  const [cvTexto,  setCvTexto]  = useState("");
  const [demos,    setDemos]    = useState<CvDemo[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [is502,    setIs502]    = useState(false);
  const [turnoLuz, setTurnoLuz] = useState(0);

  const reducedMotion = usePrefersReducedMotion();

  /* Carga los CVs demo al montar */
  useEffect(() => {
    apiDemoCvs()
      .then(setDemos)
      .catch(() => {/* silencioso: si falla solo no aparecen los botones */});
  }, []);

  /* Ilumina a los cuatro agentes uno tras otro mientras se espera la respuesta */
  useEffect(() => {
    if (!loading || reducedMotion) {
      setTurnoLuz(0);
      return;
    }
    const timer = setInterval(() => {
      setTurnoLuz((prev) => (prev + 1) % AGENTES_ESPERA.length);
    }, 900);
    return () => clearInterval(timer);
  }, [loading, reducedMotion]);

  async function analizarTexto(textoAAnalizar: string) {
    if (textoAAnalizar.trim().length < MIN_CHARS || loading) return;
    setLoading(true);
    setError(null);
    setIs502(false);
    try {
      const resultado = await apiProcesarCandidato(textoAAnalizar);
      onResult(resultado);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      if (msg.includes("502") || msg.toLowerCase().includes("procesar")) {
        setIs502(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function analizar() {
    await analizarTexto(cvTexto);
  }

  const chars       = cvTexto.length;
  const faltanChars = Math.max(0, MIN_CHARS - chars);
  const canAnalyze  = chars >= MIN_CHARS && !loading;

  return (
    <div
      className={[
        "animate-slide-up motion-reduce:animate-none mx-auto w-full space-y-6 transition-all duration-300",
        modo === "entrevista" ? "max-w-5xl" : "max-w-3xl",
      ].join(" ")}
    >
      {/* Cabecera */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Estructura y analiza tu perfil</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Elige si prefieres responder las preguntas guiadas de Lexi o pegar el texto de tu hoja de vida.
        </p>
      </div>

      {/* Selector de modo: Entrevista guiada vs Pegar CV */}
      {!loading && (
        <div className="tab-list max-w-md mx-auto">
          <button
            type="button"
            id="tab-entrevista"
            className={`tab-btn ${modo === "entrevista" ? "active" : ""}`}
            onClick={() => setModo("entrevista")}
          >
            💬 Entrevista con Lexi
          </button>
          <button
            type="button"
            id="tab-pegar-cv"
            className={`tab-btn ${modo === "pegar" ? "active" : ""}`}
            onClick={() => setModo("pegar")}
          >
            📄 Pegar CV
          </button>
        </div>
      )}

      {/* Modo 1: Entrevista guiada con Lexi */}
      {modo === "entrevista" && !loading && (
        <EntrevistaLexi onFinalizar={analizarTexto} loading={loading} />
      )}

      {/* Modo 2: Pegar CV (formulario existente completo) */}
      {modo === "pegar" && !loading && (
        <>
          {/* Área de texto */}
          <div className="card p-6 space-y-3">
            <label htmlFor="cv-input" className="label">Texto del CV</label>
            <textarea
              id="cv-input"
              className="textarea min-h-[280px]"
              placeholder="Pega aquí el contenido de tu hoja de vida (experiencia, habilidades, educación, etc.)..."
              value={cvTexto}
              onChange={(e) => setCvTexto(e.target.value)}
              disabled={loading}
            />
            {/* Contador de caracteres */}
            <div className="flex items-center justify-between text-xs">
              <span className={chars < MIN_CHARS ? "text-status-warning" : "text-text-muted"}>
                {chars < MIN_CHARS
                  ? `Faltan ${faltanChars} caracteres mínimos`
                  : `${chars.toLocaleString("es-CO")} caracteres`}
              </span>
              {chars > 0 && (
                <button
                  type="button"
                  className="btn-ghost text-xs text-status-error"
                  onClick={() => setCvTexto("")}
                  disabled={loading}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* CVs de ejemplo */}
          {demos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Cargar CV de ejemplo
              </p>
              <div className="flex flex-wrap gap-2">
                {demos.map((demo) => (
                  <button
                    key={demo.id}
                    id={`demo-cv-${demo.id}`}
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => setCvTexto(demo.cv_texto)}
                    disabled={loading}
                  >
                    {demo.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botón analizar tradicional */}
          <button
            id="btn-analizar"
            type="button"
            className="btn-primary w-full py-4 text-base"
            onClick={analizar}
            disabled={!canAnalyze}
          >
            ✨ Analizar con los agentes
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div id="cv-error" className={is502 ? "alert-warning" : "alert-error"}>
          <span>{is502 ? "⚠️" : "❌"}</span>
          <div className="flex-1">
            <p className="font-medium">
              {is502 ? "El servicio tardó demasiado" : "Error al analizar"}
            </p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
            {is502 && (
              <p className="text-xs mt-1 opacity-70">
                Los agentes de IA pueden tardar entre 2 y 15 segundos. Intenta de nuevo.
              </p>
            )}
          </div>
          {is502 && (
            <button
              id="btn-reintentar"
              type="button"
              className="btn-primary text-xs px-3 py-1.5 shrink-0"
              onClick={analizar}
              disabled={loading}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Panel de espera: los cuatro agentes en estado "pensando", iluminándose uno tras otro */}
      {loading && (
        <div
          id="thinking-panel"
          role="status"
          aria-live="polite"
          className="card p-6 space-y-5"
        >
          <p className="text-center text-sm font-semibold text-text-primary">
            Los agentes están trabajando
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AGENTES_ESPERA.map((nombre, i) => {
              const meta = AGENTES_META[nombre];
              const iluminado = reducedMotion || turnoLuz === i;

              return (
                <div
                  key={nombre}
                  data-agente-espera={nombre}
                  data-iluminado={iluminado ? "true" : "false"}
                  className={[
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-500 motion-reduce:transition-none",
                    iluminado
                      ? "bg-surface-elevated opacity-100"
                      : "border-surface-border bg-surface-card opacity-50",
                  ].join(" ")}
                  style={
                    iluminado
                      ? {
                          borderColor: meta.color,
                          boxShadow: reducedMotion
                            ? undefined
                            : `0 0 20px ${meta.color}33`,
                        }
                      : undefined
                  }
                >
                  <AgenteSvg agente={nombre} estado="pensando" size={68} />
                  <span
                    className="text-xs font-bold"
                    style={{ color: meta.color }}
                  >
                    {meta.nombre}
                  </span>
                  <span className="text-center text-[11px] text-text-muted">
                    {meta.rol}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nota de tiempo */}
      <p className="text-center text-xs text-text-muted">
        El análisis con IA puede tomar entre 2 y 15 segundos.
      </p>
    </div>
  );
}
