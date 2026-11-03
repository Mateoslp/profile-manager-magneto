"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MensajeAgente } from "@/lib/api";
import AgenteSvg, { AGENTES_META, AgenteNombre, EstadoAgente } from "./AgenteSvg";
import {
  esOrigenRespaldo,
  evaluarParticipacionKenti,
  NodoId,
  nombreVisibleNodo,
  normalizarClave,
  obtenerInfoTipo,
  resolverNodo,
  usePrefersReducedMotion,
} from "./mensajesUtils";
import PanelDetalleAgente from "./PanelDetalleAgente";

export { resolverNodo };
export type { NodoId };
export type VelocidadReproduccion = 1 | 1.5 | 2;
type FaseTarjeta = "tu-inicial" | "emisor" | "receptor";

interface NodoConfig {
  id: NodoId;
  etiqueta: string;
  rol: string;
  color: string;
  agente?: AgenteNombre;
}

const NODOS_ESCENARIO: NodoConfig[] = [
  { id: "tu",    etiqueta: "Tú",    rol: "Candidato",        color: "#a89cf9" },
  { id: "lexi",  etiqueta: "Lexi",  rol: "Perfil",           color: AGENTES_META.Lexi.color,  agente: "Lexi"  },
  { id: "inari", etiqueta: "Inari", rol: "Vacantes y match", color: AGENTES_META.Inari.color, agente: "Inari" },
  { id: "kenti", etiqueta: "Kenti", rol: "Postulación",      color: AGENTES_META.Kenti.color, agente: "Kenti" },
  { id: "iris",  etiqueta: "Iris",  rol: "Seguimiento",      color: AGENTES_META.Iris.color,  agente: "Iris"  },
];

const VELOCIDADES: VelocidadReproduccion[] = [1, 1.5, 2];
const DURACION_BASE_MS = 2600;

function obtenerIndiceColumna(nodo: NodoId | null): number {
  if (!nodo) return -1;
  return NODOS_ESCENARIO.findIndex((n) => n.id === nodo);
}

/** Posición horizontal (%) del globo en escritorio para que quede sobre el emisor sin salirse del contenedor. */
function calcularPosicionGloboDesktop(columnaEmisor: number): {
  leftPct: number;
  widthPct: number;
  punteroPct: number;
} {
  const widthPct = 58;
  const colSegura = columnaEmisor >= 0 && columnaEmisor <= 4 ? columnaEmisor : 2;
  const centroNodoPct = colSegura * 20 + 10; // 10, 30, 50, 70, 90

  const idealLeft = centroNodoPct - widthPct / 2;
  const leftPct = Math.max(0, Math.min(100 - widthPct, idealLeft));

  const punteroRelativo = ((centroNodoPct - leftPct) / widthPct) * 100;
  const punteroPct = Math.max(8, Math.min(92, punteroRelativo));

  return { leftPct, widthPct, punteroPct };
}

export interface EscenarioAgentesProps {
  mensajes: MensajeAgente[];
  postulacionId?: number | null;
  nombreCandidato?: string | null;
  onSelectAgente?: (agente: AgenteNombre) => void;
}

