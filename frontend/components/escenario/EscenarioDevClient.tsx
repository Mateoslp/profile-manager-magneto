"use client";

import { useState } from "react";
import AgenteSvg, { AgenteNombre, EstadoAgente } from "./AgenteSvg";
import { CASOS_DEMO_ESCENARIO } from "./datosDemo";
import EscenarioAgentes from "./EscenarioAgentes";

const ESTADOS_GALERIA: EstadoAgente[] = ["reposo", "pensando", "hablando", "alerta"];
const AGENTES_ORDEN: AgenteNombre[] = ["Lexi", "Inari", "Kenti", "Iris"];

export default function EscenarioDevClient() {
  const [casoId, setCasoId] = useState<"puntaje-alto" | "puntaje-bajo">(
    "puntaje-alto"
  );
  const [estadoGaleria, setEstadoGaleria] = useState<EstadoAgente>("reposo");

  const casoActual =
    CASOS_DEMO_ESCENARIO.find((c) => c.id === casoId) ??
    CASOS_DEMO_ESCENARIO[0];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Encabezado con insignia Solo desarrollo */}
        <header className="flex flex-col gap-3 rounded-2xl border border-amber-400/60 bg-amber-50/80 dark:border-amber-700/40 dark:bg-amber-950/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="chip-yellow font-semibold uppercase tracking-wider">
                Solo desarrollo
              </span>
              <span className="text-xs text-text-muted">
                Ruta /dev/escenario
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              Banco de pruebas — Escenario de agentes LIKAI
            </h1>
            <p className="text-sm text-text-secondary">
              Verifica el recorrido visual, controles, estados de los personajes
              y manejo de casos con datos de ejemplo en el formato real de{" "}
              <code className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-accent-light">
                agents.py
              </code>
              .
            </p>
          </div>
        </header>

        {/* Selector de los dos ejemplos */}
        <section
          aria-label="Selector de ejemplo de prueba"
          className="card p-5 space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Selecciona un escenario de ejemplo
            </p>
            <div className="flex flex-wrap gap-2">
              {CASOS_DEMO_ESCENARIO.map((caso) => {
                const activo = caso.id === casoActual.id;
                return (
                  <button
                    key={caso.id}
                    id={`btn-caso-${caso.id}`}
                    type="button"
                    onClick={() => setCasoId(caso.id)}
                    aria-pressed={activo}
                    className={
                      activo
                        ? "btn-primary px-4 py-2 text-xs"
                        : "btn-secondary px-4 py-2 text-xs"
                    }
                  >
                    {caso.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-text-secondary">{casoActual.descripcion}</p>
        </section>

        {/* Escenario interactivo Hito 2 */}
        <EscenarioAgentes
          mensajes={casoActual.resultado.mensajes}
          postulacionId={casoActual.resultado.postulacion_id}
          nombreCandidato={casoActual.resultado.perfil.nombre}
        />

        {/* Galería de verificación visual de AgenteSvg (Hito 1) */}
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-semibold text-text-secondary hover:text-text-primary">
            Inspeccionar estados individuales de AgenteSvg (Hito 1)
          </summary>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-muted">Estado:</span>
              {ESTADOS_GALERIA.map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setEstadoGaleria(est)}
                  aria-pressed={estadoGaleria === est}
                  className={
                    estadoGaleria === est
                      ? "btn-primary px-3 py-1.5 text-xs capitalize"
                      : "btn-secondary px-3 py-1.5 text-xs capitalize"
                  }
                >
                  {est}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {AGENTES_ORDEN.map((nombre) => (
                <div
                  key={nombre}
                  className="card-elevated flex flex-col items-center gap-2 p-4"
                >
                  <AgenteSvg agente={nombre} estado={estadoGaleria} size={80} />
                  <span className="text-sm font-semibold text-text-primary">
                    {nombre}
                  </span>
                  <span className="text-xs text-text-muted capitalize">
                    {estadoGaleria}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

