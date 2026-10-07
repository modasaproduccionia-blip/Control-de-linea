import { expect, type Page, test } from '@playwright/test';

/** Requiere: npm run db:import && npm run db:seed (usuarios 3000 / 2000 con PIN 1234). */
async function ingresar(page: Page, codigo: string) {
  await page.goto('/');
  await page.waitForURL('**/login');
  await page.fill('#codigo', codigo);
  for (const d of '1234')
    await page.locator('.keypad button', { hasText: new RegExp(`^${d}$`) }).click();
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function nuevoTrabajo(page: Page, estacion: string) {
  await page.getByRole('link', { name: 'Nuevo trabajo' }).click();
  await page.fill('input[aria-label="Buscar cliente"]', 'CIVA');
  await page.getByRole('button', { name: 'CIVA' }).click();
  await page.getByRole('button', { name: 'ZEUS5' }).click();
  await page.getByRole('button', { name: estacion, exact: true }).click();
  const numero = String(100 + Math.floor(Math.random() * 900));
  for (const d of numero)
    await page.locator('.keypad button', { hasText: new RegExp(`^${d}$`) }).click();
  await expect(page.locator('.code .big')).toHaveText(`CV${numero}`);
  return numero;
}

test('operario: iniciar, parada, finalizar, actividades, causas y completado', async ({ page }) => {
  await ingresar(page, '3000');
  await nuevoTrabajo(page, 'E24');
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await page.locator('dialog[open] .btn-blue').click();
  await expect(page.locator('.timer')).toBeVisible();

  // Parada: con parada abierta no se puede finalizar (solo se muestra TERMINAR PARADA).
  await page.getByRole('button', { name: 'Registrar parada' }).click();
  await page.getByRole('button', { name: 'Material' }).click();
  await page.getByRole('button', { name: 'Falta de masilla / lijas' }).click();
  await page.getByRole('button', { name: 'Iniciar parada' }).click();
  await expect(page.locator('.stopband')).toContainText('Falta de masilla / lijas');
  await expect(page.getByRole('button', { name: 'Finalizar' })).toHaveCount(0);

  // Recarga durante la parada: el estado viene de la BD.
  await page.reload();
  await expect(page.locator('.stopband')).toBeVisible();
  await page.getByRole('button', { name: 'Terminar parada' }).click();
  await page.locator('dialog[open] .btn-yellow').click();
  await expect(page.locator('.stoplist li')).toHaveCount(1);

  await page.getByRole('button', { name: 'Finalizar' }).click();
  await page.locator('dialog[open] .btn-red').click();
  await expect(
    page.getByRole('heading', { name: 'Marca las actividades realizadas' }),
  ).toBeVisible();
  await page.locator('button.check').first().click();
  await page.getByRole('button', { name: 'Registrar actividades' }).click();
  await page.locator('dialog[open] .btn-blue').click();

  await expect(
    page.getByRole('heading', { name: /Se dejaron de ejecutar \d+ minutos/ }),
  ).toBeVisible();
  await page.locator('select[aria-label="Causa 1"]').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await page.locator('dialog[open] .btn-blue').click();
  await expect(page.getByText('Registro completado')).toBeVisible();
});

test('duplicado: el mismo bus no se puede iniciar dos veces en la misma estación', async ({
  page,
}) => {
  await ingresar(page, '3000');
  const numero = await nuevoTrabajo(page, 'E25');
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await page.locator('dialog[open] .btn-blue').click();
  await expect(page.locator('.timer')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Nuevo trabajo' }).click();
  await page.fill('input[aria-label="Buscar cliente"]', 'CIVA');
  await page.getByRole('button', { name: 'CIVA' }).click();
  await page.getByRole('button', { name: 'ZEUS5' }).click();
  await page.getByRole('button', { name: 'E25', exact: true }).click();
  for (const d of numero)
    await page.locator('.keypad button', { hasText: new RegExp(`^${d}$`) }).click();
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await expect(page.locator('p.err')).toHaveText(
    'Este Código Bus ya fue registrado en esta estación.',
  );
});

test('estación sin actividades bloquea INICIAR', async ({ page }) => {
  await ingresar(page, '3000');
  await page.getByRole('link', { name: 'Nuevo trabajo' }).click();
  await page.getByRole('button', { name: '360F' }).click();
  await page.getByRole('button', { name: 'E28', exact: true }).click();
  await expect(page.locator('p.err')).toContainText('no tiene actividades configuradas');
});

test('indicadores cargan y el operario no puede entrar a Registros', async ({ page }) => {
  await ingresar(page, '3000');
  await page.getByRole('link', { name: 'Indicadores' }).click();
  await expect(page.locator('.kpis')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registros' })).toHaveCount(0);
  await page.goto('/supervisor');
  await page.waitForURL((u) => u.pathname === '/');
});