export default function EscenarioAgentes({
  mensajes,
  postulacionId,
  nombreCandidato,
  onSelectAgente,
}: EscenarioAgentesProps) {
  const reducedMotion = usePrefersReducedMotion();

  const [indiceActual, setIndiceActual] = useState<number>(0);
  const [faseTarjeta, setFaseTarjeta] = useState<FaseTarjeta>("tu-inicial");
  const [reproduciendo, setReproduciendo] = useState<boolean>(() => mensajes.length > 0);
  const [velocidad, setVelocidad] = useState<VelocidadReproduccion>(1);
  const [cicloInicio, setCicloInicio] = useState<number>(0);
  const [anuncioAccesible, setAnuncioAccesible] = useState<string>("");
  const [agenteDetalle, setAgenteDetalle] = useState<AgenteNombre | null>(null);

  const ultimoAnuncioClaveRef = useRef<string>("");

  const { kentiNoPostulo, razonNoPostulo } = useMemo(
    () => evaluarParticipacionKenti(mensajes, postulacionId),
    [mensajes, postulacionId]
  );

  // Reiniciar al llegar resultados nuevos; si prefers-reduced-motion está activo, no auto-reproducir
  useEffect(() => {
    ultimoAnuncioClaveRef.current = "";
    setAgenteDetalle(null);
    setIndiceActual(0);
    if (reducedMotion) {
      setFaseTarjeta("receptor");
      setReproduciendo(false);
    } else {
      setFaseTarjeta("tu-inicial");
      setReproduciendo(mensajes.length > 0);
    }
    setCicloInicio((c) => c + 1);
  }, [mensajes, reducedMotion]);

  const total = mensajes.length;
  const indiceSeguro = total > 0 ? Math.min(Math.max(0, indiceActual), total - 1) : 0;
  const mensajeActual = total > 0 ? mensajes[indiceSeguro] : null;

  const nodoEmisor = mensajeActual ? resolverNodo(mensajeActual.agente) : null;
  const nodoReceptor = mensajeActual ? resolverNodo(mensajeActual.para) : null;

  // Transición de la tarjeta del candidato dentro de cada paso
  useEffect(() => {
    if (total === 0) return;

    if (reducedMotion) {
      if (faseTarjeta !== "receptor") {
        setFaseTarjeta("receptor");
      }
      return;
    }

    if (indiceSeguro === 0 && faseTarjeta === "tu-inicial") {
      const tLlegadaLexi = setTimeout(() => {
        setFaseTarjeta("emisor");
      }, Math.round(350 / velocidad));
      return () => clearTimeout(tLlegadaLexi);
    }

    if (faseTarjeta === "emisor") {
      const tEntrega = setTimeout(() => {
        setFaseTarjeta("receptor");
      }, Math.round(900 / velocidad));
      return () => clearTimeout(tEntrega);
    }
  }, [indiceSeguro, faseTarjeta, velocidad, total, cicloInicio, reducedMotion]);

  // Avance automático al siguiente mensaje cuando está reproduciendo
  useEffect(() => {
    if (!reproduciendo || total === 0 || reducedMotion) return;

    const duracionPaso = Math.round(
      (indiceSeguro === 0 ? DURACION_BASE_MS + 400 : DURACION_BASE_MS) /
        velocidad
    );

    const timerAvance = setTimeout(() => {
      if (indiceSeguro < total - 1) {
        setIndiceActual(indiceSeguro + 1);
        setFaseTarjeta("emisor");
      } else {
        setReproduciendo(false);
      }
    }, duracionPaso);

    return () => clearTimeout(timerAvance);
  }, [reproduciendo, indiceSeguro, velocidad, total, cicloInicio, reducedMotion]);

  // Actualizar región aria-live únicamente cuando cambia el mensaje activo (sin repetir anuncios)
  useEffect(() => {
    if (!mensajeActual || faseTarjeta === "tu-inicial") {
      return;
    }
    const clave = `${cicloInicio}-${indiceSeguro}-${mensajeActual.agente}-${mensajeActual.para}-${mensajeActual.texto}`;
    if (ultimoAnuncioClaveRef.current === clave) return;
    ultimoAnuncioClaveRef.current = clave;

    const emisorTxt = nombreVisibleNodo(mensajeActual.agente);
    const receptorTxt = nombreVisibleNodo(mensajeActual.para);
    const tipoTxt = obtenerInfoTipo(mensajeActual.tipo).etiqueta;
    const respaldoTxt = esOrigenRespaldo(mensajeActual.datos)
      ? " Respuesta de respaldo."
      : "";

    setAnuncioAccesible(
      `Mensaje ${indiceSeguro + 1} de ${total}: ${emisorTxt} a ${receptorTxt} (${tipoTxt}). ${mensajeActual.texto}${respaldoTxt}`
    );
  }, [mensajeActual, faseTarjeta, indiceSeguro, total, cicloInicio]);

  // Posición efectiva de la tarjeta del candidato
  const nodoTarjeta: NodoId = useMemo(() => {
    if (!mensajeActual || faseTarjeta === "tu-inicial") {
      return "tu";
    }
    if (faseTarjeta === "emisor") {
      return nodoEmisor ?? "tu";
    }
    return nodoReceptor ?? nodoEmisor ?? "tu";
  }, [mensajeActual, faseTarjeta, nodoEmisor, nodoReceptor]);

  const irAMensaje = useCallback(
    (nuevoIndice: number) => {
      if (total === 0) return;
      const acotado = Math.min(Math.max(0, nuevoIndice), total - 1);
      setReproduciendo(false);
      setIndiceActual(acotado);
      setFaseTarjeta(reducedMotion ? "receptor" : "emisor");
    },
    [total, reducedMotion]
  );

  const irAnterior = useCallback(() => {
    if (indiceSeguro > 0) {
      irAMensaje(indiceSeguro - 1);
    } else {
      setReproduciendo(false);
    }
  }, [indiceSeguro, irAMensaje]);

  const irSiguiente = useCallback(() => {
    if (indiceSeguro < total - 1) {
      irAMensaje(indiceSeguro + 1);
    } else {
      setReproduciendo(false);
    }
  }, [indiceSeguro, total, irAMensaje]);

  const repetir = useCallback(() => {
    if (total === 0) return;
    ultimoAnuncioClaveRef.current = "";
    setIndiceActual(0);
    if (reducedMotion) {
      setFaseTarjeta("receptor");
      setReproduciendo(false);
    } else {
      setFaseTarjeta("tu-inicial");
      setReproduciendo(true);
    }
    setCicloInicio((c) => c + 1);
  }, [total, reducedMotion]);

  const alternarReproduccion = useCallback(() => {
    if (total === 0) return;
    if (reproduciendo) {
      setReproduciendo(false);
      return;
    }
    if (reducedMotion) {
      // Con movimiento reducido avanza un paso de forma discreta sin animación continua
      if (indiceSeguro < total - 1) {
        setIndiceActual(indiceSeguro + 1);
      } else {
        setIndiceActual(0);
      }
      setFaseTarjeta("receptor");
      return;
    }
    if (indiceSeguro >= total - 1) {
      repetir();
    } else {
      setReproduciendo(true);
    }
  }, [total, reproduciendo, indiceSeguro, repetir, reducedMotion]);

  const cambiarVelocidad = useCallback((nuevaVelocidad: VelocidadReproduccion) => {
    setReproduciendo(false);
    setVelocidad(nuevaVelocidad);
  }, []);

  const interactuarConNodo = useCallback(
    (nodo: NodoConfig) => {
      // Toda interacción con un personaje detiene la reproducción automática
      setReproduciendo(false);

      if (nodo.agente) {
        setAgenteDetalle(nodo.agente);
        if (onSelectAgente) {
          onSelectAgente(nodo.agente);
        }
      }

      if (total === 0) return;

      const indicesDelNodo = mensajes
        .map((m, i) => (resolverNodo(m.agente) === nodo.id ? i : -1))
        .filter((i) => i >= 0);

      if (indicesDelNodo.length > 0) {
        const posActual = indicesDelNodo.indexOf(indiceSeguro);
        const siguienteIdx =
          posActual >= 0
            ? indicesDelNodo[(posActual + 1) % indicesDelNodo.length]
            : indicesDelNodo[0];
        setIndiceActual(siguienteIdx);
        setFaseTarjeta(reducedMotion ? "receptor" : "emisor");
      } else if (nodo.id === "kenti" && kentiNoPostulo) {
        const idxDecisionInari = mensajes.reduce(
          (acc, m, i) =>
            resolverNodo(m.agente) === "inari" &&
            normalizarClave(m.tipo) === "decision"
              ? i
              : acc,
          -1
        );
        if (idxDecisionInari >= 0) {
          setIndiceActual(idxDecisionInari);
          setFaseTarjeta(reducedMotion ? "receptor" : "emisor");
        }
      } else if (nodo.id === "tu") {
        const idxParaCandidato = mensajes.findIndex(
          (m) => resolverNodo(m.para) === "tu"
        );
        if (idxParaCandidato >= 0) {
          setIndiceActual(idxParaCandidato);
          setFaseTarjeta("receptor");
        }
      }
    },
    [total, mensajes, indiceSeguro, kentiNoPostulo, onSelectAgente, reducedMotion]
  );

  // Atajos de teclado activos SOLO cuando el foco está dentro del escenario y no hay modal abierto
  function manejarTeclado(e: React.KeyboardEvent<HTMLElement>) {
    if (agenteDetalle) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      irAnterior();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      irSiguiente();
    } else if (e.key === " ") {
      e.preventDefault();
      alternarReproduccion();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      repetir();
    }
  }

  if (total === 0) {
    return (
      <section
        aria-label="Escenario de agentes"
        className="card p-6 text-center text-sm text-text-secondary"
      >
        No hay mensajes de agentes para mostrar en este resultado.
      </section>
    );
  }

  const infoTipo = obtenerInfoTipo(mensajeActual?.tipo);
  const mostrarRespaldo = esOrigenRespaldo(mensajeActual?.datos);
  const emisorVisible = nombreVisibleNodo(mensajeActual?.agente);
  const receptorVisible = nombreVisibleNodo(mensajeActual?.para);

  const colEmisor = obtenerIndiceColumna(nodoEmisor);
  const colReceptor = obtenerIndiceColumna(nodoReceptor);
  const colTarjeta = Math.max(0, obtenerIndiceColumna(nodoTarjeta));
  const centroTarjetaPct = colTarjeta * 20 + 10;

  const nodoEmisorConfig = NODOS_ESCENARIO.find((n) => n.id === nodoEmisor);
  const colorActivo =
    infoTipo.clave === "alerta"
      ? "#fbbf24"
      : nodoEmisorConfig?.color ?? "#7c6af7";

  const globoDesktop = calcularPosicionGloboDesktop(colEmisor);

  const tramoIzqPct =
    colEmisor >= 0 && colReceptor >= 0
      ? Math.min(colEmisor, colReceptor) * 20 + 10
      : null;
  const tramoAnchoPct =
    colEmisor >= 0 && colReceptor >= 0
      ? Math.abs(colReceptor - colEmisor) * 20
      : null;

  function obtenerEstadoVisualAgente(nodoId: NodoId): EstadoAgente {
    if (nodoId === "kenti" && kentiNoPostulo) return "reposo";
    if (faseTarjeta !== "tu-inicial" && nodoId === nodoEmisor) {
      return infoTipo.clave === "alerta" ? "alerta" : "hablando";
    }
    if (faseTarjeta !== "tu-inicial" && nodoId === nodoReceptor) {
      return "pensando";
    }
    return "reposo";
  }

  const etiquetaTarjeta = nombreCandidato?.trim()
    ? nombreCandidato.trim()
    : "Tu CV";

  return (
    <>
      <section
        id="escenario-agentes"
        tabIndex={0}
        onKeyDown={manejarTeclado}
        aria-label="Escenario interactivo de comunicación entre los agentes de LIKAI"
        className="card p-5 sm:p-6 space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        {/* Región aria-live dedicada: anuncia solo cuando cambia el mensaje activo */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {anuncioAccesible}
        </div>

        {/* Cabecera del escenario */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary">
              Escenario de agentes LIKAI
            </h3>
            <p className="text-xs text-text-secondary">
              Sigue el recorrido de tu perfil y selecciona un agente para ver su detalle.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-1 font-medium text-text-secondary">
              Paso {indiceSeguro + 1} de {total}
            </span>
            <span className="hidden sm:inline text-[11px]">
              Atajos: ← → Espacio R
            </span>
          </div>
        </div>

        {/* Globo del agente emisor */}
        {mensajeActual && (
          <div
            className={[
              "relative transition-opacity duration-300 motion-reduce:transition-none",
              faseTarjeta === "tu-inicial"
                ? "invisible opacity-0"
                : "visible opacity-100",
            ].join(" ")}
          >
            <div className="md:hidden">
              <GloboMensajeContenido
                emisor={emisorVisible}
                receptor={receptorVisible}
                texto={mensajeActual.texto}
                infoTipo={infoTipo}
                mostrarRespaldo={mostrarRespaldo}
                colorBorde={colorActivo}
              />
            </div>

            <div className="hidden md:block relative min-h-[124px]">
              <div
                className="relative transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{
                  marginLeft: `${globoDesktop.leftPct}%`,
                  width: `${globoDesktop.widthPct}%`,
                }}
              >
                <GloboMensajeContenido
                  emisor={emisorVisible}
                  receptor={receptorVisible}
                  texto={mensajeActual.texto}
                  infoTipo={infoTipo}
                  mostrarRespaldo={mostrarRespaldo}
                  colorBorde={colorActivo}
                />
                {colEmisor >= 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-2 h-3.5 w-3.5 rotate-45 border-r border-b bg-surface-elevated transition-all duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      left: `${globoDesktop.punteroPct}%`,
                      transform: "translateX(-50%) rotate(45deg)",
                      borderColor: `${colorActivo}88`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pista de la tarjeta del candidato y los 5 nodos (Escritorio >= md) */}
        <div className="hidden md:block space-y-3 pt-1">
          <div className="relative h-12">
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-[10%] right-[10%] h-0.5 -translate-y-1/2 rounded-full bg-surface-border"
            />

            {tramoIzqPct !== null && tramoAnchoPct !== null && tramoAnchoPct > 0 && (
              <div
                aria-hidden="true"
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{
                  left: `${tramoIzqPct}%`,
                  width: `${tramoAnchoPct}%`,
                  background: `linear-gradient(90deg, ${colorActivo}aa, ${colorActivo})`,
                  boxShadow: `0 0 12px ${colorActivo}66`,
                }}
              />
            )}

            <div
              data-testid="tarjeta-candidato"
              data-nodo-actual={nodoTarjeta}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out motion-reduce:transition-none z-10"
              style={{ left: `${centroTarjetaPct}%` }}
            >
              <div className="flex items-center gap-1.5 rounded-xl border border-accent/70 bg-surface-card px-3 py-1.5 shadow-glow-sm">
                <span aria-hidden="true" className="text-xs">📄</span>
                <span className="max-w-[120px] truncate text-xs font-semibold text-text-primary">
                  {etiquetaTarjeta}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-start">
            {NODOS_ESCENARIO.map((nodo) => {
              const esEmisor = faseTarjeta !== "tu-inicial" && nodo.id === nodoEmisor;
              const esReceptor = faseTarjeta !== "tu-inicial" && nodo.id === nodoReceptor;
              const tieneTarjeta = nodoTarjeta === nodo.id;
              const esKentiAtenuado = nodo.id === "kenti" && kentiNoPostulo;
              const estadoSvg = obtenerEstadoVisualAgente(nodo.id);

              return (
                <div key={nodo.id} className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    id={`nodo-escenario-${nodo.id}`}
                    onClick={() => interactuarConNodo(nodo)}
                    aria-haspopup={nodo.agente ? "dialog" : undefined}
                    aria-expanded={
                      nodo.agente ? agenteDetalle === nodo.agente : undefined
                    }
                    aria-label={
                      esKentiAtenuado
                        ? `${nodo.etiqueta} (${nodo.rol}) — No postuló. Ver detalle`
                        : nodo.agente
                        ? `${nodo.etiqueta} (${nodo.rol}). Ver detalle`
                        : `${nodo.etiqueta} (${nodo.rol})`
                    }
                    aria-describedby={
                      esKentiAtenuado && razonNoPostulo
                        ? "kenti-no-postulo-razon"
                        : undefined
                    }
                    className={[
                      "group relative flex w-full flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-300 motion-reduce:transition-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      esKentiAtenuado
                        ? "border-dashed border-surface-border bg-surface/50 opacity-75 hover:opacity-95"
                        : esEmisor
                        ? "border-accent bg-surface-elevated shadow-glow-sm"
                        : esReceptor
                        ? "border-surface-border bg-surface-elevated/80"
                        : "border-surface-border/70 bg-surface-card hover:border-accent/50 hover:bg-surface-elevated/50",
                    ].join(" ")}
                    style={
                      esEmisor && !esKentiAtenuado
                        ? { borderColor: colorActivo, boxShadow: `0 0 18px ${colorActivo}30` }
                        : undefined
                    }
                  >
                    {nodo.agente ? (
                      <AgenteSvg
                        agente={nodo.agente}
                        estado={estadoSvg}
                        atenuado={esKentiAtenuado}
                        size={74}
                      />
                    ) : (
                      <NodoTuAvatar activo={tieneTarjeta || esReceptor} size={74} />
                    )}

                    <div>
                      <p
                        className="text-sm font-bold leading-tight"
                        style={{ color: esKentiAtenuado ? "#9090b0" : nodo.color }}
                      >
                        {nodo.etiqueta}
                      </p>
                      <p className="text-[11px] text-text-muted">{nodo.rol}</p>
                    </div>

                    {esKentiAtenuado ? (
                      <span className="mt-0.5 inline-flex items-center rounded-full border border-surface-border bg-surface-elevated px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                        No postuló
                      </span>
                    ) : esEmisor ? (
                      <span
                        className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${colorActivo}22`,
                          color: colorActivo,
                          border: `1px solid ${colorActivo}55`,
                        }}
                      >
                        {infoTipo.clave === "alerta" ? "En alerta" : "Hablando"}
                      </span>
                    ) : esReceptor ? (
                      <span className="mt-0.5 inline-flex items-center rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[10px] text-text-secondary">
                        Recibiendo
                      </span>
                    ) : null}
                  </button>

                  {esKentiAtenuado && razonNoPostulo && (
                    <p
                      id="kenti-no-postulo-razon"
                      className="mt-2 rounded-xl border border-surface-border bg-surface-elevated/70 px-2.5 py-2 text-[11px] leading-snug text-text-secondary"
                    >
                      {razonNoPostulo}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Vista móvil (< md): escenario apilado verticalmente */}
        <div className="space-y-2.5 md:hidden">
          {NODOS_ESCENARIO.map((nodo) => {
            const esEmisor = faseTarjeta !== "tu-inicial" && nodo.id === nodoEmisor;
            const esReceptor = faseTarjeta !== "tu-inicial" && nodo.id === nodoReceptor;
            const tieneTarjeta = nodoTarjeta === nodo.id;
            const esKentiAtenuado = nodo.id === "kenti" && kentiNoPostulo;
            const estadoSvg = obtenerEstadoVisualAgente(nodo.id);

            return (
              <div key={nodo.id} className="space-y-1.5">
                <button
                  type="button"
                  id={`nodo-escenario-movil-${nodo.id}`}
                  onClick={() => interactuarConNodo(nodo)}
                  aria-haspopup={nodo.agente ? "dialog" : undefined}
                  aria-expanded={
                    nodo.agente ? agenteDetalle === nodo.agente : undefined
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    esKentiAtenuado
                      ? "border-dashed border-surface-border bg-surface/50 opacity-75"
                      : esEmisor
                      ? "border-accent bg-surface-elevated shadow-glow-sm"
                      : "border-surface-border bg-surface-card",
                  ].join(" ")}
                  style={
                    esEmisor && !esKentiAtenuado
                      ? { borderColor: colorActivo }
                      : undefined
                  }
                >
                  {nodo.agente ? (
                    <AgenteSvg
                      agente={nodo.agente}
                      estado={estadoSvg}
                      atenuado={esKentiAtenuado}
                      size={54}
                    />
                  ) : (
                    <NodoTuAvatar activo={tieneTarjeta || esReceptor} size={54} />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-sm font-bold"
                        style={{ color: esKentiAtenuado ? "#9090b0" : nodo.color }}
                      >
                        {nodo.etiqueta}
                      </span>
                      <span className="text-xs text-text-muted">· {nodo.rol}</span>
                      {esKentiAtenuado && (
                        <span className="chip-gray text-[11px] font-semibold">
                          No postuló
                        </span>
                      )}
                      {esEmisor && !esKentiAtenuado && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${colorActivo}22`,
                            color: colorActivo,
                          }}
                        >
                          {infoTipo.clave === "alerta" ? "En alerta" : "Hablando"}
                        </span>
                      )}
                      {esReceptor && !esKentiAtenuado && (
                        <span className="chip-gray text-[10px]">Recibiendo</span>
                      )}
                    </div>

                    {tieneTarjeta && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-accent/60 bg-surface px-2.5 py-1 text-xs font-medium text-text-primary">
                        <span aria-hidden="true">📄</span>
                        <span className="truncate max-w-[180px]">{etiquetaTarjeta}</span>
                      </div>
                    )}
                  </div>
                </button>

                {esKentiAtenuado && razonNoPostulo && (
                  <p className="ml-3 rounded-xl border border-surface-border bg-surface-elevated/70 px-3 py-2 text-xs text-text-secondary">
                    {razonNoPostulo}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Línea de tiempo clicable con un punto por mensaje */}
        <div className="space-y-2 pt-1">
          <div
            role="group"
            aria-label="Línea de tiempo de mensajes entre agentes"
            className="relative flex items-center justify-between gap-2 px-2 py-2"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-4 right-4 top-1/2 h-0.5 -translate-y-1/2 bg-surface-border"
            />

            {mensajes.map((msg, idx) => {
              const activo = idx === indiceSeguro;
              const completado = idx < indiceSeguro;
              const nodoMsg = resolverNodo(msg.agente);
              const confMsg = NODOS_ESCENARIO.find((n) => n.id === nodoMsg);
              const colorPunto = confMsg?.color ?? "#7c6af7";
              const emisorPunto = nombreVisibleNodo(msg.agente);
              const receptorPunto = nombreVisibleNodo(msg.para);
              const tipoPunto = obtenerInfoTipo(msg.tipo).etiqueta;

              return (
                <button
                  key={idx}
                  id={`timeline-punto-${idx}`}
                  type="button"
                  onClick={() => irAMensaje(idx)}
                  aria-label={`Mensaje ${idx + 1} de ${total}: ${emisorPunto} a ${receptorPunto} (${tipoPunto})`}
                  aria-current={activo ? "step" : undefined}
                  title={`${idx + 1}. ${emisorPunto} → ${receptorPunto} (${tipoPunto})`}
                  className={[
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    activo
                      ? "scale-110 text-surface shadow-glow-sm"
                      : completado
                      ? "border border-accent/60 bg-surface-elevated text-text-primary hover:scale-105"
                      : "border border-surface-border bg-surface-card text-text-muted hover:border-accent/50 hover:text-text-secondary",
                  ].join(" ")}
                  style={
                    activo
                      ? {
                          backgroundColor: colorPunto,
                          boxShadow: `0 0 14px ${colorPunto}80`,
                        }
                      : undefined
                  }
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de controles */}
        <div className="flex flex-col gap-3 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-escenario-anterior"
              type="button"
              onClick={irAnterior}
              disabled={indiceSeguro <= 0}
              aria-label="Mensaje anterior"
              className="btn-secondary px-3 py-2 text-xs"
            >
              ← Anterior
            </button>

            <button
              id="btn-escenario-play-pause"
              type="button"
              onClick={alternarReproduccion}
              aria-label={reproduciendo ? "Pausar reproducción" : "Reproducir recorrido"}
              className="btn-primary px-4 py-2 text-xs min-w-[116px]"
            >
              {reproduciendo ? "⏸ Pausar" : "▶ Reproducir"}
            </button>

            <button
              id="btn-escenario-siguiente"
              type="button"
              onClick={irSiguiente}
              disabled={indiceSeguro >= total - 1}
              aria-label="Siguiente mensaje"
              className="btn-secondary px-3 py-2 text-xs"
            >
              Siguiente →
            </button>

            <button
              id="btn-escenario-repetir"
              type="button"
              onClick={repetir}
              aria-label="Repetir recorrido desde el inicio"
              className="btn-ghost px-3 py-2 text-xs"
            >
              ↺ Repetir
            </button>
          </div>

          <div
            role="group"
            aria-label="Velocidad de reproducción"
            className="inline-flex items-center self-start rounded-xl border border-surface-border bg-surface-elevated p-1 sm:self-auto"
          >
            <span className="px-2 text-[11px] font-medium text-text-muted">
              Velocidad
            </span>
            {VELOCIDADES.map((vel) => {
              const activa = velocidad === vel;
              return (
                <button
                  key={vel}
                  id={`btn-velocidad-${String(vel).replace(".", "_")}`}
                  type="button"
                  onClick={() => cambiarVelocidad(vel)}
                  aria-pressed={activa}
                  className={[
                    "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    activa
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {vel}x
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Panel lateral / hoja inferior de detalle del agente seleccionado */}
      <PanelDetalleAgente
        agente={agenteDetalle}
        mensajes={mensajes}
        postulacionId={postulacionId}
        onClose={() => setAgenteDetalle(null)}
      />
    </>
  );
}

/* ─── Subcomponentes internos ─── */

function GloboMensajeContenido({
  emisor,
  receptor,
  texto,
  infoTipo,
  mostrarRespaldo,
  colorBorde,
}: {
  emisor: string;
  receptor: string;
  texto: string;
  infoTipo: { etiqueta: string; clase: string };
  mostrarRespaldo: boolean;
  colorBorde: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-surface-elevated p-4 shadow-card transition-colors duration-300 motion-reduce:transition-none"
      style={{ borderColor: `${colorBorde}88` }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="text-xs font-bold tracking-wide"
          style={{ color: colorBorde }}
        >
          {emisor} → {receptor}
        </span>
        <span className={infoTipo.clase}>{infoTipo.etiqueta}</span>
        {mostrarRespaldo && (
          <span className="chip bg-surface-card text-text-muted border border-surface-border text-[11px]">
            Respuesta de respaldo
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-text-primary">{texto}</p>
    </div>
  );
}

function NodoTuAvatar({ activo, size = 74 }: { activo: boolean; size?: number }) {
  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {activo && (
          <circle
            cx="48"
            cy="50"
            r="40"
            stroke="#a89cf9"
            strokeOpacity="0.6"
            strokeWidth="2"
          />
        )}
        <circle
          cx="48"
          cy="50"
          r="35"
          fill="#16162a"
          stroke={activo ? "#a89cf9" : "#3a3a62"}
          strokeWidth={activo ? "2.6" : "2"}
        />
        <circle
          cx="48"
          cy="41"
          r="10.5"
          fill="#a89cf9"
          fillOpacity="0.25"
          stroke="#a89cf9"
          strokeWidth="2"
        />
        <path
          d="M30 68C32.5 58.5 39.5 54 48 54C56.5 54 63.5 58.5 66 68"
          stroke="#a89cf9"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
