"use client";

export type AgenteNombre = "Lexi" | "Inari" | "Kenti" | "Iris";
export type EstadoAgente = "reposo" | "pensando" | "hablando" | "alerta";

export interface AgenteMeta {
  nombre: AgenteNombre;
  rol: string;
  color: string;
  colorSecundario: string;
}

export const AGENTES_META: Record<AgenteNombre, AgenteMeta> = {
  Lexi: {
    nombre: "Lexi",
    rol: "Perfil",
    color: "#a78bfa",
    colorSecundario: "#7c3aed",
  },
  Inari: {
    nombre: "Inari",
    rol: "Vacantes y match",
    color: "#34d399",
    colorSecundario: "#059669",
  },
  Kenti: {
    nombre: "Kenti",
    rol: "Postulación",
    color: "#fbbf24",
    colorSecundario: "#d97706",
  },
  Iris: {
    nombre: "Iris",
    rol: "Seguimiento",
    color: "#60a5fa",
    colorSecundario: "#2563eb",
  },
};

interface AgenteSvgProps {
  agente: AgenteNombre;
  estado?: EstadoAgente;
  atenuado?: boolean;
  size?: number;
  className?: string;
}

export default function AgenteSvg({
  agente,
  estado = "reposo",
  atenuado = false,
  size = 76,
  className = "",
}: AgenteSvgProps) {
  const meta = AGENTES_META[agente];
  const colorActivo = estado === "alerta" ? "#fbbf24" : meta.color;
  const estadoEfectivo: EstadoAgente = atenuado ? "reposo" : estado;

  return (
    <div
      className={[
        "relative inline-flex items-center justify-center select-none transition-all duration-300 motion-reduce:transition-none",
        atenuado ? "opacity-45 saturate-50" : "opacity-100",
        className,
      ].join(" ")}
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
        {/* Halo exterior según estado */}
        {estadoEfectivo === "hablando" && (
          <>
            <circle
              cx="48"
              cy="50"
              r="42"
              stroke={colorActivo}
              strokeOpacity="0.35"
              strokeWidth="2.5"
              className="animate-ping motion-reduce:animate-none"
              style={{ transformOrigin: "48px 50px", animationDuration: "2.2s" }}
            />
            <circle
              cx="48"
              cy="50"
              r="40"
              stroke={colorActivo}
              strokeOpacity="0.7"
              strokeWidth="2"
            />
          </>
        )}

        {estadoEfectivo === "pensando" && (
          <circle
            cx="48"
            cy="50"
            r="40"
            stroke={meta.color}
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeDasharray="6 5"
            className="animate-spin-slow motion-reduce:animate-none"
            style={{ transformOrigin: "48px 50px" }}
          />
        )}

        {estadoEfectivo === "alerta" && (
          <circle
            cx="48"
            cy="50"
            r="41"
            stroke="#fbbf24"
            strokeOpacity="0.85"
            strokeWidth="2.5"
            className="animate-pulse motion-reduce:animate-none"
          />
        )}

        {/* Base circular del personaje */}
        <circle
          cx="48"
          cy="50"
          r="35"
          fill="#16162a"
          stroke={atenuado ? "#3f3f63" : colorActivo}
          strokeWidth={estadoEfectivo === "reposo" ? "2" : "2.8"}
        />
        <circle
          cx="48"
          cy="50"
          r="30"
          fill={meta.color}
          fillOpacity={atenuado ? "0.08" : "0.14"}
        />

        {/* Rasgos distintivos por agente */}
        {agente === "Lexi" && (
          <>
            {/* Diadema analítica de lectura de CV */}
            <path
              d="M24 44C24 30.745 34.745 20 48 20C61.255 20 72 30.745 72 44"
              stroke={meta.color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect
              x="41"
              y="15"
              width="14"
              height="8"
              rx="4"
              fill="#1e1e35"
              stroke={meta.color}
              strokeWidth="2"
            />
            <circle cx="48" cy="19" r="2" fill={meta.color} />
          </>
        )}

        {agente === "Inari" && (
          <>
            {/* Antenas/orejas de radar para búsqueda y afinidad */}
            <path
              d="M28 31L22 17L36 24Z"
              fill={meta.color}
              fillOpacity="0.28"
              stroke={meta.color}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path
              d="M68 31L74 17L60 24Z"
              fill={meta.color}
              fillOpacity="0.28"
              stroke={meta.color}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </>
        )}

        {agente === "Kenti" && (
          <>
            {/* Visera de mensajero de postulación */}
            <path
              d="M26 35C29 24 37.5 19 48 19C58.5 19 67 24 70 35"
              fill={meta.color}
              fillOpacity="0.25"
              stroke={meta.color}
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            <path
              d="M23 35H73"
              stroke={meta.color}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </>
        )}

        {agente === "Iris" && (
          <>
            {/* Antena guía / faro de seguimiento */}
            <line
              x1="48"
              y1="14"
              x2="48"
              y2="24"
              stroke={meta.color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle
              cx="48"
              cy="12"
              r="4"
              fill={meta.color}
              fillOpacity="0.9"
            />
            <path
              d="M36 16C39.5 13 43.5 11.5 48 11.5C52.5 11.5 56.5 13 60 16"
              stroke={meta.color}
              strokeOpacity="0.55"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Cabeza / rostro robótico amigable */}
        <rect
          x="26"
          y="33"
          width="44"
          height="32"
          rx="14"
          fill="#1e1e35"
          stroke={atenuado ? "#4a4a6a" : meta.color}
          strokeWidth="2"
        />

        {/* Gafas de Lexi */}
        {agente === "Lexi" && (
          <g stroke={meta.color} strokeOpacity="0.75" strokeWidth="1.6">
            <rect x="31" y="41" width="14" height="10" rx="4" fill="#16162a" />
            <rect x="51" y="41" width="14" height="10" rx="4" fill="#16162a" />
            <line x1="45" y1="46" x2="51" y2="46" />
          </g>
        )}

        {/* Ojos según estado */}
        {atenuado ? (
          <>
            <line
              x1="34"
              y1="46"
              x2="42"
              y2="46"
              stroke="#7a7a9a"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <line
              x1="54"
              y1="46"
              x2="62"
              y2="46"
              stroke="#7a7a9a"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        ) : estadoEfectivo === "pensando" ? (
          <>
            <circle cx="38" cy="44" r="3.3" fill={meta.color} />
            <circle cx="58" cy="44" r="3.3" fill={meta.color} />
            <circle cx="39.2" cy="42.8" r="1.1" fill="#ffffff" />
            <circle cx="59.2" cy="42.8" r="1.1" fill="#ffffff" />
          </>
        ) : estadoEfectivo === "alerta" ? (
          <>
            <path
              d="M33 40L42 42"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M63 40L54 42"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="38" cy="46" r="3.6" fill="#fbbf24" />
            <circle cx="58" cy="46" r="3.6" fill="#fbbf24" />
            <circle cx="38" cy="46" r="1.3" fill="#0f0f1a" />
            <circle cx="58" cy="46" r="1.3" fill="#0f0f1a" />
          </>
        ) : (
          <>
            <circle cx="38" cy="46" r="3.5" fill={meta.color} />
            <circle cx="58" cy="46" r="3.5" fill={meta.color} />
            <circle cx="39" cy="45" r="1.2" fill="#ffffff" />
            <circle cx="59" cy="45" r="1.2" fill="#ffffff" />
          </>
        )}

        {/* Boca / expresión según estado */}
        {atenuado ? (
          <line
            x1="43"
            y1="57"
            x2="53"
            y2="57"
            stroke="#7a7a9a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : estadoEfectivo === "hablando" ? (
          <rect
            x="42"
            y="53.5"
            width="12"
            height="6.5"
            rx="3.25"
            fill={meta.color}
            fillOpacity="0.3"
            stroke={meta.color}
            strokeWidth="2"
            className="animate-pulse motion-reduce:animate-none"
          />
        ) : estadoEfectivo === "pensando" ? (
          <path
            d="M43 57C45 55.5 47 58.5 49 57C51 55.5 52.5 57 53.5 57"
            stroke={meta.color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : estadoEfectivo === "alerta" ? (
          <circle
            cx="48"
            cy="57"
            r="2.8"
            stroke="#fbbf24"
            strokeWidth="2"
            fill="#fbbf24"
            fillOpacity="0.25"
          />
        ) : (
          <path
            d="M42 55.5C43.8 58 46 59 48 59C50 59 52.2 58 54 55.5"
            stroke={meta.color}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        )}

        {/* Emblema inferior por rol */}
        {agente === "Lexi" && (
          <rect
            x="43"
            y="69"
            width="10"
            height="7"
            rx="1.8"
            stroke={meta.color}
            strokeOpacity="0.8"
            strokeWidth="1.6"
          />
        )}
        {agente === "Inari" && (
          <path
            d="M48 68L50.2 72.2L54.5 72.8L51.2 75.8L52 80L48 77.8L44 80L44.8 75.8L41.5 72.8L45.8 72.2Z"
            fill={meta.color}
            fillOpacity="0.5"
          />
        )}
        {agente === "Kenti" && (
          <g stroke={meta.color} strokeOpacity="0.85" strokeWidth="1.5">
            <rect x="42" y="69" width="12" height="8" rx="1.5" />
            <path d="M42.5 70L48 74L53.5 70" />
          </g>
        )}
        {agente === "Iris" && (
          <path
            d="M42 74C44 71.5 46 70.5 48 70.5C50 70.5 52 71.5 54 74"
            stroke={meta.color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Indicadores flotantes de estado */}
        {estadoEfectivo === "hablando" && (
          <g stroke={meta.color} strokeWidth="2" strokeLinecap="round">
            <path
              d="M76 43C78.5 45.5 78.5 50.5 76 53"
              className="animate-pulse motion-reduce:animate-none"
            />
            <path
              d="M81 39.5C85 43.8 85 52.2 81 56.5"
              strokeOpacity="0.65"
              className="animate-pulse motion-reduce:animate-none"
            />
          </g>
        )}

        {estadoEfectivo === "pensando" && (
          <g fill={meta.color}>
            <circle
              cx="73"
              cy="28"
              r="2"
              className="animate-thinking motion-reduce:animate-none"
            />
            <circle
              cx="79"
              cy="22"
              r="2.7"
              className="animate-thinking motion-reduce:animate-none"
              style={{ animationDelay: "0.25s" }}
            />
            <circle
              cx="85"
              cy="15"
              r="3.4"
              className="animate-thinking motion-reduce:animate-none"
              style={{ animationDelay: "0.5s" }}
            />
          </g>
        )}

        {estadoEfectivo === "alerta" && (
          <g>
            <circle
              cx="76"
              cy="22"
              r="9.5"
              fill="#1e1e35"
              stroke="#fbbf24"
              strokeWidth="2.2"
            />
            <line
              x1="76"
              y1="17.5"
              x2="76"
              y2="23"
              stroke="#fbbf24"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="76" cy="26.5" r="1.3" fill="#fbbf24" />
          </g>
        )}
      </svg>
    </div>
  );
}

