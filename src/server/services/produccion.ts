import { TZDate } from '@date-fns/tz';
import { calcularAvance } from '@/domain/avance';
import { calcularCausas, validarCausas } from '@/domain/causas';
import { codigoBus, MSG_DUPLICADO } from '@/domain/codigo-bus';
import { calcularCierre, minutosParada } from '@/domain/duracion';
import { estadoTrasActividades, estadoTrasIncidencias, type Estado } from '@/domain/estados';
import { tiempoImpactoMin, validarIncidencias } from '@/domain/incidencias';
import { type Jornada, ZONA_HORARIA } from '@/domain/jornada';
import { Prisma } from '@/generated/prisma/client';
import type { InicioInput } from '@/lib/schemas';
import type { Sesion } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import { cargarJornada } from './catalogos';

type Tx = Prisma.TransactionClient;

const MSG_CAMBIO_CONCURRENTE = 'Este trabajo cambió en otro dispositivo. Se recargó la pantalla.';
const MSG_PARADA_ABIERTA = 'Termina la parada antes de finalizar el trabajo';

const esUnico = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

/** Fecha de producción = fecha del INICIO en America/Lima (DECISIONES 2026-10-07). */
function fechaLima(t: Date): Date {
  const z = new TZDate(t.getTime(), ZONA_HORARIA);
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate()));
}

// ---------------------------------------------------------------- Inicio

async function validarInicioTx(db: Tx | typeof prisma, input: InicioInput) {
  const [cliente, combo, linea, actividades] = await Promise.all([
    db.cliente.findFirst({ where: { id: input.clienteId, activo: true } }),
    db.modeloLineaEstacion.findFirst({
      where: { modeloId: input.modeloId, lineaId: input.lineaId, estacionId: input.estacionId, activo: true },
      include: { estacion: true },
    }),
    db.linea.findUnique({ where: { id: input.lineaId } }),
    db.actividadEstandar.count({
      where: { modeloId: input.modeloId, lineaId: input.lineaId, estacionId: input.estacionId, activo: true },
    }),
  ]);
  // DIFERENCIA vs original: se valida que todos los campos existan y que la estación sea de esa línea.
  if (!cliente || !combo || !linea) throw new AppError('VALIDACION', 'Complete todos los campos');
  // DIFERENCIA vs original: el original no validaba la hora estándar.
  if (linea.horaEstandarMin == null || linea.horaEstandarMin <= 0) {
    throw new AppError('VALIDACION', 'La línea no tiene hora estándar configurada. Avise a su supervisor.');
  }
  if (actividades === 0) {
    throw new AppError('VALIDACION', 'Esta estación no tiene actividades configuradas. Avise a su supervisor.');
  }
  const codigo = codigoBus(cliente.sigla, input.numeroBus);
  const dup = await db.produccion.findFirst({
    where: { codigoBus: codigo, estacionCodigo: combo.estacion.codigo, estado: { not: 'ANULADO' } },
    select: { id: true },
  });
  if (dup) throw new AppError('DUPLICADO', MSG_DUPLICADO);
  return { cliente, combo, linea, codigo };
}

export async function validarInicio(input: InicioInput) {
  const { codigo } = await validarInicioTx(prisma, input);
  return { ok: true, codigoBus: codigo };
}

export async function iniciar(input: InicioInput, sesion: Sesion, idemKey: string | null) {
  if (idemKey) {
    const previa = await prisma.produccion.findUnique({ where: { idempotencyKey: idemKey }, select: { id: true } });
    if (previa) return previa;
  }
  const jornada = await cargarJornada();
  try {
    return await prisma.$transaction(async (tx) => {
      const { combo, linea, codigo } = await validarInicioTx(tx, input);
      const responsable = await tx.responsableEstacion.findUnique({
        where: { lineaId_estacionId: { lineaId: input.lineaId, estacionId: input.estacionId } },
      });
      const ahora = new Date(); // hora del servidor, nunca la del dispositivo
      return tx.produccion.create({
        data: {
          fechaProduccion: fechaLima(ahora),
          clienteId: input.clienteId,
          modeloId: input.modeloId,
          lineaId: input.lineaId,
          estacionId: input.estacionId,
          estacionCodigo: combo.estacion.codigo,
          numeroBus: input.numeroBus,
          codigoBus: codigo,
          responsableNombre: responsable?.nombre ?? null,
          horaInicio: ahora,
          horaEstandarMin: linea.horaEstandarMin!,
          jornadaSnapshot: jornada as unknown as Prisma.InputJsonValue,
          iniciadoPorId: sesion.id,
          idempotencyKey: idemKey,
        },
        select: { id: true },
      });
    });
  } catch (e) {
    if (esUnico(e)) {
      // Doble toque con la misma clave → mismo resultado; si no, es un duplicado bus + estación.
      if (idemKey) {
        const previa = await prisma.produccion.findUnique({ where: { idempotencyKey: idemKey }, select: { id: true } });
        if (previa) return previa;
      }
      throw new AppError('DUPLICADO', MSG_DUPLICADO);
    }
    throw e;
  }
}

