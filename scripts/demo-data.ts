/**
 * Genera producciones SINTÉTICAS para probar el panel de indicadores (PROMPT_MAESTRO §8).
 * Quedan marcadas `es_demo = true`: no aparecen en "Trabajos en curso" ni en el listado/exportación
 * del supervisor, y el panel avisa cuando las incluye. Nunca se ejecuta en producción.
 *
 *   npm run db:demo            # crea ~150 trabajos de los últimos 14 días
 *   npm run db:demo -- --borrar
 */
import 'dotenv/config';
import { calcularAvance } from '../src/domain/avance';
import { calcularCausas } from '../src/domain/causas';
import { calcularCierre, minutosParada } from '../src/domain/duracion';
import { estadoTrasActividades } from '../src/domain/estados';
import { tiempoImpactoMin } from '../src/domain/incidencias';
import { JORNADA_POR_DEFECTO as J } from '../src/domain/jornada';
import { crearPrisma } from '../src/server/db';

if (process.env.NODE_ENV === 'production') {
  console.error('No se generan datos de demostración en producción.');
  process.exit(1);
}

let semilla = 7;
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
const elegir = <T>(xs: T[]): T => xs[Math.floor(azar() * xs.length)]!;
const lima = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(Date.UTC(y, m, d, h + 5, min)); // America/Lima = UTC−5 sin horario de verano

async function main() {
  const prisma = crearPrisma();
  try {
    const borrados = await prisma.produccion.deleteMany({ where: { esDemo: true } });
    if (process.argv.includes('--borrar')) {
      console.log(`Borrados ${borrados.count} trabajos de demostración.`);
      return;
    }
    const [combos, clientes, motivos, detalles, usuario] = await Promise.all([
      prisma.modeloLineaEstacion.findMany({ include: { linea: true, estacion: true } }),
      prisma.cliente.findMany(),
      prisma.motivo.findMany(),
      prisma.detalleParada.findMany(),
      prisma.usuario.findFirst({ where: { rol: 'ADMIN' } }),
    ]);
    if (!usuario || !combos.length)
      throw new Error('Primero ejecute npm run db:import y npm run db:seed');
    const actividades = await prisma.actividadEstandar.findMany({ where: { activo: true } });

    const hoy = new Date();
    let creados = 0;
    for (let i = 0; i < 160; i++) {
      const c = elegir(combos);
      const acts = actividades.filter(
        (a) =>
          a.modeloId === c.modeloId && a.lineaId === c.lineaId && a.estacionId === c.estacionId,
      );
      if (!acts.length || !c.linea.horaEstandarMin) continue;
      const dia = new Date(hoy.getTime() - (1 + Math.floor(azar() * 14)) * 86_400_000);
      if (dia.getUTCDay() === 0) continue; // domingo no se trabaja
      const inicio = lima(
        dia.getUTCFullYear(),
        dia.getUTCMonth(),
        dia.getUTCDate(),
        7 + Math.floor(azar() * 3),
        Math.floor(azar() * 60),
      );
      const std = c.linea.horaEstandarMin;
      const fin = new Date(inicio.getTime() + std * (0.7 + azar() * 0.75) * 60_000 + 45 * 60_000);
      const cierre = calcularCierre({
        horaInicio: inicio,
        horaFin: fin,
        horaEstandarMin: std,
        jornada: J,
      });
      const marcadas = acts.filter(() => azar() < 0.55 + azar() * 0.45);
      const { avancePct, minutosNoCumplidos } = calcularAvance({
        minutosActividades: acts.map((a) => Number(a.minutos)),
        minutosMarcados: marcadas.map((a) => Number(a.minutos)),
        duracionLaboralMin: cierre.duracionLaboralMin,
      });
      const cliente = elegir(clientes);
      const numero = String(100 + i).padStart(3, '0');
      const paradas = Array.from({ length: azar() < 0.45 ? (azar() < 0.6 ? 1 : 2) : 0 }, (_, k) => {
        const d = elegir(detalles.filter((x) => !x.requiereComentario));
        const pi = new Date(inicio.getTime() + (30 + k * 90) * 60_000);
        const pf = new Date(pi.getTime() + (10 + azar() * 60) * 60_000);
        return { d, pi, pf, ...minutosParada(pi, pf, J) };
      });
      const estado = estadoTrasActividades(cierre.sobretiempoMin, minutosNoCumplidos);
      await prisma.produccion.create({
        data: {
          fechaProduccion: new Date(
            Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate()),
          ),
          clienteId: cliente.id,
          modeloId: c.modeloId,
          lineaId: c.lineaId,
          estacionId: c.estacionId,
          estacionCodigo: c.estacion.codigo,
          numeroBus: numero,
          codigoBus: `${cliente.sigla}${numero}`,
          horaInicio: inicio,
          horaFin: fin,
          horaEstandarMin: std,
          jornadaSnapshot: J as object,
          ...cierre,
          minutosParada: paradas.reduce((s, x) => s + x.duracionLaboralMin, 0),
          avancePct,
          minutosNoCumplidos,
          estado: 'COMPLETADO',
          iniciadoPorId: usuario.id,
          finalizadoPorId: usuario.id,
          esDemo: true,
          paradas: {
            create: paradas.map((x) => ({
              tipo: x.d.tipo,
              detalleParadaId: x.d.id,
              detalleNombre: x.d.nombre,
              horaInicio: x.pi,
              horaFin: x.pf,
              duracionRealMin: x.duracionRealMin,
              duracionLaboralMin: x.duracionLaboralMin,
              registradoPorId: usuario.id,
            })),
          },
          actividades: {
            create: acts.map((a) => ({
              actividadEstandarId: a.id,
              actividadNombre: a.nombre,
              minutos: a.minutos,
              realizada: marcadas.includes(a),
            })),
          },
          incidencias:
            estado === 'PENDIENTE_INCIDENCIAS_TIEMPO'
              ? {
                  create: (() => {
                    const m = [elegir(motivos), elegir(motivos)];
                    const unicos = m[0]!.id === m[1]!.id ? [m[0]!] : m;
                    const pcts = unicos.length === 1 ? [100] : [60, 40];
                    return unicos.map((mm, k) => ({
                      motivoId: mm.id,
                      motivoNombre: mm.nombre,
                      porcentaje: pcts[k]!,
                      tiempoImpactoMin: tiempoImpactoMin(pcts[k]!, cierre.sobretiempoMin),
                    }));
                  })(),
                }
              : undefined,
          causas:
            minutosNoCumplidos > 0
              ? {
                  create: (() => {
                    const m = [
                      ...new Map(
                        [elegir(motivos), elegir(motivos), elegir(motivos)].map((x) => [x.id, x]),
                      ).values(),
                    ];
                    return calcularCausas(m.length, minutosNoCumplidos).map((cc, k) => ({
                      motivoId: m[k]!.id,
                      motivoNombre: m[k]!.nombre,
                      ...cc,
                    }));
                  })(),
                }
              : undefined,
        },
      });
      creados++;
    }
    console.log(`Creados ${creados} trabajos de demostración (es_demo = true).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
