"use client";

import { useEffect, useState } from "react";
import {
  apiDemoCvs,
  apiProcesarCandidato,
  CvDemo,
  ResultadoProcesar,
} from "@/lib/api";

const AGENTES = [
  { id: "Lexi",  emoji: "🧠", desc: "Estructurando el CV..." },
  { id: "Inari", emoji: "🔍", desc: "Buscando vacantes..." },
  { id: "Kenti", emoji: "📝", desc: "Evaluando postulación..." },
  { id: "Iris",  emoji: "📡", desc: "Preparando seguimiento..." },
];

const MIN_CHARS = 30;

interface CvPageProps {
  onResult: (resultado: ResultadoProcesar) => void;
}

export default function CvPage({ onResult }: CvPageProps) {
  const [cvTexto,  setCvTexto]  = useState("");
  const [demos,    setDemos]    = useState<CvDemo[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [is502,    setIs502]    = useState(false);

  /* Carga los CVs demo al montar */
  useEffect(() => {
    apiDemoCvs()
      .then(setDemos)
      .catch(() => {/* silencioso: si falla solo no aparecen los botones */});
  }, []);

  async function analizar() {
    if (cvTexto.trim().length < MIN_CHARS || loading) return;
    setLoading(true);
    setError(null);
    setIs502(false);
    try {
      const resultado = await apiProcesarCandidato(cvTexto);
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

  const chars      = cvTexto.length;
  const faltanChars = Math.max(0, MIN_CHARS - chars);
  const canAnalyze  = chars >= MIN_CHARS && !loading;

  return (
    <div className="animate-slide-up mx-auto w-full max-w-3xl space-y-6">
      {/* Cabecera */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Analiza tu CV</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Pega el texto de tu hoja de vida y los agentes de IA lo procesarán.
        </p>
      </div>

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

      {/* Panel "pensando" mientras procesa */}
      {loading && (
        <div id="thinking-panel" className="card p-6 space-y-4">
          <p className="text-center text-sm font-medium text-text-secondary">
            Los agentes están analizando tu CV…
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AGENTES.map((ag, i) => (
              <div
                key={ag.id}
                className="card-elevated flex flex-col items-center gap-2 p-4 animate-thinking"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                <span className="text-3xl">{ag.emoji}</span>
                <span
                  className={`text-xs font-bold agent-${ag.id.toLowerCase()}`}
                  style={{ color: "var(--agent-color)" }}
                >
                  {ag.id}
                </span>
                <span className="text-center text-xs text-text-muted">
                  {ag.desc}
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-accent animate-thinking"
                      style={{ animationDelay: `${d * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón analizar */}
      {!loading && (
        <button
          id="btn-analizar"
          type="button"
          className="btn-primary w-full py-4 text-base"
          onClick={analizar}
          disabled={!canAnalyze}
        >
          ✨ Analizar con los agentes
        </button>
      )}

      {/* Nota de tiempo */}
      <p className="text-center text-xs text-text-muted">
        El análisis con IA puede tomar entre 2 y 15 segundos.
      </p>
    </div>
  );
}
