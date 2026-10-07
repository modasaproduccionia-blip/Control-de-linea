/**
 * Crea o actualiza un usuario (y su PIN).
 *
 *   npm run usuario:crear -- <codigo> "<nombre>" <OPERARIO|SUPERVISOR|ADMIN> <pin> [linea]
 *   ej.: npm run usuario:crear -- 4521 "Juan Pérez" OPERARIO 7391 L2
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { crearPrisma } from '../src/server/db';

async function main() {
  const [codigo, nombre, rol, pin, linea] = process.argv.slice(2);
  if (!codigo || !nombre || !rol || !pin || !['OPERARIO', 'SUPERVISOR', 'ADMIN'].includes(rol)) {
    console.error(
      'Uso: npm run usuario:crear -- <codigo> "<nombre>" <OPERARIO|SUPERVISOR|ADMIN> <pin> [linea]',
    );
    process.exit(1);
  }
  if (!/^\d{4,6}$/.test(pin)) {
    console.error('El PIN debe tener de 4 a 6 dígitos.');
    process.exit(1);
  }
  const prisma = crearPrisma();
  try {
    const lineaId = linea
      ? (await prisma.linea.findUnique({ where: { codigo: linea } }))?.id
      : null;
    if (linea && !lineaId) throw new Error(`No existe la línea ${linea}`);
    const data = {
      nombre,
      rol: rol as 'OPERARIO' | 'SUPERVISOR' | 'ADMIN',
      pinHash: await bcrypt.hash(pin, 10),
      lineaId: lineaId ?? null,
      activo: true,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    };
    await prisma.usuario.upsert({ where: { codigo }, create: { codigo, ...data }, update: data });
    console.log(`Usuario ${codigo} (${rol}${linea ? ` · ${linea}` : ''}) guardado.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
