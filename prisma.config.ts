import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Vacío solo durante `prisma generate` en la imagen Docker (no necesita conexión).
    url: process.env.DATABASE_URL ?? '',
  },
});
