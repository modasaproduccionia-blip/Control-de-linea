/**
 * Importa los catálogos del Excel original (REGISTRO_CL0510.xlsx) a PostgreSQL.
 *
 *   npx tsx scripts/import-excel.ts <archivo.xlsx> [--dry-run]
 *
 * - Hace trim y colapsa espacios; deduplica sin distinguir mayúsculas.
 * - REPORTA las inconsistencias (no las corrige en silencio) — PROMPT_MAESTRO §8.
 * - Es idempotente: se puede ejecutar varias veces (upsert).
 * - No importa TB_HORARIOS/TB_PAUSAS (la jornada sale de DECISIONES.md, ver prisma/seed.ts)
 *   ni TB_MOVIMIENTO (sin uso). Solo informa sus diferencias.
 */
import 'dotenv/config';
import ExcelJS from 'exceljs';
import { crearPrisma } from '../src/server/db';

type Fila = Record<string, unknown>;

const PLACEHOLDER_MOTIVO = 'seleccione motivo-------';

const limpiar = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: string };
    if (o.richText) return limpiar(o.richText.map((r) => r.text).join(''));
    if (o.result !== undefined) return limpiar(o.result);
    if (o.text !== undefined) return limpiar(o.text);
  }
  return String(v).replace(/\s+/g, ' ').trim();
};
const clave = (...partes: string[]) => partes.map((p) => p.toLowerCase()).join('|');

async function leerHojas(archivo: string): Promise<Record<string, Fila[]>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const hojas: Record<string, Fila[]> = {};
  wb.eachSheet((ws) => {
    const encabezados: string[] = [];
    const filas: Fila[] = [];
    ws.eachRow((row, n) => {
      const valores = (row.values as unknown[]).slice(1);
      if (n === 1) {
        valores.forEach((v, i) => (encabezados[i] = limpiar(v)));
        return;
      }
      const fila: Fila = {};
      encabezados.forEach((h, i) => (fila[h] = valores[i] ?? null));
      if (Object.values(fila).some((v) => limpiar(v) !== '')) filas.push(fila);
    });
    hojas[ws.name] = filas;
  });
  return hojas;
}

