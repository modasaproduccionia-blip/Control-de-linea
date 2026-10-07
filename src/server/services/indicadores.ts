import { Prisma } from '@/generated/prisma/client';
import type { FiltrosIndicadores } from '@/lib/schemas';
import type { Sesion } from '@/server/auth/session';
import { prisma } from '@/server/db';

/**
 * Indicadores agregados en PostgreSQL (PROMPT_MAESTRO §4.9): el navegador nunca recibe miles de filas.
 * Solo cuentan trabajos finalizados (con hora_fin) y no anulados.
 */
export async function indicadores(f: FiltrosIndicadores, sesion: Sesion) {
  // El operario solo ve su línea (DECISIONES 2026-10-07).
  const lineaId = sesion.rol === 'OPERARIO' && sesion.lineaId ? sesion.lineaId : f.lineaId;
  const cond: Prisma.Sql[] = [
    Prisma.sql`p.estado <> 'ANULADO'`,
    Prisma.sql`p.hora_fin IS NOT NULL`,
  ];
  if (f.desde) cond.push(Prisma.sql`p.fecha_produccion >= ${f.desde}::date`);
  if (f.hasta) cond.push(Prisma.sql`p.fecha_produccion <= ${f.hasta}::date`);
  if (lineaId) cond.push(Prisma.sql`p.linea_id = ${lineaId}::uuid`);
  if (f.modeloId) cond.push(Prisma.sql`p.modelo_id = ${f.modeloId}::uuid`);
  if (f.estacionId) cond.push(Prisma.sql`p.estacion_id = ${f.estacionId}::uuid`);
  if (f.clienteId) cond.push(Prisma.sql`p.cliente_id = ${f.clienteId}::uuid`);
  const where = Prisma.sql`WHERE ${Prisma.join(cond, ' AND ')}`;

  const [
    kpis,
    porEstacion,
    paradasTipo,
    paradasDetalle,
    tendencia,
    paretoTiempo,
    paretoCausas,
    ultimos,
    enVivo,
  ] = await Promise.all([
    prisma.$queryRaw<
      {
        trabajos: number;
        cumplen: number;
        sobretiempo_min: number;
        avance_prom: number | null;
        parada_min: number;
        demo: number;
      }[]
    >`
      SELECT count(*)::int AS trabajos,
             count(*) FILTER (WHERE p.cumple_tiempo)::int AS cumplen,
             coalesce(sum(p.sobretiempo_min), 0)::int AS sobretiempo_min,
             avg(p.avance_pct)::float AS avance_prom,
             coalesce(sum(p.minutos_parada), 0)::int AS parada_min,
             count(*) FILTER (WHERE p.es_demo)::int AS demo
      FROM produccion p ${where}`,
    prisma.$queryRaw<
      { estacion_id: string; estacion: string; linea: string; si: number; no: number }[]
    >`
      SELECT e.id AS estacion_id, e.codigo AS estacion, l.codigo AS linea,
             count(*) FILTER (WHERE p.cumple_tiempo)::int AS si,
             count(*) FILTER (WHERE NOT p.cumple_tiempo)::int AS no
      FROM produccion p JOIN estacion e ON e.id = p.estacion_id JOIN linea l ON l.id = p.linea_id
      ${where}
      GROUP BY e.id, e.codigo, l.codigo ORDER BY l.codigo, e.codigo`,
    prisma.$queryRaw<{ tipo: string; minutos: number; cantidad: number }[]>`
      SELECT pa.tipo::text AS tipo, coalesce(sum(pa.duracion_laboral_min), 0)::int AS minutos, count(*)::int AS cantidad
      FROM parada pa JOIN produccion p ON p.id = pa.produccion_id
      ${where} AND pa.hora_fin IS NOT NULL
      GROUP BY pa.tipo`,
    prisma.$queryRaw<{ tipo: string; detalle: string; minutos: number; cantidad: number }[]>`
      SELECT pa.tipo::text AS tipo, pa.detalle_nombre AS detalle,
             coalesce(sum(pa.duracion_laboral_min), 0)::int AS minutos, count(*)::int AS cantidad
      FROM parada pa JOIN produccion p ON p.id = pa.produccion_id
      ${where} AND pa.hora_fin IS NOT NULL
      GROUP BY pa.tipo, pa.detalle_nombre ORDER BY minutos DESC LIMIT 8`,
    prisma.$queryRaw<
      { fecha: string; sobretiempo_min: number; parada_min: number; trabajos: number }[]
    >`
      SELECT to_char(p.fecha_produccion, 'YYYY-MM-DD') AS fecha,
             coalesce(sum(p.sobretiempo_min), 0)::int AS sobretiempo_min,
             coalesce(sum(p.minutos_parada), 0)::int AS parada_min,
             count(*)::int AS trabajos
      FROM produccion p ${where}
      GROUP BY p.fecha_produccion ORDER BY p.fecha_produccion`,
    prisma.$queryRaw<{ motivo: string; minutos: number; veces: number }[]>`
      SELECT i.motivo_nombre AS motivo, coalesce(sum(i.tiempo_impacto_min), 0)::float AS minutos, count(*)::int AS veces
      FROM incidencia_tiempo i JOIN produccion p ON p.id = i.produccion_id
      ${where}
      GROUP BY i.motivo_nombre ORDER BY minutos DESC LIMIT 10`,
    prisma.$queryRaw<{ motivo: string; minutos: number; veces: number }[]>`
      SELECT c.motivo_nombre AS motivo, coalesce(sum(c.minutos_impacto), 0)::int AS minutos, count(*)::int AS veces
      FROM causa_incumplimiento c JOIN produccion p ON p.id = c.produccion_id
      ${where}
      GROUP BY c.motivo_nombre ORDER BY minutos DESC LIMIT 10`,
    prisma.$queryRaw<
      {
        id: string;
        fecha: string;
        codigo_bus: string;
        modelo: string;
        linea: string;
        estacion: string;
        duracion_laboral_min: number;
        sobretiempo_min: number;
        avance_pct: number | null;
        paradas: number;
        cumple: boolean;
        estado: string;
        es_demo: boolean;
      }[]
    >`
      SELECT p.id, to_char(p.fecha_produccion, 'YYYY-MM-DD') AS fecha, p.codigo_bus, m.codigo AS modelo,
             l.codigo AS linea, e.codigo AS estacion, p.duracion_laboral_min, p.sobretiempo_min,
             p.avance_pct::float AS avance_pct, p.cumple_tiempo AS cumple, p.estado::text AS estado, p.es_demo,
             (SELECT count(*)::int FROM parada pa WHERE pa.produccion_id = p.id) AS paradas
      FROM produccion p JOIN modelo m ON m.id = p.modelo_id JOIN linea l ON l.id = p.linea_id
      JOIN estacion e ON e.id = p.estacion_id
      ${where}
      ORDER BY p.hora_fin DESC LIMIT 15`,
    prisma.$queryRaw<{ linea: string; en_proceso: number; en_parada: number }[]>`
      SELECT l.codigo AS linea,
             count(*)::int AS en_proceso,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM parada pa WHERE pa.produccion_id = p.id AND pa.hora_fin IS NULL))::int AS en_parada
      FROM produccion p JOIN linea l ON l.id = p.linea_id
      WHERE p.estado = 'EN_PROCESO' AND NOT p.es_demo ${lineaId ? Prisma.sql`AND p.linea_id = ${lineaId}::uuid` : Prisma.empty}
      GROUP BY l.codigo ORDER BY l.codigo`,
  ]);

  return {
    lineaForzada: sesion.rol === 'OPERARIO' && sesion.lineaId ? sesion.lineaId : null,
    kpis: kpis[0]!,
    porEstacion,
    paradasTipo,
    paradasDetalle,
    tendencia,
    paretoTiempo,
    paretoCausas,
    ultimos,
    enVivo,
    actualizado: new Date().toISOString(),
  };
}
export type IndicadoresDTO = Awaited<ReturnType<typeof indicadores>>;

/** Opciones de los filtros del panel. */
export async function opcionesFiltros() {
  const [lineas, modelos, estaciones, clientes] = await Promise.all([
    prisma.linea.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true },
    }),
    prisma.modelo.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true },
    }),
    prisma.estacion.findMany({
      where: { activo: true },
      orderBy: [{ linea: { codigo: 'asc' } }, { codigo: 'asc' }],
      select: { id: true, codigo: true, lineaId: true, linea: { select: { codigo: true } } },
    }),
    prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);
  return {
    lineas,
    modelos,
    estaciones: estaciones.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      lineaId: e.lineaId,
      linea: e.linea.codigo,
    })),
    clientes,
  };
}
