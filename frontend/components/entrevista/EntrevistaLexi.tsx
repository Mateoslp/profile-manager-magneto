"use client";

import { useEffect, useState, useId } from "react";
import AgenteSvg from "@/components/escenario/AgenteSvg";
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
  { id: "remoto", label: "Remoto", desc: "100% desde casa" },
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

const SALARIOS_PRESET = [
  1800000,
  2500000,
  3500000,
  4500000,
  6000000,
  8000000,
];

const TOTAL_PASOS = 7;

export default function EntrevistaLexi({
  onFinalizar,
  loading = false,
}: EntrevistaLexiProps) {
  const [paso, setPaso] = useState<number>(1);
  const [ciudadCustom, setCiudadCustom] = useState<string>("");
  const [mostrarCiudadCustom, setMostrarCiudadCustom] = useState<boolean>(false);
  const [mostrarResumenMovil, setMostrarResumenMovil] = useState<boolean>(false);
  const inputCiudadId = useId();

  // Estados para rastrear interacción explícita del usuario
  const [respondioPrimerEmpleo, setRespondioPrimerEmpleo] = useState<boolean>(false);
  const [movioExperiencia, setMovioExperiencia] = useState<boolean>(false);
  const [movioSalario, setMovioSalario] = useState<boolean>(false);

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
    aspiracionSalarial: 0,
  });

  /* Cargar el email de la sesión activa al montar */
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

  function toggleHabilidad(hab: string) {
    setRespuestas((prev) => {
      const existe = prev.habilidades.includes(hab);
      const nuevas = existe
        ? prev.habilidades.filter((h) => h !== hab)
        : [...prev.habilidades, hab];
      return { ...prev, habilidades: nuevas };
    });
  }

  /* Cálculo del porcentaje de completitud con campos reales (solo cuenta interacción real) */
  const camposEvaluados = [
    Boolean(respuestas.nombre.trim()),
    Boolean(respuestas.telefono.trim()),
    Boolean(respuestas.ubicacion.trim()),
    Boolean(respuestas.modalidad.trim()),
    respondioPrimerEmpleo
      ? respuestas.esPrimerEmpleo
        ? true
        : movioExperiencia || Boolean(respuestas.cargoReciente.trim())
      : false,
    Boolean(respuestas.educacion.trim()),
    Boolean(respuestas.disponibilidad.trim()),
    respuestas.habilidades.length > 0,
    movioSalario && respuestas.aspiracionSalarial > 0,
  ];

  const completados = camposEvaluados.filter(Boolean).length;
  const porcentaje = Math.round((completados / camposEvaluados.length) * 100);

  function irPaso(nuevoPaso: number) {
    if (nuevoPaso >= 1 && nuevoPaso <= TOTAL_PASOS) {
      setPaso(nuevoPaso);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  function formatearPesos(val: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Barra de progreso superior */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-light">
              {paso}
            </span>
            <span className="font-medium text-text-primary">
              Paso {paso} de {TOTAL_PASOS}:{" "}
              {paso === 1 && "Datos de contacto"}
              {paso === 2 && "Ubicación y modalidad"}
              {paso === 3 && "¿Es tu primer empleo?"}
              {paso === 4 && "Educación y disponibilidad"}
              {paso === 5 && "Habilidades clave"}
              {paso === 6 && "Aspiración salarial"}
              {paso === 7 && "Revisión final"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-44 h-2.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-accent-light min-w-[3rem] text-right">
              {porcentaje}%
            </span>
          </div>
        </div>

        {/* Botón para ver resumen en móvil */}
        <div className="mt-2 block lg:hidden">
          <button
            type="button"
            className="btn-ghost w-full text-xs text-text-muted justify-between"
            onClick={() => setMostrarResumenMovil(!mostrarResumenMovil)}
          >
            <span>{mostrarResumenMovil ? "Ocultar resumen del perfil" : "Ver resumen del perfil"}</span>
            <span>{mostrarResumenMovil ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* Contenedor en 2 columnas (formulario y resumen lateral) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Principal: Pregunta actual */}
        <div className="lg:col-span-8 card p-6 sm:p-8 space-y-6">
          {/* Mensaje de Lexi */}
          <div className="flex items-start gap-4 rounded-xl bg-surface-elevated/70 p-4 border border-surface-border">
            <div className="shrink-0">
              <AgenteSvg agente="Lexi" estado="hablando" size={54} />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs font-bold text-accent-light tracking-wide uppercase">
                Lexi · Especialista de Perfil
              </span>
              <p className="text-sm text-text-primary leading-relaxed">
                {paso === 1 &&
                  "¡Hola! Te ayudaré a estructurar tu perfil paso a paso. Empecemos con tu nombre y teléfono para que las empresas te contacten."}
                {paso === 2 &&
                  "¿Dónde te encuentras y en qué modalidad te gustaría trabajar? Esto es clave para que Inari calcule tu afinidad con las vacantes."}
                {paso === 3 &&
                  "Si es tu primer empleo, no te preocupes: destacaremos tus estudios, proyectos y voluntariado sin inventar experiencia laboral."}
                {paso === 4 &&
                  "Cuéntame cuál es tu nivel educativo actual y cuándo estarías disponible para comenzar."}
                {paso === 5 &&
                  "Selecciona las habilidades que dominas o estás desarrollando. Puedes marcar varias."}
                {paso === 6 &&
                  "¿Cuál es tu aspiración salarial mensual en pesos colombianos (COP)? Las vacantes en la plataforma van desde $1.500.000 hasta $8.500.000 COP."}
                {paso === 7 &&
                  "¡Excelente trabajo! Revisa las respuestas antes de analizarlas. Puedes editar cualquier sección con un clic."}
              </p>
            </div>
          </div>

          {/* Formulario según el paso */}
          <div className="space-y-6 pt-2">
            {/* PASO 1: CONTACTO */}
            {paso === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="contacto-nombre" className="label">
                    Nombre completo <span className="text-status-error">*</span>
                  </label>
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-light">
                      De tu cuenta
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    El correo se asocia a tu usuario autenticado para proteger tu perfil.
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
                            "rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                            seleccionada
                              ? "bg-accent text-white shadow-sm ring-2 ring-accent"
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
                        "rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                        mostrarCiudadCustom
                          ? "bg-accent text-white shadow-sm ring-2 ring-accent"
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
                            "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                            seleccionada
                              ? "border-accent bg-accent/15 ring-2 ring-accent/30"
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
                        "flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-all",
                        respondioPrimerEmpleo && respuestas.esPrimerEmpleo
                          ? "border-accent bg-accent/15 ring-2 ring-accent/30"
                          : "border-surface-border bg-surface-elevated hover:border-accent",
                      ].join(" ")}
                    >
                      <span className="text-xl">🎓</span>
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
                        "flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition-all",
                        respondioPrimerEmpleo && !respuestas.esPrimerEmpleo
                          ? "border-accent bg-accent/15 ring-2 ring-accent/30"
                          : "border-surface-border bg-surface-elevated hover:border-accent",
                      ].join(" ")}
                    >
                      <span className="text-xl">💼</span>
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
                    <div className="space-y-4 rounded-2xl border border-surface-border bg-surface-elevated/40 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-accent-light">
                        <span>ℹ️</span>
                        <span>Configuración de primer empleo (0 años de experiencia)</span>
                      </div>

                      <div>
                        <label htmlFor="pe-estudios" className="label">
                          ¿Qué estás estudiando o acabas de estudiar?
                        </label>
                        <input
                          id="pe-estudios"
                          type="text"
                          className="input"
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
                          className="textarea min-h-[90px]"
                          placeholder="Ej. Desarrollé una aplicación de gestión con Python y SQL para el curso de bases de datos."
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
                          className="textarea min-h-[80px]"
                          placeholder="Ej. Monitor de algoritmos o voluntario en eventos de tecnología comunitaria."
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
                  ) : (
                    /* Rama Con Experiencia */
                    <div className="space-y-4 rounded-2xl border border-surface-border bg-surface-elevated/40 p-4">
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
                        <label htmlFor="exp-cargo" className="label">
                          Último cargo o rol desempeñado
                        </label>
                        <input
                          id="exp-cargo"
                          type="text"
                          className="input"
                          placeholder="Ej. Desarrollador Junior / Analista de Soporte"
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
                            "rounded-xl px-4 py-3 text-xs font-semibold text-center transition-all",
                            seleccionada
                              ? "bg-accent text-white shadow-sm ring-2 ring-accent"
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
                            "rounded-xl px-4 py-3 text-xs font-semibold text-center transition-all",
                            seleccionada
                              ? "bg-accent text-white shadow-sm ring-2 ring-accent"
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
                          "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
                          activa
                            ? "bg-accent text-white shadow-sm border border-accent"
                            : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent/60",
                        ].join(" ")}
                      >
                        <span>{activa ? "✓" : "+"}</span>
                        <span>{hab}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-text-muted">
                  Estas habilidades se comparan directamente con las vacantes activas en Magneto para calcular tu afinidad.
                </p>
              </div>
            )}

            {/* PASO 6: SALARIO */}
            {paso === 6 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="salario-input" className="label">
                    Aspiración salarial mensual en pesos colombianos (COP) <span className="text-status-error">*</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-accent-light">
                      {movioSalario && respuestas.aspiracionSalarial > 0
                        ? formatearPesos(respuestas.aspiracionSalarial)
                        : "$3.500.000 COP"}
                    </span>
                    <span className="text-xs text-text-muted font-medium">
                      {movioSalario && respuestas.aspiracionSalarial > 0
                        ? "/ mes"
                        : "(mueve el deslizador o elige un monto para registrar)"}
                    </span>
                  </div>

                  <div className="pt-4">
                    <input
                      id="salario-input"
                      type="range"
                      min="1500000"
                      max="10000000"
                      step="100000"
                      className="w-full accent-accent cursor-pointer"
                      value={respuestas.aspiracionSalarial || 3500000}
                      onChange={(e) => {
                        setMovioSalario(true);
                        actualizarCampo(
                          "aspiracionSalarial",
                          Number(e.target.value)
                        );
                      }}
                    />
                    <div className="flex justify-between text-[11px] text-text-muted mt-1">
                      <span>$1.500.000 COP</span>
                      <span>$5.000.000 COP</span>
                      <span>$10.000.000 COP</span>
                    </div>
                  </div>
                </div>

                {/* Presets rápidos */}
                <div>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                    Montos sugeridos habituales:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SALARIOS_PRESET.map((monto) => {
                      const activo =
                        movioSalario && respuestas.aspiracionSalarial === monto;
                      return (
                        <button
                          key={monto}
                          type="button"
                          onClick={() => {
                            setMovioSalario(true);
                            actualizarCampo("aspiracionSalarial", monto);
                          }}
                          className={[
                            "rounded-xl px-3 py-2 text-xs font-semibold transition-all text-center",
                            activo
                              ? "bg-accent text-white shadow-sm ring-2 ring-accent"
                              : "border border-surface-border bg-surface-elevated text-text-secondary hover:border-accent hover:text-text-primary",
                          ].join(" ")}
                        >
                          {formatearPesos(monto)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 7: REVISIÓN FINAL */}
            {paso === 7 && (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary">
                  Revisa los datos de tu perfil. Si deseas modificar algo, pulsa el botón de editar correspondiente.
                </p>

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
                        Experiencia
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
                        Educación y Salario
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
                    <p className="text-text-muted font-medium">
                      Aspiración:{" "}
                      {movioSalario && respuestas.aspiracionSalarial > 0
                        ? formatearPesos(respuestas.aspiracionSalarial)
                        : "Por definir"}
                    </p>
                  </div>
                </div>

                {/* Habilidades en revisión */}
                <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent-light uppercase tracking-wider text-[11px]">
                      Habilidades ({respuestas.habilidades.length})
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
                className="btn-secondary text-xs sm:text-sm"
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
                className="btn-primary text-xs sm:text-sm"
                onClick={pasoSiguiente}
                disabled={loading}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary text-xs sm:text-sm"
                onClick={manejarEnvioFinal}
                disabled={loading || !respuestas.nombre.trim()}
              >
                {loading ? "Procesando..." : "✨ Analizar con los agentes"}
              </button>
            )}
          </div>
        </div>

        {/* Columna Lateral: Resumen del perfil en tiempo real */}
        <div
          className={[
            "lg:col-span-4 card p-5 space-y-4 lg:sticky lg:top-4",
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

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Candidato
              </span>
              <span className="font-medium text-text-primary">
                {respuestas.nombre || "(Sin nombre aún)"}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Ubicación y Modalidad
              </span>
              <span className="font-medium text-text-primary capitalize">
                {respuestas.ubicacion || respuestas.modalidad
                  ? `${respuestas.ubicacion || "(Sin ciudad)"} · ${
                      respuestas.modalidad || "(Sin modalidad)"
                    }`
                  : "(Por definir)"}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Experiencia
              </span>
              <span className="font-medium text-text-primary">
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

            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Educación
              </span>
              <span className="font-medium text-text-primary">
                {respuestas.educacion || "(Por definir)"}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-[10px] uppercase font-semibold">
                Aspiración Salarial
              </span>
              <span className="font-medium text-accent-light">
                {movioSalario && respuestas.aspiracionSalarial > 0
                  ? formatearPesos(respuestas.aspiracionSalarial)
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
                      className="rounded bg-surface-elevated px-2 py-0.5 text-[10px] text-text-secondary border border-surface-border"
                    >
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="text-text-muted text-[10px]">
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

