import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Todas las reglas de jornada trabajan en hora de Lima; las pruebas no deben depender del TZ de la máquina.
    env: { TZ: 'UTC' },
  },
});
