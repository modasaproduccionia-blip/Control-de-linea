import type { Jornada } from '@/domain/jornada';
import { prisma } from '@/server/db';

/** Jornada vigente desde BD (editable por admin). Se copia en cada producción al iniciar. */
export async function cargarJornada(): Promise<Jornada> {
  const [dias, cfg] = await Promise.all([
    prisma.jornadaDia.findMany(),
    prisma.jornadaConfig.findUnique({ where: { id: 1 } }),
  ]);
  if (dias.length !== 7 || !cfg) {
    throw new Error('La jornada laboral no está configurada (ejecute npm run db:seed).');
  }
  const jornada: Jornada = {
    dias: {},
    almuerzo: { inicio: cfg.almuerzoInicio, fin: cfg.almuerzoFin },
  };
  for (const d of dias) {
    jornada.dias[d.diaSemana] =
      d.laborable && d.entrada && d.salida ? { entrada: d.entrada, salida: d.salida } : null;
  }
  return jornada;
}

/** Todo lo que necesita el Paso 1 en una sola respuesta (catálogos pequeños). */
export async function catalogoSeleccion() {
  const [clientes, combos, responsables, conActividades] = await Promise.all([
    prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, sigla: true },
    }),
    prisma.modeloLineaEstacion.findMany({
      where: {
        activo: true,
        modelo: { activo: true },
        linea: { activo: true },
        estacion: { activo: true },
      },
      select: {
        modelo: { select: { id: true, codigo: true } },
        linea: { select: { id: true, codigo: true, horaEstandarMin: true } },
        estacion: { select: { id: true, codigo: true } },
      },
    }),
    prisma.responsableEstacion.findMany({
      select: { lineaId: true, estacionId: true, nombre: true },
    }),
    prisma.actividadEstandar.groupBy({
      by: ['modeloId', 'lineaId', 'estacionId'],
      where: { activo: true },
      _count: { _all: true },
    }),
  ]);
  const conAct = new Set(conActividades.map((a) => `${a.modeloId}|${a.lineaId}|${a.estacionId}`));
  const resp = new Map(responsables.map((r) => [`${r.lineaId}|${r.estacionId}`, r.nombre]));
  const orden = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });
  return {
    clientes,
    combinaciones: combos
      .map((c) => ({
        modeloId: c.modelo.id,
        modelo: c.modelo.codigo,
        lineaId: c.linea.id,
        linea: c.linea.codigo,
        horaEstandarMin: c.linea.horaEstandarMin,
        estacionId: c.estacion.id,
        estacion: c.estacion.codigo,
        responsable: resp.get(`${c.linea.id}|${c.estacion.id}`) ?? null,
        tieneActividades: conAct.has(`${c.modelo.id}|${c.linea.id}|${c.estacion.id}`),
      }))
      .sort(
        (a, b) =>
          orden(a.modelo, b.modelo) || orden(a.linea, b.linea) || orden(a.estacion, b.estacion),
      ),
  };
}

export async function detallesParada() {
  return prisma.detalleParada.findMany({
    where: { activo: true },
    orderBy: [{ tipo: 'asc' }, { orden: 'asc' }],
    select: { id: true, tipo: true, nombre: true, requiereComentario: true },
  });
}

export async function motivos(tipo?: 'TIEMPO' | 'PRODUCCION') {
  return prisma.motivo.findMany({
    where: { activo: true, ...(tipo ? { tipo: { in: [tipo, 'AMBOS'] } } : {}) },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  });
}