// ---------------------------------------------------------------- Lectura

const includeDetalle = {
  cliente: { select: { nombre: true, sigla: true } },
  modelo: { select: { codigo: true } },
  linea: { select: { codigo: true } },
  estacion: { select: { codigo: true } },
  paradas: { orderBy: { horaInicio: 'asc' } },
} satisfies Prisma.ProduccionInclude;

type ProduccionDetalle = Prisma.ProduccionGetPayload<{ include: typeof includeDetalle }>;

function serializar(p: ProduccionDetalle) {
  return {
    id: p.id,
    estado: p.estado as Estado,
    version: p.version,
    codigoBus: p.codigoBus,
    cliente: p.cliente.nombre,
    modelo: p.modelo.codigo,
    linea: p.linea.codigo,
    estacion: p.estacion.codigo,
    responsable: p.responsableNombre,
    fechaProduccion: p.fechaProduccion.toISOString().slice(0, 10),
    horaInicio: p.horaInicio.toISOString(),
    horaFin: p.horaFin?.toISOString() ?? null,
    horaEstandarMin: p.horaEstandarMin,
    jornada: p.jornadaSnapshot as unknown as Jornada,
    duracionRealMin: p.duracionRealMin,
    minutosLaborales: p.minutosLaborales,
    duracionLaboralMin: p.duracionLaboralMin,
    sobretiempoMin: p.sobretiempoMin,
    cumpleTiempo: p.cumpleTiempo,
    minutosParada: p.minutosParada,
    avancePct: p.avancePct == null ? null : Number(p.avancePct),
    minutosNoCumplidos: p.minutosNoCumplidos,
    esDemo: p.esDemo,
    paradas: p.paradas.map((x) => ({
      id: x.id,
      tipo: x.tipo,
      detalle: x.detalleNombre,
      comentario: x.comentario,
      horaInicio: x.horaInicio.toISOString(),
      horaFin: x.horaFin?.toISOString() ?? null,
      duracionLaboralMin: x.duracionLaboralMin,
    })),
  };
}
export type ProduccionDTO = ReturnType<typeof serializar>;

export async function obtener(id: string) {
  const p = await prisma.produccion.findUnique({ where: { id }, include: includeDetalle });
  if (!p) throw new AppError('NO_ENCONTRADO', 'Trabajo no encontrado.');
  return { produccion: serializar(p), serverNow: new Date().toISOString() };
}

/** Trabajos no completados: operario ve los de su línea (tablets compartidas); supervisor/admin, todos. */
export async function enCurso(sesion: Sesion) {
  const filtroLinea =
    sesion.rol === 'OPERARIO' ? (sesion.lineaId ? { lineaId: sesion.lineaId } : { iniciadoPorId: sesion.id }) : {};
  const lista = await prisma.produccion.findMany({
    where: { estado: { notIn: ['COMPLETADO', 'ANULADO'] }, esDemo: false, ...filtroLinea },
    include: includeDetalle,
    orderBy: { horaInicio: 'desc' },
    take: 100,
  });
  return { producciones: lista.map(serializar), serverNow: new Date().toISOString() };
}

// ---------------------------------------------------------------- Transiciones

/** Actualiza solo si el estado y la versión siguen siendo los esperados (concurrencia optimista). */
async function transicion(tx: Tx, id: string, de: Estado, version: number, data: Prisma.ProduccionUpdateManyMutationInput) {
  const r = await tx.produccion.updateMany({
    where: { id, estado: de, version },
    data: { ...data, version: { increment: 1 } },
  });
  if (r.count !== 1) throw new AppError('CONFLICTO', MSG_CAMBIO_CONCURRENTE);
}

async function cargar(tx: Tx, id: string) {
  const p = await tx.produccion.findUnique({ where: { id } });
  if (!p) throw new AppError('NO_ENCONTRADO', 'Trabajo no encontrado.');
  return p;
}

function exigirEstado(actual: string, esperado: Estado) {
  if (actual !== esperado) {
    throw new AppError('ESTADO_INVALIDO', 'Este paso ya fue registrado o no corresponde. Se recargó la pantalla.', {
      estado: actual,
    });
  }
}

