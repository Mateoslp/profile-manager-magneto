export interface RespuestasEntrevista {
  nombre: string;
  email: string;
  telefono: string;
  ubicacion: string;
  modalidad: string;
  esPrimerEmpleo: boolean;
  experienciaAnios: number;
  cargoReciente: string;
  estudiosPrimerEmpleo: string;
  proyectosPrimerEmpleo: string;
  voluntariadoPrimerEmpleo: string;
  educacion: string;
  disponibilidad: string;
  habilidades: string[];
  aspiracionSalarial?: number;
}

/**
 * Arma un texto con formato rígido (clave: valor por línea) para enviar
 * a la API existente (/procesar-candidato). Garantiza superar los 30 caracteres mínimos.
 */
export function generarCvDesdeEntrevista(r: RespuestasEntrevista): string {
  const lineas: string[] = [];

  lineas.push(`Nombre: ${r.nombre.trim() || "Candidato"}`);
  lineas.push(`Email: ${r.email.trim() || ""}`);
  if (r.telefono.trim()) {
    lineas.push(`Teléfono: ${r.telefono.trim()}`);
  }
  lineas.push(`Ubicación: ${r.ubicacion.trim() || "Colombia"}`);
  lineas.push(`Modalidad preferida: ${r.modalidad.trim() || "remoto"}`);

  if (r.esPrimerEmpleo) {
    lineas.push(`Experiencia (años): 0`);
    lineas.push(`Situación laboral: En búsqueda de primer empleo`);
    if (r.estudiosPrimerEmpleo.trim()) {
      lineas.push(`Estudios en curso o recientes: ${r.estudiosPrimerEmpleo.trim()}`);
    }
    if (r.proyectosPrimerEmpleo.trim()) {
      lineas.push(`Proyectos destacados: ${r.proyectosPrimerEmpleo.trim()}`);
    }
    if (r.voluntariadoPrimerEmpleo.trim()) {
      lineas.push(`Voluntariado y actividades: ${r.voluntariadoPrimerEmpleo.trim()}`);
    }
  } else {
    lineas.push(`Experiencia (años): ${r.experienciaAnios}`);
    if (r.cargoReciente.trim()) {
      lineas.push(`Cargo reciente: ${r.cargoReciente.trim()}`);
    }
  }

  lineas.push(`Educación: ${r.educacion.trim() || "No especificada"}`);
  lineas.push(`Disponibilidad: ${r.disponibilidad.trim() || "inmediata"}`);
  lineas.push(
    `Habilidades: ${
      r.habilidades.length > 0 ? r.habilidades.join(", ") : "Habilidades generales"
    }`
  );

  const texto = lineas.join("\n");

  if (texto.length < 30) {
    return `${texto}\nPerfil estructurado mediante entrevista guiada de Lexi para Magneto.`;
  }

  return texto;
}

