import ExcelJS from 'exceljs';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';

export interface FiltroListado {
  desde?: string;
  hasta?: string;
  lineaId?: string;
  estado?: string;
  codigoBus?: string;
}

function whereListado(f: FiltroListado): Prisma.ProduccionWhereInput {
  return {
    esDemo: false,
    ...(f.lineaId ? { lineaId: f.lineaId } : {}),
    ...(f.estado ? { estado: f.estado as Prisma.EnumEstadoProduccionFilter['equals'] } : {}),
    ...(f.codigoBus ? { codigoBus: { contains: f.codigoBus.trim().toUpperCase() } } : {}),
    ...(f.desde || f.hasta
      ? {
          fechaProduccion: {
            ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00Z`) } : {}),
            ...(f.hasta ? { lte: new Date(`${f.hasta}T00:00:00Z`) } : {}),
          },
        }
      : {}),
  };
}

export async function listado(f: FiltroListado) {
  const filas = await prisma.produccion.findMany({
    where: whereListado(f),
    orderBy: { horaInicio: 'desc' },
    take: 200,
    include: {
      modelo: { select: { codigo: true } },
      linea: { select: { codigo: true } },
      estacion: { select: { codigo: true } },
      cliente: { select: { nombre: true } },
    },
  });
  return filas.map((p) => ({
    id: p.id,
    fecha: p.fechaProduccion.toISOString().slice(0, 10),
    codigoBus: p.codigoBus,
    cliente: p.cliente.nombre,
    modelo: p.modelo.codigo,
    linea: p.linea.codigo,
    estacion: p.estacion.codigo,
    estado: p.estado,
    horaInicio: p.horaInicio.toISOString(),
    horaFin: p.horaFin?.toISOString() ?? null,
    duracionLaboralMin: p.duracionLaboralMin,
    sobretiempoMin: p.sobretiempoMin,
    avancePct: p.avancePct == null ? null : Number(p.avancePct),
    cumpleTiempo: p.cumpleTiempo,
    motivoAnulacion: p.motivoAnulacion,
  }));
}

const siNo = (b: boolean | null) => (b == null ? '' : b ? 'SI' : 'NO');
const lima = (d: Date | null) =>
  d ? d.toLocaleString('sv-SE', { timeZone: 'America/Lima' }).replace('T', ' ') : '';

/**
 * Exporta a .xlsx con las mismas columnas que las tablas originales de Excel
 * (TB_PRODUCCION, TB_CONTROL_ACTIVIDADES, TB_INCIDENCIAS, TB_CAUSAS_INCUMPLIMIENTO, + paradas)
 * para no romper reportes existentes.
 */
export async function exportarXlsx(f: FiltroListado): Promise<Buffer> {
  const prods = await prisma.produccion.findMany({
    where: { ...whereListado(f), ...(f.estado ? {} : { estado: { not: 'ANULADO' } }) },
    orderBy: { horaInicio: 'asc' },
    take: 20_000,
    include: {
      cliente: true,
      modelo: true,
      linea: true,
      estacion: true,
      actividades: true,
      incidencias: true,
      causas: { orderBy: { ordenImportancia: 'asc' } },
      paradas: true,
    },
  });
  const wb = new ExcelJS.Workbook();
  const hoja = (nombre: string, columnas: string[]) => {
    const ws = wb.addWorksheet(nombre);
    ws.columns = columnas.map((c) => ({ header: c, key: c, width: Math.max(12, c.length + 2) }));
    ws.getRow(1).font = { bold: true };
    return ws;
  };
  const tp = hoja('TB_PRODUCCION', [
    'IDProduccion', 'FechaProduccion', 'Responsable', 'Estacion', 'Linea', 'CodigoBus', 'Cliente', 'HoraInicio',
    'HoraFin', 'DuracionReal', 'HoraEstandar', 'Sobretiempo', 'CumpleTiempo', 'Modelo', 'AvanceFinalNuevo2',
    'DuracionLaboralReal', 'MinutosNoCumplidos', 'MinutosLaborales', 'MinutosParada', 'Estado',
  ]);
  const ta = hoja('TB_CONTROL_ACTIVIDADES', ['IDRegistro', 'IDProduccion', 'Estacion', 'CodigoBus', 'Actividad', 'Realizada', 'FechaProduccion']);
  const ti = hoja('TB_INCIDENCIAS', ['IDMotivo', 'IDProduccion', 'Estacion', 'CodigoBus', 'Motivo', 'Porcentaje', 'TiempoImpacto', 'FechaProduccion']);
  const tc = hoja('TB_CAUSAS_INCUMPLIMIENTO', [
    'IDCausa', 'IDProduccion', 'CodigoBus', 'Estacion', 'Motivoproduccion', 'OrdenImportancia', 'PesoAsignado',
    'MinutosImpacto', 'FechaProduccion',
  ]);
  const tpa = hoja('PARADAS', [
    'IDParada', 'IDProduccion', 'CodigoBus', 'Estacion', 'Tipo', 'Detalle', 'Comentario', 'HoraInicio', 'HoraFin',
    'DuracionReal', 'DuracionLaboral', 'FechaProduccion',
  ]);
  for (const p of prods) {
    const fecha = p.fechaProduccion.toISOString().slice(0, 10);
    const base = { IDProduccion: p.id, Estacion: p.estacion.codigo, CodigoBus: p.codigoBus, FechaProduccion: fecha };
    tp.addRow({
      ...base,
      Responsable: p.responsableNombre ?? '',
      Linea: p.linea.codigo,
      Cliente: p.cliente.nombre,
      HoraInicio: lima(p.horaInicio),
      HoraFin: lima(p.horaFin),
      DuracionReal: p.duracionRealMin,
      HoraEstandar: p.horaEstandarMin,
      Sobretiempo: p.sobretiempoMin,
      CumpleTiempo: siNo(p.cumpleTiempo),
      Modelo: p.modelo.codigo,
      AvanceFinalNuevo2: p.avancePct == null ? null : Number(p.avancePct),
      DuracionLaboralReal: p.duracionLaboralMin,
      MinutosNoCumplidos: p.minutosNoCumplidos,
      MinutosLaborales: p.minutosLaborales,
      MinutosParada: p.minutosParada,
      Estado: p.estado,
    });
    for (const a of p.actividades) {
      ta.addRow({ ...base, IDRegistro: a.id, Actividad: a.actividadNombre, Realizada: siNo(a.realizada) });
    }
    for (const i of p.incidencias) {
      ti.addRow({ ...base, IDMotivo: i.id, Motivo: i.motivoNombre, Porcentaje: i.porcentaje, TiempoImpacto: Number(i.tiempoImpactoMin) });
    }
    for (const c of p.causas) {
      tc.addRow({
        ...base,
        IDCausa: c.id,
        Motivoproduccion: c.motivoNombre,
        OrdenImportancia: c.ordenImportancia,
        PesoAsignado: c.pesoAsignado,
        MinutosImpacto: c.minutosImpacto,
      });
    }
    for (const x of p.paradas) {
      tpa.addRow({
        ...base,
        IDParada: x.id,
        Tipo: x.tipo,
        Detalle: x.detalleNombre,
        Comentario: x.comentario ?? '',
        HoraInicio: lima(x.horaInicio),
        HoraFin: lima(x.horaFin),
        DuracionReal: x.duracionRealMin,
        DuracionLaboral: x.duracionLaboralMin,
      });
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