export async function finalizar(id: string, sesion: Sesion) {
  return prisma.$transaction(async (tx) => {
    const p = await cargar(tx, id);
    if (p.estado !== 'EN_PROCESO') {
      // Idempotente: un segundo toque no vuelve a calcular.
      if (p.horaFin) return { estado: p.estado };
      exigirEstado(p.estado, 'EN_PROCESO');
    }
    const abierta = await tx.parada.findFirst({ where: { produccionId: id, horaFin: null } });
    if (abierta) throw new AppError('CONFLICTO', MSG_PARADA_ABIERTA);
    const jornada = p.jornadaSnapshot as unknown as Jornada;
    const fin = new Date();
    const cierre = calcularCierre({ horaInicio: p.horaInicio, horaFin: fin, horaEstandarMin: p.horaEstandarMin, jornada });
    const paradas = await tx.parada.aggregate({ where: { produccionId: id }, _sum: { duracionLaboralMin: true } });
    await transicion(tx, id, 'EN_PROCESO', p.version, {
      horaFin: fin,
      ...cierre,
      minutosParada: paradas._sum.duracionLaboralMin ?? 0,
      estado: 'PENDIENTE_ACTIVIDADES',
      finalizadoPorId: sesion.id,
    });
    return { estado: 'PENDIENTE_ACTIVIDADES' as Estado };
  });
}

export async function iniciarParada(
  id: string,
  input: { tipo: 'PIEZA' | 'MATERIAL'; detalleParadaId: string; comentario?: string | null },
  sesion: Sesion,
  idemKey: string | null,
) {
  if (idemKey) {
    const previa = await prisma.parada.findUnique({ where: { idempotencyKey: idemKey }, select: { id: true } });
    if (previa) return previa;
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const p = await cargar(tx, id);
      exigirEstado(p.estado, 'EN_PROCESO');
      const detalle = await tx.detalleParada.findFirst({ where: { id: input.detalleParadaId, activo: true } });
      if (!detalle || detalle.tipo !== input.tipo) {
        throw new AppError('VALIDACION', 'Elige si la parada es por pieza o por material');
      }
      const comentario = input.comentario?.trim() || null;
      if (detalle.requiereComentario && !comentario) {
        throw new AppError('VALIDACION', 'Escribe un comentario para explicar la parada');
      }
      return tx.parada.create({
        data: {
          produccionId: id,
          tipo: input.tipo,
          detalleParadaId: detalle.id,
          detalleNombre: detalle.nombre,
          comentario,
          horaInicio: new Date(),
          registradoPorId: sesion.id,
          idempotencyKey: idemKey,
        },
        select: { id: true },
      });
    });
  } catch (e) {
    if (esUnico(e)) throw new AppError('CONFLICTO', 'Ya hay una parada en curso para este trabajo.');
    throw e;
  }
}

export async function terminarParada(id: string, paradaId: string) {
  return prisma.$transaction(async (tx) => {
    const parada = await tx.parada.findFirst({ where: { id: paradaId, produccionId: id } });
    if (!parada) throw new AppError('NO_ENCONTRADO', 'Parada no encontrada.');
    if (parada.horaFin) return { ok: true }; // idempotente
    const p = await cargar(tx, id);
    const fin = new Date();
    await tx.parada.update({
      where: { id: paradaId },
      data: { horaFin: fin, ...minutosParada(parada.horaInicio, fin, p.jornadaSnapshot as unknown as Jornada) },
    });
    return { ok: true };
  });
}

export async function listaActividades(id: string) {
  const p = await prisma.produccion.findUnique({ where: { id } });
  if (!p) throw new AppError('NO_ENCONTRADO', 'Trabajo no encontrado.');
  const acts = await prisma.actividadEstandar.findMany({
    where: { modeloId: p.modeloId, lineaId: p.lineaId, estacionId: p.estacionId, activo: true },
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, minutos: true, esProvisional: true },
  });
  const registradas = await prisma.controlActividad.findMany({ where: { produccionId: id, realizada: true } });
  return {
    actividades: acts.map((a) => ({ ...a, minutos: Number(a.minutos) })),
    realizadas: registradas.map((r) => r.actividadEstandarId),
  };
}

export async function registrarActividades(id: string, realizadas: string[]) {
  return conConflicto(() => registrarActividadesTx(id, realizadas));
}

/** Dos tablets registrando a la vez: el índice único (produccion, actividad) frena la segunda. */
async function conConflicto<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (esUnico(e)) throw new AppError('CONFLICTO', MSG_CAMBIO_CONCURRENTE);
    throw e;
  }
}

