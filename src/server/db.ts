import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/** Una sola instancia de Prisma por proceso (también durante el hot reload de `next dev`). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function crearPrisma(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('Falta DATABASE_URL');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? crearPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
