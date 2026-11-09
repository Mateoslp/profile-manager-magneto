"use client";

import { useEffect, useState, useId } from "react";
import AgenteSvg from "@/components/escenario/AgenteSvg";
import BotonDictado from "@/components/BotonDictado";
import { apiEstructurarPrimerEmpleo } from "@/lib/api";
import { generarCvDesdeEntrevista, RespuestasEntrevista } from "./generarCv";

interface EntrevistaLexiProps {
  onFinalizar: (cvTexto: string) => void;
  loading?: boolean;
}

const CIUDADES_PRESET = [
  "Medellín",
  "Bogotá",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Remoto (Colombia)",
];

const MODALIDADES_PRESET = [
  { id: "remoto", label: "Remoto", desc: "100% desde cualquier lugar" },
  { id: "hibrido", label: "Híbrido", desc: "Días en oficina y casa" },
  { id: "presencial", label: "Presencial", desc: "En sede de la empresa" },
];

const NIVELES_EDUCACION = [
  "Bachiller",
  "Técnico",
  "Tecnólogo",
  "Pregrado / Profesional",
  "Especialización / Maestría",
  "Estudiante universitario",
];

const DISPONIBILIDADES = [
  "Inmediata",
  "En 15 días",
  "En 1 mes",
  "A convenir",
];

const HABILIDADES_CATALOGO = [
  "Python",
  "SQL",
  "Git",
  "APIs REST",
  "React",
  "TypeScript",
  "Next.js",
  "Docker",
  "AWS",
  "CI/CD",
  "Terraform",
  "Power BI",
  "Excel avanzado",
  "Figma",
  "Atención al cliente",
  "Negociación",
  "CRM",
  "Software contable",
  "Trabajo en equipo",
  "Comunicación asertiva",
  "Resolución de problemas",
];

const TOTAL_PASOS = 6;

