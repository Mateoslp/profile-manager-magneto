import { ResultadoProcesar } from "@/lib/api";

export interface CasoDemoEscenario {
  id: "puntaje-alto" | "puntaje-bajo";
  etiqueta: string;
  descripcion: string;
  resultado: ResultadoProcesar;
}

/**
 * Casos de ejemplo para /dev/escenario.
 * Replican exactamente la estructura, nombres de agentes, tipos y destinos
 * que produce agents.py (incluyendo "candidato" en minúscula y datos.origen).
 */
export const CASOS_DEMO_ESCENARIO: CasoDemoEscenario[] = [
  {
    id: "puntaje-alto",
    etiqueta: "Puntaje alto (Kenti postula)",
    descripcion:
      "El mejor puntaje (9/11, umbral 4) cumple la condición: la tarjeta recorre Tú → Lexi → Inari → Kenti → Iris → Tú.",
    resultado: {
      perfil_id: 101,
      postulacion_id: 501,
      perfil: {
        nombre: "Camilo Restrepo",
        email: "camilo.restrepo@correo.com",
        telefono: null,
        ubicacion: "Medellín",
        experiencia_anios: 4,
        educacion: null,
        aspiracion_salarial: 3500000,
        modalidad_preferida: "remoto",
        disponibilidad: "inmediata",
        habilidades: "Python, SQL, APIs REST",
      },
      recomendaciones: [
        {
          id: 1,
          titulo: "Desarrollador Backend Junior",
          empresa: "TechNova SAS",
          ubicacion: "Medellín",
          modalidad: "remoto",
          salario_min: 2800000,
          salario_max: 3800000,
          habilidades: "Python, SQL, Git, APIs REST",
          score: 9,
          afinidad: 82,
          habilidades_en_comun: ["apis rest", "python", "sql"],
          habilidades_faltantes: ["git"],
        },
        {
          id: 2,
          titulo: "Analista de Datos",
          empresa: "DataMinds Analytics",
          ubicacion: "Bogotá",
          modalidad: "hibrido",
          salario_min: 3200000,
          salario_max: 4500000,
          habilidades: "SQL, Power BI, Python, Excel avanzado",
          score: 5,
          afinidad: 45,
          habilidades_en_comun: ["python", "sql"],
          habilidades_faltantes: ["excel avanzado", "power bi"],
        },
      ],
      mensaje_seguimiento:
        "Tu postulación simulada a Desarrollador Backend Junior registró una alta coincidencia técnica en Python, SQL y APIs REST. Para prepararte ante una eventual entrevista, repasa flujos de trabajo con Git. Recuerda que esta postulación es una simulación.",
      mensajes: [
        {
          agente: "Lexi",
          para: "Inari",
          tipo: "alerta",
          texto:
            "Detecté 2 campos vacíos: 2 no afectan el match (educación, teléfono).",
          datos: {
            vacios_match: [],
            vacios_otros: ["educacion", "telefono"],
            campos_presentes: [
              "aspiracion_salarial",
              "habilidades",
              "modalidad_preferida",
              "ubicacion",
            ],
          },
        },
        {
          agente: "Lexi",
          para: "Inari",
          tipo: "info",
          texto:
            "Perfil estructurado listo. Campos disponibles para match: salario, habilidades, modalidad, ubicación.",
          datos: {
            perfil_nombre: "Camilo Restrepo",
          },
        },
        {
          agente: "Inari",
          para: "Kenti",
          tipo: "info",
          texto:
            "Top 3 vacantes: Desarrollador Backend Junior (9 pts), Analista de Datos (5 pts), Ingeniero DevOps (4 pts).",
          datos: {
            top_3: [
              { id: 1, titulo: "Desarrollador Backend Junior", score: 9 },
              { id: 2, titulo: "Analista de Datos", score: 5 },
              { id: 6, titulo: "Ingeniero DevOps", score: 4 },
            ],
          },
        },
        {
          agente: "Inari",
          para: "Kenti",
          tipo: "decision",
          texto:
            "El mejor puntaje es 9 (umbral: 4). Cumple el umbral, se procede a postular.",
          datos: {
            mejor_score: 9,
            umbral: 4,
            cumple: true,
          },
        },
        {
          agente: "Kenti",
          para: "Iris",
          tipo: "info",
          texto:
            "Postulación simulada a la vacante 'Desarrollador Backend Junior'.",
          datos: {
            vacante_id: 1,
          },
        },
        {
          agente: "Iris",
          para: "candidato",
          tipo: "info",
          texto:
            "Tu postulación simulada a Desarrollador Backend Junior registró una alta coincidencia técnica en Python, SQL y APIs REST. Para prepararte ante una eventual entrevista, repasa flujos de trabajo con Git. Recuerda que esta postulación es una simulación.",
          datos: {
            postulado: true,
            origen: "gemini",
            vacante: "Desarrollador Backend Junior",
            puntaje: 9,
            habilidades_faltantes: ["git"],
          },
        },
      ],
    },
  },
  {
    id: "puntaje-bajo",
    etiqueta: "Puntaje bajo (Kenti no postula)",
    descripcion:
      "El mejor puntaje (2/11, umbral 4) no alcanza: Inari salta a Iris, Kenti queda atenuado con la decisión real de Inari e Iris responde con respaldo por reglas.",
    resultado: {
      perfil_id: 102,
      postulacion_id: null,
      perfil: {
        nombre: "Valentina Ospina",
        email: "valentina.ospina@correo.com",
        telefono: null,
        ubicacion: "Bogotá",
        experiencia_anios: 1,
        educacion: "Ingeniería de Sistemas",
        aspiracion_salarial: null,
        modalidad_preferida: null,
        disponibilidad: null,
        habilidades: "Redes, ITIL",
      },
      recomendaciones: [
        {
          id: 2,
          titulo: "Analista de Datos",
          empresa: "DataMinds Analytics",
          ubicacion: "Bogotá",
          modalidad: "hibrido",
          salario_min: 3200000,
          salario_max: 4500000,
          habilidades: "SQL, Power BI, Python, Excel avanzado",
          score: 2,
          afinidad: 18,
          habilidades_en_comun: [],
          habilidades_faltantes: [
            "excel avanzado",
            "power bi",
            "python",
            "sql",
          ],
        },
      ],
      mensaje_seguimiento:
        "No se postuló a 'Analista de Datos' porque el puntaje (2) no alcanzó el umbral (4). Te faltan estas habilidades respecto a la vacante: excel avanzado, power bi, python, sql. Te recomendamos fortalecer esas áreas y volver a intentar.",
      mensajes: [
        {
          agente: "Lexi",
          para: "Inari",
          tipo: "alerta",
          texto:
            "Detecté 4 campos vacíos: 2 afectan el match (modalidad, salario), 2 no afectan el match (disponibilidad, teléfono).",
          datos: {
            vacios_match: ["aspiracion_salarial", "modalidad_preferida"],
            vacios_otros: ["disponibilidad", "telefono"],
            campos_presentes: ["habilidades", "ubicacion"],
          },
        },
        {
          agente: "Lexi",
          para: "Inari",
          tipo: "info",
          texto:
            "Perfil estructurado listo. Campos disponibles para match: habilidades, ubicación.",
          datos: {
            perfil_nombre: "Valentina Ospina",
          },
        },
        {
          agente: "Inari",
          para: "Iris",
          tipo: "info",
          texto:
            "Top 3 vacantes: Analista de Datos (2 pts), Ejecutivo Comercial (0 pts), Diseñador UX/UI (0 pts).",
          datos: {
            top_3: [
              { id: 2, titulo: "Analista de Datos", score: 2 },
              { id: 3, titulo: "Ejecutivo Comercial", score: 0 },
              { id: 4, titulo: "Diseñador UX/UI", score: 0 },
            ],
          },
        },
        {
          agente: "Inari",
          para: "Iris",
          tipo: "decision",
          texto:
            "El mejor puntaje es 2 (umbral: 4). No cumple el umbral, no se postula.",
          datos: {
            mejor_score: 2,
            umbral: 4,
            cumple: false,
          },
        },
        {
          agente: "Iris",
          para: "candidato",
          tipo: "info",
          texto:
            "No se postuló a 'Analista de Datos' porque el puntaje (2) no alcanzó el umbral (4). Te faltan estas habilidades respecto a la vacante: excel avanzado, power bi, python, sql. Te recomendamos fortalecer esas áreas y volver a intentar.",
          datos: {
            postulado: false,
            origen: "respaldo",
            vacante: "Analista de Datos",
            puntaje: 2,
            habilidades_faltantes: [
              "excel avanzado",
              "power bi",
              "python",
              "sql",
            ],
          },
        },
      ],
    },
  },
];

