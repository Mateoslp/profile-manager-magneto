-- Esquema de base de datos para Profile Manager
-- Rol: Backend y Datos

-- Tabla de vacantes: el dataset que los agentes de IA van a consultar
-- para recomendar y "postular" al candidato
CREATE TABLE IF NOT EXISTS vacantes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    empresa VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100),
    modalidad VARCHAR(20) CHECK (modalidad IN ('remoto', 'presencial', 'hibrido')),
    tipo_contrato VARCHAR(40),
    salario_min INTEGER,
    salario_max INTEGER,
    experiencia_requerida VARCHAR(50),
    educacion_requerida VARCHAR(100),
    habilidades TEXT,
    descripcion TEXT,
    fecha_publicacion DATE,
    url_fuente VARCHAR(255),
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de perfiles: para cuando el agente de "lectura de hoja de vida"
-- (Persona 1) empiece a guardar los datos que extrae del CV
CREATE TABLE IF NOT EXISTS perfiles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    ubicacion VARCHAR(100),
    experiencia_anios INTEGER,
    educacion VARCHAR(100),
    aspiracion_salarial INTEGER,
    modalidad_preferida VARCHAR(20),
    disponibilidad VARCHAR(50),
    habilidades TEXT,
    cv_texto TEXT,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de postulaciones: para que el "agente de postulación" (Persona 4)
-- registre el estado de cada aplicación simulada
CREATE TABLE IF NOT EXISTS postulaciones (
    id SERIAL PRIMARY KEY,
    perfil_id INTEGER REFERENCES perfiles(id),
    vacante_id INTEGER REFERENCES vacantes(id),
    estado VARCHAR(30) DEFAULT 'postulado' CHECK (
        estado IN ('postulado', 'en_revision', 'entrevista', 'descartado')
    ),
    fecha_postulacion TIMESTAMP DEFAULT NOW()
);

-- Autenticación (JWT + roles)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'candidato' CHECK (rol IN ('candidato', 'admin')),
    creado_en TIMESTAMP DEFAULT NOW()
);

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS siguiente_paso TEXT;

-- Bitácora de mensajes e interacciones entre agentes
CREATE TABLE IF NOT EXISTS bitacora_ia (
    id              SERIAL PRIMARY KEY,
    perfil_id       INTEGER NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    postulacion_id  INTEGER REFERENCES postulaciones(id) ON DELETE SET NULL,
    agente          VARCHAR(20)  NOT NULL,
    para            VARCHAR(20)  NOT NULL,
    tipo            VARCHAR(20)  NOT NULL,
    texto           TEXT         NOT NULL,
    datos           JSONB        NOT NULL DEFAULT '{}',
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_perfil ON bitacora_ia(perfil_id);