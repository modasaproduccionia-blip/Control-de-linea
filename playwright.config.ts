import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la app levantada (BD importada + semilla). `npm run e2e`.
 * Usa el Chromium preinstalado si existe PW_CHROMIUM; si no, el de Playwright.
 */
const executablePath = process.env.PW_CHROMIUM;
const puerto = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${puerto}`,
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'tablet-vertical', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    {
      name: 'celular',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        browserName: 'chromium',
      },
    },
  ],
  webServer: process.env.E2E_SIN_SERVIDOR
    ? undefined
    : {
        command: `npx next dev -p ${puerto}`,
        port: puerto,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