async function main() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  if (!archivo) {
    console.error('Uso: tsx scripts/import-excel.ts <archivo.xlsx> [--dry-run]');
    process.exit(1);
  }

  const hojas = await leerHojas(archivo);
  const hoja = (n: string) => {
    const h = hojas[n];
    if (!h) throw new Error(`Falta la hoja/tabla ${n} en ${archivo}`);
    return h;
  };
  const avisos: string[] = [];
  const aviso = (m: string) => avisos.push(m);

  // ---------- Lectura y normalización ----------
  const lineas = new Map<string, { codigo: string; horaEstandarMin: number | null }>();
  for (const f of hoja('TB_PARAMETROS_LINEA')) {
    const codigo = limpiar(f.Linea);
    const std = Number(limpiar(f.HoraEstandar));
    lineas.set(clave(codigo), {
      codigo,
      horaEstandarMin: Number.isFinite(std) ? Math.round(std) : null,
    });
  }

  const modelos = new Map<string, string>();
  const estaciones = new Map<string, { codigo: string; linea: string }>();
  const combos = new Map<string, { modelo: string; linea: string; estacion: string }>();
  for (const f of hoja('TB_ESTACIONES')) {
    const modelo = limpiar(f.MODELO);
    const linea = limpiar(f.Linea);
    const estacion = limpiar(f.Estacion);
    if (!modelo || !linea || !estacion) {
      aviso(`TB_ESTACIONES: fila incompleta (${modelo}/${linea}/${estacion}) — omitida`);
      continue;
    }
    if (!lineas.has(clave(linea))) {
      aviso(`TB_ESTACIONES: línea ${linea} sin hora estándar en TB_PARAMETROS_LINEA`);
      lineas.set(clave(linea), { codigo: linea, horaEstandarMin: null });
    }
    modelos.set(clave(modelo), modelo);
    estaciones.set(clave(linea, estacion), { codigo: estacion, linea });
    const k = clave(modelo, linea, estacion);
    if (combos.has(k)) aviso(`TB_ESTACIONES: combinación repetida ${modelo}/${linea}/${estacion}`);
    combos.set(k, { modelo, linea, estacion });
  }

  const clientes = new Map<string, { nombre: string; sigla: string }>();
  const siglas = new Set<string>();
  for (const f of hoja('TB_CLIENTE')) {
    const nombre = limpiar(f.Cliente);
    const sigla = limpiar(f.SiglaCliente).toUpperCase();
    if (!nombre || !sigla) {
      aviso(`TB_CLIENTE: cliente sin nombre o sigla (${nombre}/${sigla}) — omitido`);
      continue;
    }
    if (clientes.has(clave(nombre)) || siglas.has(sigla)) {
      aviso(`TB_CLIENTE: cliente o sigla repetida ${nombre} (${sigla}) — omitido`);
      continue;
    }
    clientes.set(clave(nombre), { nombre, sigla });
    siglas.add(sigla);
  }

  const responsables = new Map<string, { linea: string; estacion: string; nombre: string }>();
  for (const f of hoja('TB_RESPONSABLE')) {
    const linea = limpiar(f.Linea);
    const estacion = limpiar(f.Estacion);
    const nombre = limpiar(f.Responsable);
    if (!estaciones.has(clave(linea, estacion))) {
      aviso(`TB_RESPONSABLE: ${linea}/${estacion} no existe en TB_ESTACIONES — omitido`);
      continue;
    }
    responsables.set(clave(linea, estacion), { linea, estacion, nombre });
  }
  for (const [k, e] of estaciones) {
    if (!responsables.has(k))
      aviso(`Sin responsable: ${e.linea}/${e.codigo} (se mostrará "Sin responsable asignado")`);
  }

  const actividades = new Map<
    string,
    {
      modelo: string;
      linea: string;
      estacion: string;
      nombre: string;
      minutos: number;
      orden: number;
    }
  >();
  const ordenPorCombo = new Map<string, number>();
  let provisionales = 0;
  const huerfanas = new Map<string, number>();
  for (const f of hoja('TB_ACTIVIDADES')) {
    const modelo = limpiar(f.MODELO);
    const linea = limpiar(f.Linea);
    const estacion = limpiar(f.Estacion);
    const nombre = limpiar(f.Actividad);
    const minutos = Math.round(Number(limpiar(f.minutos)) * 100) / 100;
    const kc = clave(modelo, linea, estacion);
    if (!combos.has(kc)) {
      huerfanas.set(
        `${modelo}/${linea}/${estacion}`,
        (huerfanas.get(`${modelo}/${linea}/${estacion}`) ?? 0) + 1,
      );
      continue;
    }
    if (!nombre || !Number.isFinite(minutos) || minutos <= 0) {
      aviso(
        `TB_ACTIVIDADES: actividad inválida en ${modelo}/${linea}/${estacion}: "${nombre}" (${limpiar(f.minutos)}) — omitida`,
      );
      continue;
    }
    const k = clave(modelo, linea, estacion, nombre);
    if (actividades.has(k)) {
      aviso(
        `TB_ACTIVIDADES: duplicada ${modelo}/${linea}/${estacion} "${nombre}" — se importa una sola vez`,
      );
      continue;
    }
    const orden = (ordenPorCombo.get(kc) ?? 0) + 1;
    ordenPorCombo.set(kc, orden);
    if (minutos === 100) provisionales++;
    actividades.set(k, { modelo, linea, estacion, nombre, minutos, orden });
  }
  for (const [c, n] of huerfanas) {
    aviso(
      `TB_ACTIVIDADES: ${n} actividades de ${c}, combinación que no existe en TB_ESTACIONES — omitidas`,
    );
  }
  for (const [k, c] of combos) {
    if (!ordenPorCombo.has(k))
      aviso(`Sin actividades: ${c.modelo}/${c.linea}/${c.estacion} (no se podrá INICIAR)`);
  }
  if (provisionales)
    aviso(`${provisionales} actividades con exactamente 100 min: se marcan como provisionales`);

  const motivos = new Map<string, string>();
  for (const f of hoja('TB_MOTIVOS')) {
    const nombre = limpiar(f.MOTIVOS);
    if (!nombre) continue;
    if (nombre.toLowerCase() === PLACEHOLDER_MOTIVO) {
      aviso(`TB_MOTIVOS: se omite el placeholder "${nombre}"`);
      continue;
    }
    if (/[a-záéíóúñ][ÁÉÍÓÚ]/.test(nombre))
      aviso(`TB_MOTIVOS: posible tilde mal escrita en "${nombre}" (se importa tal cual)`);
    if (motivos.has(nombre.toLowerCase())) continue;
    motivos.set(nombre.toLowerCase(), nombre);
  }

  if (hojas.TB_HORARIOS) {
    for (const f of hojas.TB_HORARIOS) {
      const dia = limpiar(f.Dia);
      const fin = limpiar(f.HoraFinTexto);
      if ((dia === 'Viernes' && fin !== '19:50') || (dia === 'Sábado' && fin !== '16:00')) {
        aviso(`TB_HORARIOS: ${dia} termina ${fin} en el Excel; se usa la jornada de DECISIONES.md`);
      }
    }
  }

  // ---------- Reporte ----------
  console.log(`\nArchivo: ${archivo}${dryRun ? '  (DRY-RUN: no se escribe nada)' : ''}`);
  console.table({
    lineas: lineas.size,
    modelos: modelos.size,
    estaciones: estaciones.size,
    combinaciones: combos.size,
    clientes: clientes.size,
    responsables: responsables.size,
    actividades: actividades.size,
    motivos: motivos.size,
  });
  console.log(`\nInconsistencias / avisos (${avisos.length}):`);
  for (const a of avisos) console.log(`  - ${a}`);
  if (dryRun) return;

  // ---------- Carga ----------
  const prisma = crearPrisma();
  try {
    await prisma.$transaction(
      async (tx) => {
        const idLinea = new Map<string, string>();
        for (const [k, l] of lineas) {
          const r = await tx.linea.upsert({
            where: { codigo: l.codigo },
            create: { codigo: l.codigo, horaEstandarMin: l.horaEstandarMin },
            update: { horaEstandarMin: l.horaEstandarMin },
          });
          idLinea.set(k, r.id);
        }
        const idModelo = new Map<string, string>();
        for (const [k, codigo] of modelos) {
          const r = await tx.modelo.upsert({ where: { codigo }, create: { codigo }, update: {} });
          idModelo.set(k, r.id);
        }
        const idEstacion = new Map<string, string>();
        for (const [k, e] of estaciones) {
          const lineaId = idLinea.get(clave(e.linea))!;
          const r = await tx.estacion.upsert({
            where: { codigo_lineaId: { codigo: e.codigo, lineaId } },
            create: { codigo: e.codigo, lineaId },
            update: {},
          });
          idEstacion.set(k, r.id);
        }
        for (const c of combos.values()) {
          const data = {
            modeloId: idModelo.get(clave(c.modelo))!,
            lineaId: idLinea.get(clave(c.linea))!,
            estacionId: idEstacion.get(clave(c.linea, c.estacion))!,
          };
          await tx.modeloLineaEstacion.upsert({
            where: { modeloId_lineaId_estacionId: data },
            create: data,
            update: { activo: true },
          });
        }
        for (const c of clientes.values()) {
          await tx.cliente.upsert({
            where: { nombre: c.nombre },
            create: c,
            update: { sigla: c.sigla },
          });
        }
        for (const r of responsables.values()) {
          const lineaId = idLinea.get(clave(r.linea))!;
          const estacionId = idEstacion.get(clave(r.linea, r.estacion))!;
          await tx.responsableEstacion.upsert({
            where: { lineaId_estacionId: { lineaId, estacionId } },
            create: { lineaId, estacionId, nombre: r.nombre },
            update: { nombre: r.nombre },
          });
        }
        for (const a of actividades.values()) {
          const ids = {
            modeloId: idModelo.get(clave(a.modelo))!,
            lineaId: idLinea.get(clave(a.linea))!,
            estacionId: idEstacion.get(clave(a.linea, a.estacion))!,
          };
          await tx.actividadEstandar.upsert({
            where: { modeloId_lineaId_estacionId_nombre: { ...ids, nombre: a.nombre } },
            create: {
              ...ids,
              nombre: a.nombre,
              minutos: a.minutos,
              orden: a.orden,
              esProvisional: a.minutos === 100,
            },
            update: {
              minutos: a.minutos,
              orden: a.orden,
              esProvisional: a.minutos === 100,
              activo: true,
            },
          });
        }
        for (const nombre of motivos.values()) {
          await tx.motivo.upsert({
            where: { nombre },
            create: { nombre, tipo: 'AMBOS' },
            update: {},
          });
        }
      },
      { timeout: 120_000 },
    );
    console.log('\nImportación completada.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
