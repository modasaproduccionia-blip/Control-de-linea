/**
 * Semilla base: jornada laboral, detalles de parada (EJEMPLO) y usuarios iniciales.
 * Los catálogos reales (clientes, modelos, estaciones, actividades, motivos…) se cargan con
 * `npm run db:import` desde el Excel original. Es idempotente.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { JORNADA_POR_DEFECTO } from '../src/domain/jornada';
import { crearPrisma } from '../src/server/db';

// Catálogo de ejemplo del PROMPT_MAESTRO §5.12. TODO(confirmar): el usuario debe validarlo.
const DETALLES_PARADA = {
  PIEZA: [
    'Falta de componente de fibra de vidrio',
    'Falta de asientos',
    'Falta de componentes de almacén',
    'Pieza con defecto de calidad',
    'Pieza no corresponde al modelo',
    'Otra pieza',
  ],
  MATERIAL: [
    'Falta de materiales de pintura electrostática',
    'Falta de materiales de pintura líquida',
    'Falta de masilla / lijas',
    'Falta de suministros',
    'Falta de instalación de materiales',
    'Otro material',
  ],
} as const;

async function main() {
  const prisma = crearPrisma();
  try {
    for (let dia = 1; dia <= 7; dia++) {
      const v = JORNADA_POR_DEFECTO.dias[dia] ?? null;
      const data = { laborable: v !== null, entrada: v?.entrada ?? null, salida: v?.salida ?? null };
      await prisma.jornadaDia.upsert({ where: { diaSemana: dia }, create: { diaSemana: dia, ...data }, update: {} });
    }
    await prisma.jornadaConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        almuerzoInicio: JORNADA_POR_DEFECTO.almuerzo.inicio,
        almuerzoFin: JORNADA_POR_DEFECTO.almuerzo.fin,
      },
      update: {},
    });

    for (const tipo of ['PIEZA', 'MATERIAL'] as const) {
      for (const [orden, nombre] of DETALLES_PARADA[tipo].entries()) {
        await prisma.detalleParada.upsert({
          where: { tipo_nombre: { tipo, nombre } },
          create: { tipo, nombre, orden, esEjemplo: true, requiereComentario: nombre.startsWith('Otr') },
          update: {},
        });
      }
    }

    // Usuarios iniciales. Cambie los PIN antes de usar en planta (npm run usuario:crear).
    const pin = process.env.SEED_PIN ?? '1234';
    const l2 = await prisma.linea.findUnique({ where: { codigo: 'L2' } });
    const usuarios = [
      { codigo: '1000', nombre: 'Administrador', rol: 'ADMIN' as const, lineaId: null },
      { codigo: '2000', nombre: 'Supervisor de línea', rol: 'SUPERVISOR' as const, lineaId: null },
      { codigo: '3000', nombre: 'Operario de prueba', rol: 'OPERARIO' as const, lineaId: l2?.id ?? null },
    ];
    const pinHash = await bcrypt.hash(pin, 10);
    for (const u of usuarios) {
      await prisma.usuario.upsert({ where: { codigo: u.codigo }, create: { ...u, pinHash }, update: {} });
    }
    console.log('Semilla aplicada: jornada, detalles de parada (ejemplo) y usuarios 1000/2000/3000.');
    if (!process.env.SEED_PIN) console.warn('AVISO: los usuarios iniciales usan PIN 1234. Cámbielos antes de producción.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