async function registrarActividadesTx(id: string, realizadas: string[]) {
  return prisma.$transaction(async (tx) => {
    const p = await cargar(tx, id);
    exigirEstado(p.estado, 'PENDIENTE_ACTIVIDADES');
    const acts = await tx.actividadEstandar.findMany({
      where: { modeloId: p.modeloId, lineaId: p.lineaId, estacionId: p.estacionId, activo: true },
    });
    const marcadas = new Set(realizadas);
    const desconocidas = realizadas.filter((r) => !acts.some((a) => a.id === r));
    if (desconocidas.length) throw new AppError('VALIDACION', 'Hay actividades que no pertenecen a esta estación.');
    const { avancePct, minutosNoCumplidos } = calcularAvance({
      minutosActividades: acts.map((a) => Number(a.minutos)),
      minutosMarcados: acts.filter((a) => marcadas.has(a.id)).map((a) => Number(a.minutos)),
      duracionLaboralMin: p.duracionLaboralMin ?? 0,
    });
    await tx.controlActividad.createMany({
      data: acts.map((a) => ({
        produccionId: id,
        actividadEstandarId: a.id,
        actividadNombre: a.nombre,
        minutos: a.minutos,
        realizada: marcadas.has(a.id),
      })),
    });
    const estado = estadoTrasActividades(p.sobretiempoMin ?? 0, minutosNoCumplidos);
    await transicion(tx, id, 'PENDIENTE_ACTIVIDADES', p.version, { avancePct, minutosNoCumplidos, estado });
    return { estado, avancePct, minutosNoCumplidos };
  });
}

async function motivosValidos(tx: Tx, ids: string[], tipo: 'TIEMPO' | 'PRODUCCION') {
  const ms = await tx.motivo.findMany({ where: { id: { in: ids }, activo: true, tipo: { in: [tipo, 'AMBOS'] } } });
  if (ms.length !== new Set(ids).size) throw new AppError('VALIDACION', 'Hay motivos que no existen.');
  return new Map(ms.map((m) => [m.id, m.nombre]));
}

export async function registrarIncidencias(id: string, items: { motivoId: string; porcentaje: number }[]) {
  const error = validarIncidencias(items);
  if (error) throw new AppError('VALIDACION', error);
  return prisma.$transaction(async (tx) => {
    const p = await cargar(tx, id);
    exigirEstado(p.estado, 'PENDIENTE_INCIDENCIAS_TIEMPO');
    const nombres = await motivosValidos(tx, items.map((i) => i.motivoId), 'TIEMPO');
    await tx.incidenciaTiempo.createMany({
      data: items.map((i) => ({
        produccionId: id,
        motivoId: i.motivoId,
        motivoNombre: nombres.get(i.motivoId)!,
        porcentaje: i.porcentaje,
        tiempoImpactoMin: tiempoImpactoMin(i.porcentaje, p.sobretiempoMin ?? 0),
      })),
    });
    const estado = estadoTrasIncidencias(p.minutosNoCumplidos ?? 0);
    await transicion(tx, id, 'PENDIENTE_INCIDENCIAS_TIEMPO', p.version, { estado });
    return { estado };
  });
}

export async function registrarCausas(id: string, items: { motivoId: string }[]) {
  const ids = items.map((i) => i.motivoId);
  const error = validarCausas(ids);
  if (error) throw new AppError('VALIDACION', error);
  return prisma.$transaction(async (tx) => {
    const p = await cargar(tx, id);
    exigirEstado(p.estado, 'PENDIENTE_CAUSAS');
    const nombres = await motivosValidos(tx, ids, 'PRODUCCION');
    const calculo = calcularCausas(ids.length, p.minutosNoCumplidos ?? 0);
    await tx.causaIncumplimiento.createMany({
      data: calculo.map((c, i) => ({
        produccionId: id,
        motivoId: ids[i]!,
        motivoNombre: nombres.get(ids[i]!)!,
        ...c,
      })),
    });
    await transicion(tx, id, 'PENDIENTE_CAUSAS', p.version, { estado: 'COMPLETADO' });
    return { estado: 'COMPLETADO' as Estado };
  });
}

/** Supervisor: anula un registro (p. ej. para permitir retrabajo) y deja auditoría. */
export async function anular(id: string, motivo: string, sesion: Sesion) {
  return prisma.$transaction(async (tx) => {
    const p = await cargar(tx, id);
    if (p.estado === 'ANULADO') return { estado: 'ANULADO' as Estado };
    await tx.parada.updateMany({ where: { produccionId: id, horaFin: null }, data: { horaFin: new Date() } });
    await transicion(tx, id, p.estado as Estado, p.version, { estado: 'ANULADO', motivoAnulacion: motivo });
    await tx.auditoria.create({
      data: {
        entidad: 'produccion',
        entidadId: id,
        accion: 'ANULAR',
        antes: { estado: p.estado },
        despues: { estado: 'ANULADO', motivo },
        usuarioId: sesion.id,
      },
    });
    return { estado: 'ANULADO' as Estado };
  });
}
