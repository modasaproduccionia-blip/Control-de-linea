-- Los registros de demostración (es_demo) nunca deben bloquear un código de bus real.
DROP INDEX IF EXISTS "uq_produccion_bus_estacion";
CREATE UNIQUE INDEX "uq_produccion_bus_estacion" ON "produccion" ("codigo_bus", "estacion_codigo")
  WHERE "estado" <> 'ANULADO' AND NOT "es_demo";
