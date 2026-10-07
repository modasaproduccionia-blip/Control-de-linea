-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('OPERARIO', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoProduccion" AS ENUM ('EN_PROCESO', 'PENDIENTE_ACTIVIDADES', 'PENDIENTE_INCIDENCIAS_TIEMPO', 'PENDIENTE_CAUSAS', 'COMPLETADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoMotivo" AS ENUM ('TIEMPO', 'PRODUCCION', 'AMBOS');

-- CreateEnum
CREATE TYPE "TipoParada" AS ENUM ('PIEZA', 'MATERIAL');

-- CreateTable
CREATE TABLE "cliente" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "modelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linea" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "hora_estandar_min" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estacion" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "linea_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "estacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_linea_estacion" (
    "id" UUID NOT NULL,
    "modelo_id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "estacion_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelo_linea_estacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsable_estacion" (
    "id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "estacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "responsable_estacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad_estandar" (
    "id" UUID NOT NULL,
    "modelo_id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "estacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "minutos" DECIMAL(10,2) NOT NULL,
    "orden" INTEGER NOT NULL,
    "es_provisional" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "actividad_estandar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivo" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoMotivo" NOT NULL DEFAULT 'AMBOS',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "motivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada_dia" (
    "dia_semana" INTEGER NOT NULL,
    "laborable" BOOLEAN NOT NULL,
    "entrada" TEXT,
    "salida" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jornada_dia_pkey" PRIMARY KEY ("dia_semana")
);

-- CreateTable
CREATE TABLE "jornada_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "almuerzo_inicio" TEXT NOT NULL,
    "almuerzo_fin" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jornada_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_parada" (
    "id" UUID NOT NULL,
    "tipo" "TipoParada" NOT NULL,
    "nombre" TEXT NOT NULL,
    "requiere_comentario" BOOLEAN NOT NULL DEFAULT false,
    "es_ejemplo" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalle_parada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERARIO',
    "linea_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produccion" (
    "id" UUID NOT NULL,
    "fecha_produccion" DATE NOT NULL,
    "cliente_id" UUID NOT NULL,
    "modelo_id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "estacion_id" UUID NOT NULL,
    "estacion_codigo" TEXT NOT NULL,
    "numero_bus" CHAR(3) NOT NULL,
    "codigo_bus" TEXT NOT NULL,
    "responsable_nombre" TEXT,
    "hora_inicio" TIMESTAMPTZ(3) NOT NULL,
    "hora_fin" TIMESTAMPTZ(3),
    "hora_estandar_min" INTEGER NOT NULL,
    "jornada_snapshot" JSONB NOT NULL,
    "duracion_real_min" INTEGER,
    "minutos_laborales" INTEGER,
    "duracion_laboral_min" INTEGER,
    "sobretiempo_min" INTEGER,
    "cumple_tiempo" BOOLEAN,
    "minutos_parada" INTEGER,
    "avance_pct" DECIMAL(5,1),
    "minutos_no_cumplidos" INTEGER,
    "estado" "EstadoProduccion" NOT NULL DEFAULT 'EN_PROCESO',
    "iniciado_por" UUID NOT NULL,
    "finalizado_por" UUID,
    "idempotency_key" TEXT,
    "motivo_anulacion" TEXT,
    "es_demo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parada" (
    "id" UUID NOT NULL,
    "produccion_id" UUID NOT NULL,
    "tipo" "TipoParada" NOT NULL,
    "detalle_parada_id" UUID NOT NULL,
    "detalle_nombre" TEXT NOT NULL,
    "comentario" VARCHAR(300),
    "hora_inicio" TIMESTAMPTZ(3) NOT NULL,
    "hora_fin" TIMESTAMPTZ(3),
    "duracion_real_min" INTEGER,
    "duracion_laboral_min" INTEGER,
    "registrado_por" UUID NOT NULL,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_actividad" (
    "id" UUID NOT NULL,
    "produccion_id" UUID NOT NULL,
    "actividad_estandar_id" UUID NOT NULL,
    "actividad_nombre" TEXT NOT NULL,
    "minutos" DECIMAL(10,2) NOT NULL,
    "realizada" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia_tiempo" (
    "id" UUID NOT NULL,
    "produccion_id" UUID NOT NULL,
    "motivo_id" UUID NOT NULL,
    "motivo_nombre" TEXT NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "tiempo_impacto_min" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencia_tiempo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causa_incumplimiento" (
    "id" UUID NOT NULL,
    "produccion_id" UUID NOT NULL,
    "motivo_id" UUID NOT NULL,
    "motivo_nombre" TEXT NOT NULL,
    "orden_importancia" INTEGER NOT NULL,
    "peso_asignado" INTEGER NOT NULL,
    "minutos_impacto" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "causa_incumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "usuario_id" UUID,
    "fecha" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cliente_nombre_key" ON "cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_sigla_key" ON "cliente"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "modelo_codigo_key" ON "modelo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "linea_codigo_key" ON "linea"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "estacion_codigo_linea_id_key" ON "estacion"("codigo", "linea_id");

-- CreateIndex
CREATE UNIQUE INDEX "modelo_linea_estacion_modelo_id_linea_id_estacion_id_key" ON "modelo_linea_estacion"("modelo_id", "linea_id", "estacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsable_estacion_linea_id_estacion_id_key" ON "responsable_estacion"("linea_id", "estacion_id");

-- CreateIndex
CREATE INDEX "actividad_estandar_modelo_id_linea_id_estacion_id_idx" ON "actividad_estandar"("modelo_id", "linea_id", "estacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "actividad_estandar_modelo_id_linea_id_estacion_id_nombre_key" ON "actividad_estandar"("modelo_id", "linea_id", "estacion_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "motivo_nombre_key" ON "motivo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_parada_tipo_nombre_key" ON "detalle_parada"("tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_codigo_key" ON "usuario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "produccion_idempotency_key_key" ON "produccion"("idempotency_key");

-- CreateIndex
CREATE INDEX "produccion_fecha_produccion_idx" ON "produccion"("fecha_produccion");

-- CreateIndex
CREATE INDEX "produccion_estado_idx" ON "produccion"("estado");

-- CreateIndex
CREATE INDEX "produccion_linea_id_estacion_id_idx" ON "produccion"("linea_id", "estacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "parada_idempotency_key_key" ON "parada"("idempotency_key");

-- CreateIndex
CREATE INDEX "parada_produccion_id_idx" ON "parada"("produccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_actividad_produccion_id_actividad_estandar_id_key" ON "control_actividad"("produccion_id", "actividad_estandar_id");

-- CreateIndex
CREATE INDEX "incidencia_tiempo_produccion_id_idx" ON "incidencia_tiempo"("produccion_id");

-- CreateIndex
CREATE INDEX "causa_incumplimiento_produccion_id_idx" ON "causa_incumplimiento"("produccion_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "estacion" ADD CONSTRAINT "estacion_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_linea_estacion" ADD CONSTRAINT "modelo_linea_estacion_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_linea_estacion" ADD CONSTRAINT "modelo_linea_estacion_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_linea_estacion" ADD CONSTRAINT "modelo_linea_estacion_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsable_estacion" ADD CONSTRAINT "responsable_estacion_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsable_estacion" ADD CONSTRAINT "responsable_estacion_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_estandar" ADD CONSTRAINT "actividad_estandar_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_estandar" ADD CONSTRAINT "actividad_estandar_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad_estandar" ADD CONSTRAINT "actividad_estandar_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_estacion_id_fkey" FOREIGN KEY ("estacion_id") REFERENCES "estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parada" ADD CONSTRAINT "parada_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parada" ADD CONSTRAINT "parada_detalle_parada_id_fkey" FOREIGN KEY ("detalle_parada_id") REFERENCES "detalle_parada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_actividad" ADD CONSTRAINT "control_actividad_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_actividad" ADD CONSTRAINT "control_actividad_actividad_estandar_id_fkey" FOREIGN KEY ("actividad_estandar_id") REFERENCES "actividad_estandar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_tiempo" ADD CONSTRAINT "incidencia_tiempo_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_tiempo" ADD CONSTRAINT "incidencia_tiempo_motivo_id_fkey" FOREIGN KEY ("motivo_id") REFERENCES "motivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causa_incumplimiento" ADD CONSTRAINT "causa_incumplimiento_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causa_incumplimiento" ADD CONSTRAINT "causa_incumplimiento_motivo_id_fkey" FOREIGN KEY ("motivo_id") REFERENCES "motivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices únicos parciales (no soportados por el esquema Prisma).
-- Regla de duplicados (PROMPT_MAESTRO §5.10 + DECISIONES): código de bus + código de estación, sin importar línea ni fecha.
CREATE UNIQUE INDEX "uq_produccion_bus_estacion" ON "produccion" ("codigo_bus", "estacion_codigo") WHERE "estado" <> 'ANULADO';
-- Solo una parada abierta por producción (§5.12).
CREATE UNIQUE INDEX "uq_parada_abierta" ON "parada" ("produccion_id") WHERE "hora_fin" IS NULL;
-- Formato de horas de jornada y del número de bus.
ALTER TABLE "jornada_dia" ADD CONSTRAINT "ck_jornada_dia_semana" CHECK ("dia_semana" BETWEEN 1 AND 7);
ALTER TABLE "jornada_dia" ADD CONSTRAINT "ck_jornada_horas" CHECK (NOT "laborable" OR ("entrada" ~ '^\d{2}:\d{2}$' AND "salida" ~ '^\d{2}:\d{2}$' AND "entrada" < "salida"));
ALTER TABLE "jornada_config" ADD CONSTRAINT "ck_jornada_almuerzo" CHECK ("almuerzo_inicio" ~ '^\d{2}:\d{2}$' AND "almuerzo_fin" ~ '^\d{2}:\d{2}$' AND "almuerzo_inicio" < "almuerzo_fin");
ALTER TABLE "produccion" ADD CONSTRAINT "ck_produccion_numero_bus" CHECK ("numero_bus" ~ '^\d{3}$');
ALTER TABLE "produccion" ADD CONSTRAINT "ck_produccion_horas" CHECK ("hora_fin" IS NULL OR "hora_fin" >= "hora_inicio");
ALTER TABLE "parada" ADD CONSTRAINT "ck_parada_horas" CHECK ("hora_fin" IS NULL OR "hora_fin" >= "hora_inicio");
ALTER TABLE "incidencia_tiempo" ADD CONSTRAINT "ck_incidencia_porcentaje" CHECK ("porcentaje" BETWEEN 5 AND 100 AND "porcentaje" % 5 = 0);