export default function EntrevistaLexi({
  onFinalizar,
  loading = false,
}: EntrevistaLexiProps) {
  const [paso, setPaso] = useState<number>(1);
  const [ciudadCustom, setCiudadCustom] = useState<string>("");
  const [mostrarCiudadCustom, setMostrarCiudadCustom] = useState<boolean>(false);
  const [mostrarResumenMovil, setMostrarResumenMovil] = useState<boolean>(false);
  const inputCiudadId = useId();

  // Interacción explícita del usuario
  const [respondioPrimerEmpleo, setRespondioPrimerEmpleo] = useState<boolean>(false);
  const [movioExperiencia, setMovioExperiencia] = useState<boolean>(false);

  // Estados para estructuración de primer empleo con Gemini (Mejora 1)
  const [textoPrimerEmpleo, setTextoPrimerEmpleo] = useState<string>("");
  const [estructurandoPE, setEstructurandoPE] = useState<boolean>(false);
  const [peEstructurado, setPeEstructurado] = useState<boolean>(false);
  const [errorEstructurarPE, setErrorEstructurarPE] = useState<string | null>(null);

  const [respuestas, setRespuestas] = useState<RespuestasEntrevista>({
    nombre: "",
    email: "",
    telefono: "",
    ubicacion: "",
    modalidad: "",
    esPrimerEmpleo: false,
    experienciaAnios: 0,
    cargoReciente: "",
    estudiosPrimerEmpleo: "",
    proyectosPrimerEmpleo: "",
    voluntariadoPrimerEmpleo: "",
    educacion: "",
    disponibilidad: "",
    habilidades: [],
  });

  /* Cargar email de la sesión activa al montar */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const emailSesion = sessionStorage.getItem("likai_user");
      if (emailSesion) {
        setRespuestas((prev) => ({ ...prev, email: emailSesion }));
      }
    }
  }, []);

  function actualizarCampo<K extends keyof RespuestasEntrevista>(
    campo: K,
    valor: RespuestasEntrevista[K]
  ) {
    setRespuestas((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleOrdenarConLexi() {
    if (!textoPrimerEmpleo.trim() || textoPrimerEmpleo.trim().length < 10) return;
    setEstructurandoPE(true);
    setErrorEstructurarPE(null);
    try {
      const res = await apiEstructurarPrimerEmpleo(textoPrimerEmpleo.trim());
      setRespuestas((prev) => ({
        ...prev,
        estudiosPrimerEmpleo: res.estudios || "",
        proyectosPrimerEmpleo: res.proyectos || "",
        voluntariadoPrimerEmpleo: res.voluntariado || "",
      }));
      setPeEstructurado(true);
    } catch (err: unknown) {
      setErrorEstructurarPE(
        err instanceof Error
          ? err.message
          : "No se pudo ordenar automáticamente, pero puedes editar los campos abajo."
      );
      setRespuestas((prev) => ({
        ...prev,
        proyectosPrimerEmpleo: prev.proyectosPrimerEmpleo || textoPrimerEmpleo,
      }));
      setPeEstructurado(true);
    } finally {
      setEstructurandoPE(false);
    }
  }

  function toggleHabilidad(hab: string) {
    setRespuestas((prev) => {
      const existe = prev.habilidades.includes(hab);
      const nuevas = existe
        ? prev.habilidades.filter((h) => h !== hab)
        : [...prev.habilidades, hab];
      return { ...prev, habilidades: nuevas };
    });
  }

  const tieneDatosPrimerEmpleo =
    Boolean(respuestas.estudiosPrimerEmpleo.trim()) ||
    Boolean(respuestas.proyectosPrimerEmpleo.trim()) ||
    Boolean(respuestas.voluntariadoPrimerEmpleo.trim());

  /* Cálculo del porcentaje de completitud con campos reales (arranca en 0%) */
  const camposEvaluados = [
    Boolean(respuestas.nombre.trim()),
    Boolean(respuestas.telefono.trim()),
    Boolean(respuestas.ubicacion.trim()),
    Boolean(respuestas.modalidad.trim()),
    respondioPrimerEmpleo
      ? respuestas.esPrimerEmpleo
        ? tieneDatosPrimerEmpleo || textoPrimerEmpleo.trim().length >= 10
        : movioExperiencia || Boolean(respuestas.cargoReciente.trim())
      : false,
    Boolean(respuestas.educacion.trim()),
    Boolean(respuestas.disponibilidad.trim()),
    respuestas.habilidades.length > 0,
  ];

  const completados = camposEvaluados.filter(Boolean).length;
  const porcentaje = Math.round((completados / camposEvaluados.length) * 100);

  function irPaso(nuevoPaso: number) {
    if (nuevoPaso >= 1 && nuevoPaso <= TOTAL_PASOS) {
      setPaso(nuevoPaso);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  function pasoSiguiente() {
    irPaso(paso + 1);
  }

  function pasoAnterior() {
    irPaso(paso - 1);
  }

  function manejarEnvioFinal() {
    const cvGenerado = generarCvDesdeEntrevista(respuestas);
    onFinalizar(cvGenerado);
  }

  // Comentarios vivos y reactivos de Lexi por paso
  function obtenerMensajeLexi(): string {
    if (paso === 1) {
      if (respuestas.nombre.trim()) {
        return `¡Mucho gusto, ${respuestas.nombre.trim().split(" ")[0]}! Ahora completemos tu teléfono para que los reclutadores puedan contactarte.`;
      }
      return "¡Hola! Soy Lexi. Te guiaré paso a paso para estructurar tu perfil profesional. Empecemos con tus datos básicos.";
    }
    if (paso === 2) {
      if (respuestas.ubicacion && respuestas.modalidad) {
        return `Excelente: buscaremos oportunidades en ${respuestas.ubicacion} en modalidad ${respuestas.modalidad}.`;
      }
      if (respuestas.ubicacion) {
        return `¡Perfecto en ${respuestas.ubicacion}! Ahora cuéntame en qué modalidad prefieres trabajar.`;
      }
      return "¿Dónde te encuentras y en qué modalidad te gustaría trabajar? Esto es clave para que Inari calcule tu afinidad con las vacantes.";
    }
    if (paso === 3) {
      if (respondioPrimerEmpleo) {
        if (respuestas.esPrimerEmpleo) {
          return "¡Un gran comienzo! Enfocaremos tu perfil en tus estudios, proyectos destacados y voluntariado sin inventar experiencia laboral.";
        }
        return `Muy bien: ${respuestas.experienciaAnios || 1} ${
          (respuestas.experienciaAnios || 1) === 1 ? "año" : "años"
        } de experiencia laboral. Cuéntame cuál fue tu último cargo o rol.`;
      }
      return "Cuéntame sobre tu trayectoria: si es tu primer empleo, destacaremos tus proyectos y formación; si tienes experiencia previa, registraremos tus años y roles.";
    }
    if (paso === 4) {
      if (respuestas.educacion && respuestas.disponibilidad) {
        return `Formación ${respuestas.educacion} y disponibilidad ${respuestas.disponibilidad.toLowerCase()}. ¡Inari tendrá esto en cuenta!`;
      }
      return "¿Cuál es tu nivel de formación actual y qué tan pronto podrías comenzar a trabajar?";
    }
    if (paso === 5) {
      const cant = respuestas.habilidades.length;
      if (cant > 0) {
        return `¡Excelente selección! Llevas ${cant} ${cant === 1 ? "habilidad clave" : "habilidades clave"}. Cada una suma directamente a tu afinidad.`;
      }
      return "Selecciona tus principales fortalezas técnicas y blandas. Mientras más preciso seas, mejor será la recomendación.";
    }
    if (paso === 6) {
      return "¡Tu perfil está listo! Revisa cuidadosamente cada dato. Si quieres ajustar algo, pulsa Editar en cualquier sección antes de analizar con los agentes.";
    }
    return "Continuemos armando tu perfil profesional.";
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Barra de progreso viva */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/20 text-xs font-bold text-accent-light border border-accent/30 shadow-glow-sm">
              {paso}
            </span>
            <span className="font-semibold text-text-primary">
              Paso {paso} de {TOTAL_PASOS}:{" "}
              <span className="font-normal text-text-secondary">
                {paso === 1 && "Datos de contacto"}
                {paso === 2 && "Ubicación y modalidad"}
                {paso === 3 && "Trayectoria profesional"}
                {paso === 4 && "Educación y disponibilidad"}
                {paso === 5 && "Habilidades clave"}
                {paso === 6 && "Revisión final"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-48 h-2.5 rounded-full bg-surface-elevated overflow-hidden border border-surface-border/50">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-light transition-all duration-400 ease-out motion-reduce:duration-0"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <span className="text-xs font-bold text-accent-light min-w-[3rem] text-right">
              {porcentaje}%
            </span>
          </div>
        </div>

        {/* Botón para ver resumen en móvil */}
        <div className="mt-3 block lg:hidden">
          <button
            type="button"
            className="btn-ghost w-full text-xs text-text-muted justify-between border border-surface-border py-1.5"
            onClick={() => setMostrarResumenMovil(!mostrarResumenMovil)}
          >
            <span>{mostrarResumenMovil ? "Ocultar resumen del perfil" : "Ver resumen del perfil"}</span>
            <span>{mostrarResumenMovil ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* Contenedor en 2 columnas (formulario y resumen lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Principal: Pregunta actual con Lexi presente */}
        <div className="lg:col-span-8 card p-6 sm:p-8 space-y-6">
          {/* Mensaje reactivo de Lexi */}
          <div className="flex items-start gap-4 rounded-2xl bg-surface-elevated/80 p-4 border border-surface-border shadow-sm">
            <div className="shrink-0 pt-0.5">
              <AgenteSvg agente="Lexi" estado="hablando" size={56} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent-light tracking-wide uppercase">
                  Lexi
                </span>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">
                  · Estructuración de Perfil
                </span>
              </div>
              <p className="text-sm text-text-primary leading-relaxed" aria-live="polite">
                {obtenerMensajeLexi()}
              </p>
            </div>
          </div>

          {/* Formulario según el paso con animación de entrada */}
          <div key={paso} className="animate-fade-in motion-reduce:animate-none space-y-6 pt-1">
            {/* PASO 1: CONTACTO */}
            {paso === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="contacto-nombre" className="label mb-0">
                      Nombre completo <span className="text-status-error">*</span>
                    </label>
                    <BotonDictado
                      onTextoReconocido={(t) =>
                        actualizarCampo(
                          "nombre",
                          respuestas.nombre ? `${respuestas.nombre} ${t}` : t
                        )
                      }
                      label="Dictar"
                    />
                  </div>
                  <input
                    id="contacto-nombre"
                    type="text"
                    className="input"
                    placeholder="Ej. Ana María Gómez"
                    value={respuestas.nombre}
                    onChange={(e) => actualizarCampo("nombre", e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="contacto-email" className="label">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <input
                      id="contacto-email"
                      type="email"
                      className="input opacity-70 cursor-not-allowed bg-surface-card"
                      value={respuestas.email || "cargando..."}
                      disabled
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-light">
                      De tu cuenta
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    El correo se asocia a tu cuenta autenticada para proteger tu perfil.
                  </p>
                </div>

                <div>
                  <label htmlFor="contacto-telefono" className="label">
                    Teléfono o celular de contacto <span className="text-status-error">*</span>
                  </label>
                  <input
                    id="contacto-telefono"
                    type="tel"
                    className="input"
                    placeholder="Ej. 3001234567"
                    value={respuestas.telefono}
                    onChange={(e) => actualizarCampo("telefono", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* PASO 2: UBICACIÓN Y MODALIDAD */}
            {paso === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="label">
                    Ciudad de residencia <span className="text-status-error">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CIUDADES_PRESET.map((c) => {
                      const seleccionada =
                        !mostrarCiudadCustom && respuestas.ubicacion === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setMostrarCiudadCustom(false);
                            actualizarCampo("ubicacion", c);
                          }}
                          className={[
                            "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 motion-reduce:transition-none",
                            "active:scale-95 hover:scale-[1.02]",
                            seleccionada
                              ? "bg-accent text-white shadow-glow-sm ring-2 ring-accent"
                              : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-text-primary",
                          ].join(" ")}
                        >
                          {c}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setMostrarCiudadCustom(true)}
                      className={[
                        "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 motion-reduce:transition-none",
                        "active:scale-95 hover:scale-[1.02]",
                        mostrarCiudadCustom
                          ? "bg-accent text-white shadow-glow-sm ring-2 ring-accent"
                          : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-text-primary",
                      ].join(" ")}
                    >
                      ✏️ Otra ciudad...
                    </button>
                  </div>

                  {mostrarCiudadCustom && (
                    <div className="mt-3">
                      <label htmlFor={inputCiudadId} className="sr-only">
                        Nombre de la otra ciudad
                      </label>
                      <input
                        id={inputCiudadId}
                        type="text"
                        className="input"
                        placeholder="Escribe el nombre de tu ciudad o municipio"
                        value={ciudadCustom}
                        onChange={(e) => {
                          setCiudadCustom(e.target.value);
                          actualizarCampo("ubicacion", e.target.value);
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">
                    Modalidad de trabajo preferida <span className="text-status-error">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {MODALIDADES_PRESET.map((m) => {
                      const seleccionada = respuestas.modalidad === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => actualizarCampo("modalidad", m.id)}
                          className={[
                            "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-150 motion-reduce:transition-none",
                            "active:scale-95 hover:scale-[1.01]",
                            seleccionada
                              ? "border-accent bg-accent/15 ring-2 ring-accent/30 shadow-glow-sm"
                              : "border-surface-border bg-surface-elevated hover:border-surface-border/80",
                          ].join(" ")}
                        >
                          <span className="font-semibold text-sm text-text-primary">
                            {m.label}
                          </span>
                          <span className="text-xs text-text-muted">
                            {m.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: TRAYECTORIA Y PRIMER EMPLEO */}
            {paso === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="label">
                    ¿Te encuentras en búsqueda de tu primer empleo formal?
                  </label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRespondioPrimerEmpleo(true);
                        actualizarCampo("esPrimerEmpleo", true);
                        actualizarCampo("experienciaAnios", 0);
                      }}
                      className={[
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-all duration-150 motion-reduce:transition-none",
                        "active:scale-95 hover:scale-[1.01]",
                        respondioPrimerEmpleo && respuestas.esPrimerEmpleo
                          ? "border-accent bg-accent/15 ring-2 ring-accent/30 shadow-glow-sm"
                          : "border-surface-border bg-surface-elevated hover:border-accent",
                      ].join(" ")}
                    >
                      <span className="text-2xl">🎓</span>
                      <span className="font-semibold text-sm text-text-primary">
                        Sí, primer empleo
                      </span>
                      <span className="text-xs text-text-muted">
                        Destacaremos estudios y proyectos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRespondioPrimerEmpleo(true);
                        actualizarCampo("esPrimerEmpleo", false);
                        if (respuestas.experienciaAnios === 0) {
                          actualizarCampo("experienciaAnios", 1);
                        }
                      }}
                      className={[
                        "flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition-all duration-150 motion-reduce:transition-none",
                        "active:scale-95 hover:scale-[1.01]",
                        respondioPrimerEmpleo && !respuestas.esPrimerEmpleo
                          ? "border-accent bg-accent/15 ring-2 ring-accent/30 shadow-glow-sm"
                          : "border-surface-border bg-surface-elevated hover:border-accent",
                      ].join(" ")}
                    >
                      <span className="text-2xl">💼</span>
                      <span className="font-semibold text-sm text-text-primary">
                        No, tengo experiencia
                      </span>
                      <span className="text-xs text-text-muted">
                        He trabajado en empresas o proyectos
                      </span>
                    </button>
                  </div>
                </div>

                {/* Subformulario según la respuesta de trayectoria */}
                {respondioPrimerEmpleo ? (
                  respuestas.esPrimerEmpleo ? (
                    <div className="space-y-4 rounded-2xl border border-surface-border bg-surface-elevated/40 p-5 animate-fade-in motion-reduce:animate-none">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-accent-light">
                          <span aria-hidden="true">ℹ️</span>
                          <span>Configuración de primer empleo (0 años de experiencia)</span>
                        </div>
                        {peEstructurado && (
                          <button
                            type="button"
                            onClick={() => setPeEstructurado(false)}
                            className="text-[11px] text-accent hover:underline font-semibold"
                          >
                            ✏️ Redactar con tus palabras de nuevo
                          </button>
                        )}
                      </div>

                      {!peEstructurado ? (
                        /* Caja única: Cuéntame con tus palabras qué has estudiado o hecho */
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <label htmlFor="pe-texto-libre" className="label mb-0">
                                Cuéntame con tus palabras qué has estudiado o hecho <span className="text-status-error">*</span>
                              </label>
                              <BotonDictado
                                onTextoReconocido={(t) =>
                                  setTextoPrimerEmpleo((prev) => (prev ? `${prev} ${t}` : t))
                                }
                                label="Dictar"
                              />
                            </div>
                            <textarea
                              id="pe-texto-libre"
                              rows={5}
                              className="textarea w-full text-xs"
                              placeholder="Ejemplo: Estudio 8vo semestre de Ingeniería de Sistemas. En clase desarrollé una aplicación de gestión con Python y SQL, y en mi tiempo libre ayudé a construir una página web para un negocio familiar. También participo en el semillero de desarrollo web de mi universidad."
                              value={textoPrimerEmpleo}
                              onChange={(e) => setTextoPrimerEmpleo(e.target.value)}
                              maxLength={1500}
                            />
                            <div className="flex justify-between text-[11px] text-text-muted mt-1">
                              <span>Mínimo 10 caracteres · Cuéntanos tus estudios, proyectos o voluntariado</span>
                              <span>{textoPrimerEmpleo.length} / 1500</span>
                            </div>
                          </div>

                          {errorEstructurarPE && (
                            <div className="alert-warning text-xs flex items-center gap-2">
                              <span>⚠️</span>
                              <p>{errorEstructurarPE}</p>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              id="btn-ordenar-con-lexi"
                              onClick={handleOrdenarConLexi}
                              disabled={textoPrimerEmpleo.trim().length < 10 || estructurandoPE}
                              className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 active:scale-95 transition-transform"
                            >
                              {estructurandoPE ? (
                                <>
                                  <span className="animate-spin text-xs">⏳</span>
                                  <span>Lexi está ordenando tus experiencias...</span>
                                </>
                              ) : (
                                <>
                                  <span>✨ Ordenar con Lexi</span>
                                  <span aria-hidden="true">→</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Los tres campos rellenados y EDITABLES */
                        <div className="space-y-4 animate-fade-in motion-reduce:animate-none">
                          <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-xs text-text-primary flex items-start gap-2.5">
                            <span className="text-base" aria-hidden="true">✨</span>
                            <p>
                              <strong>Lexi organizó tu información:</strong> Revisa y edita los campos si lo deseas antes de continuar con la entrevista.
                            </p>
                          </div>

                          <div>
                            <label htmlFor="pe-estudios" className="label">
                              Estudios en curso o recientes
                            </label>
                            <input
                              id="pe-estudios"
                              type="text"
                              className="input text-xs"
                              placeholder="Ej. Estudiante de 8vo semestre de Ingeniería de Sistemas"
                              value={respuestas.estudiosPrimerEmpleo}
                              onChange={(e) =>
                                actualizarCampo("estudiosPrimerEmpleo", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label htmlFor="pe-proyectos" className="label">
                              Proyectos destacados (académicos o personales)
                            </label>
                            <textarea
                              id="pe-proyectos"
                              className="textarea min-h-[80px] text-xs"
                              placeholder="Ej. Desarrollé una aplicación con Python y SQL para el curso de bases de datos."
                              value={respuestas.proyectosPrimerEmpleo}
                              onChange={(e) =>
                                actualizarCampo("proyectosPrimerEmpleo", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label htmlFor="pe-voluntariado" className="label">
                              Voluntariado, semilleros o actividades extracurriculares
                            </label>
                            <textarea
                              id="pe-voluntariado"
                              className="textarea min-h-[70px] text-xs"
                              placeholder="Ej. Monitor de algoritmos o voluntario en comunidades tecnológicas."
                              value={respuestas.voluntariadoPrimerEmpleo}
                              onChange={(e) =>
                                actualizarCampo(
                                  "voluntariadoPrimerEmpleo",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Rama Con Experiencia */
                    <div className="space-y-4 rounded-2xl border border-surface-border bg-surface-elevated/40 p-4 animate-fade-in motion-reduce:animate-none">
                      <div>
                        <label htmlFor="exp-anios" className="label">
                          Años de experiencia laboral aproximada:{" "}
                          <span className="font-bold text-accent-light">
                            {movioExperiencia || respuestas.experienciaAnios > 0
                              ? `${respuestas.experienciaAnios || 1} ${
                                  (respuestas.experienciaAnios || 1) === 1 ? "año" : "años"
                                }`
                              : "1 año (desliza para ajustar)"}
                          </span>
                        </label>
                        <input
                          id="exp-anios"
                          type="range"
                          min="1"
                          max="15"
                          step="1"
                          className="w-full accent-accent cursor-pointer"
                          value={respuestas.experienciaAnios || 1}
                          onChange={(e) => {
                            setMovioExperiencia(true);
                            actualizarCampo("experienciaAnios", Number(e.target.value));
                          }}
                        />
                        <div className="flex justify-between text-[11px] text-text-muted mt-1">
                          <span>1 año</span>
                          <span>5 años</span>
                          <span>10 años</span>
                          <span>15+ años</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label htmlFor="exp-cargo" className="label mb-0">
                            Último cargo o rol desempeñado
                          </label>
                          <BotonDictado
                            onTextoReconocido={(t) => {
                              setMovioExperiencia(true);
                              actualizarCampo(
                                "cargoReciente",
                                respuestas.cargoReciente
                                  ? `${respuestas.cargoReciente} ${t}`
                                  : t
                              );
                            }}
                            label="Dictar"
                          />
                        </div>
                        <input
                          id="exp-cargo"
                          type="text"
                          className="input"
                          placeholder="Ej. Desarrollador Junior / Analista de Datos"
                          value={respuestas.cargoReciente}
                          onChange={(e) => {
                            setMovioExperiencia(true);
                            actualizarCampo("cargoReciente", e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-surface-border p-4 text-center text-xs text-text-muted">
                    Selecciona una de las dos opciones arriba para continuar.
                  </div>
                )}
              </div>
            )}

            {/* PASO 4: EDUCACIÓN Y DISPONIBILIDAD */}
            {paso === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="label">
                    Nivel de educación alcanzado o en curso <span className="text-status-error">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {NIVELES_EDUCACION.map((n) => {
                      const seleccionada = respuestas.educacion === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => actualizarCampo("educacion", n)}
                          className={[
                            "rounded-xl px-4 py-3 text-xs font-semibold text-center transition-all duration-150 motion-reduce:transition-none",
                            "active:scale-95 hover:scale-[1.01]",
                            seleccionada
                              ? "bg-accent text-white shadow-glow-sm ring-2 ring-accent"
                              : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-text-primary",
                          ].join(" ")}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">
                    Disponibilidad para iniciar labores <span className="text-status-error">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {DISPONIBILIDADES.map((d) => {
                      const seleccionada = respuestas.disponibilidad === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => actualizarCampo("disponibilidad", d)}
                          className={[
                            "rounded-xl px-4 py-3 text-xs font-semibold text-center transition-all duration-150 motion-reduce:transition-none",
                            "active:scale-95 hover:scale-[1.01]",
                            seleccionada
                              ? "bg-accent text-white shadow-glow-sm ring-2 ring-accent"
                              : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-text-primary",
                          ].join(" ")}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 5: HABILIDADES */}
            {paso === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">
                    Habilidades y competencias (selecciona las que apliquen)
                  </label>
                  <span className="text-xs font-semibold text-accent-light">
                    {respuestas.habilidades.length} seleccionadas
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {HABILIDADES_CATALOGO.map((hab) => {
                    const activa = respuestas.habilidades.includes(hab);
                    return (
                      <button
                        key={hab}
                        type="button"
                        onClick={() => toggleHabilidad(hab)}
                        className={[
                          "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 motion-reduce:transition-none flex items-center gap-1.5",
                          "active:scale-90 hover:scale-[1.03]",
                          activa
                            ? "bg-accent text-white shadow-glow-sm border border-accent ring-1 ring-accent-light/50"
                            : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent/60",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">{activa ? "✓" : "+"}</span>
                        <span>{hab}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-text-muted">
                  Estas habilidades se comparan directamente con las vacantes en la plataforma para calcular tu afinidad.
                </p>
              </div>
            )}

            {/* PASO 6: REVISIÓN FINAL */}
            {paso === 6 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-surface-border bg-surface-elevated/40 p-3.5 text-xs text-text-secondary flex items-start gap-2.5">
                  <span className="text-base select-none" aria-hidden="true">💡</span>
                  <p>
                    Revisa la información antes del análisis. Recuerda que podrás ajustar tus prioridades y filtros salariales en el siguiente paso.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Tarjeta Contacto */}
                  <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                        Contacto
                      </span>
                      <button
                        type="button"
                        onClick={() => irPaso(1)}
                        className="text-accent hover:underline text-[11px] font-semibold"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="font-semibold text-text-primary">
                      {respuestas.nombre || "No especificado"}
                    </p>
                    <p className="text-text-muted">{respuestas.email}</p>
                    <p className="text-text-muted">Tel: {respuestas.telefono || "Sin teléfono"}</p>
                  </div>

                  {/* Tarjeta Ubicación y Modalidad */}
                  <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                        Ubicación y Modalidad
                      </span>
                      <button
                        type="button"
                        onClick={() => irPaso(2)}
                        className="text-accent hover:underline text-[11px] font-semibold"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="font-semibold text-text-primary capitalize">
                      {respuestas.ubicacion || "Por definir"}
                    </p>
                    <p className="text-text-muted capitalize">
                      Modalidad: {respuestas.modalidad || "Por definir"}
                    </p>
                  </div>

                  {/* Tarjeta Trayectoria */}
                  <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                        Trayectoria
                      </span>
                      <button
                        type="button"
                        onClick={() => irPaso(3)}
                        className="text-accent hover:underline text-[11px] font-semibold"
                      >
                        Editar
                      </button>
                    </div>
                    {!respondioPrimerEmpleo ? (
                      <p className="font-semibold text-text-primary">
                        Por definir
                      </p>
                    ) : respuestas.esPrimerEmpleo ? (
                      <div>
                        <p className="font-semibold text-text-primary">
                          En búsqueda de primer empleo (0 años)
                        </p>
                        {respuestas.estudiosPrimerEmpleo && (
                          <p className="text-text-muted line-clamp-1">
                            Estudios: {respuestas.estudiosPrimerEmpleo}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-text-primary">
                          {respuestas.experienciaAnios} {respuestas.experienciaAnios === 1 ? "año" : "años"} de experiencia
                        </p>
                        <p className="text-text-muted">
                          Cargo: {respuestas.cargoReciente || "No indicado"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta Educación */}
                  <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                        Educación y Disponibilidad
                      </span>
                      <button
                        type="button"
                        onClick={() => irPaso(4)}
                        className="text-accent hover:underline text-[11px] font-semibold"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="font-semibold text-text-primary">
                      {respuestas.educacion || "Por definir"}
                    </p>
                    <p className="text-text-muted">
                      Disponibilidad: {respuestas.disponibilidad || "Por definir"}
                    </p>
                  </div>
                </div>

                {/* Habilidades en revisión */}
                <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                      Habilidades seleccionadas ({respuestas.habilidades.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => irPaso(5)}
                      className="text-accent hover:underline text-[11px] font-semibold"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {respuestas.habilidades.length > 0 ? (
                      respuestas.habilidades.map((h) => (
                        <span
                          key={h}
                          className="rounded-full bg-accent/20 border border-accent/30 px-2.5 py-0.5 text-[11px] text-accent-light font-medium"
                        >
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted italic">
                        Sin habilidades seleccionadas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de navegación Anterior / Siguiente */}
          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            {paso > 1 ? (
              <button
                type="button"
                className="btn-secondary text-xs sm:text-sm active:scale-95 transition-transform motion-reduce:transition-none"
                onClick={pasoAnterior}
                disabled={loading}
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            {paso < TOTAL_PASOS ? (
              <button
                type="button"
                className="btn-primary text-xs sm:text-sm active:scale-95 transition-transform motion-reduce:transition-none"
                onClick={pasoSiguiente}
                disabled={loading}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary text-xs sm:text-sm active:scale-95 transition-transform motion-reduce:transition-none"
                onClick={manejarEnvioFinal}
                disabled={loading || !respuestas.nombre.trim()}
              >
                {loading ? "Procesando..." : "✨ Analizar con los agentes"}
              </button>
            )}
          </div>
        </div>

        {/* Columna Lateral: Resumen del perfil en construcción animado */}
        <div
          className={[
            "lg:col-span-4 card p-5 space-y-4 lg:sticky lg:top-4 transition-all duration-300",
            mostrarResumenMovil ? "block" : "hidden lg:block",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-text-primary">
              Tu Perfil en Construcción
            </span>
            <span className="text-xs font-bold text-accent-light">
              {porcentaje}%
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="transition-all duration-200">
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Candidato
              </span>
              <span className={`font-medium ${respuestas.nombre ? "text-text-primary" : "text-text-muted italic"}`}>
                {respuestas.nombre || "(Sin nombre aún)"}
              </span>
            </div>

            <div className="transition-all duration-200">
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Ubicación y Modalidad
              </span>
              <span className={`font-medium capitalize ${respuestas.ubicacion || respuestas.modalidad ? "text-text-primary" : "text-text-muted italic"}`}>
                {respuestas.ubicacion || respuestas.modalidad
                  ? `${respuestas.ubicacion || "(Sin ciudad)"} · ${
                      respuestas.modalidad || "(Sin modalidad)"
                    }`
                  : "(Por definir)"}
              </span>
            </div>

            <div className="transition-all duration-200">
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Trayectoria
              </span>
              <span className={`font-medium ${respondioPrimerEmpleo ? "text-text-primary" : "text-text-muted italic"}`}>
                {!respondioPrimerEmpleo
                  ? "(Por definir)"
                  : respuestas.esPrimerEmpleo
                  ? "Primer empleo (0 años)"
                  : `${respuestas.experienciaAnios} ${
                      respuestas.experienciaAnios === 1 ? "año" : "años"
                    } ${
                      respuestas.cargoReciente
                        ? `· ${respuestas.cargoReciente}`
                        : ""
                    }`}
              </span>
            </div>

            <div className="transition-all duration-200">
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Educación y Disponibilidad
              </span>
              <span className={`font-medium ${respuestas.educacion || respuestas.disponibilidad ? "text-text-primary" : "text-text-muted italic"}`}>
                {respuestas.educacion || respuestas.disponibilidad
                  ? `${respuestas.educacion || "(Sin educación)"} · ${
                      respuestas.disponibilidad || "(Sin disponibilidad)"
                    }`
                  : "(Por definir)"}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold mb-1">
                Habilidades ({respuestas.habilidades.length})
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {respuestas.habilidades.length > 0 ? (
                  respuestas.habilidades.map((h) => (
                    <span
                      key={h}
                      className="rounded-lg bg-surface-elevated px-2 py-0.5 text-[10px] text-accent-light border border-surface-border font-medium animate-fade-in motion-reduce:animate-none"
                    >
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="text-text-muted text-[10px] italic">
                    (Ninguna seleccionada)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
