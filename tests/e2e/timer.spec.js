const { test, expect, addTime } = require('./helpers');

test('estadísticas, Alt+Z y Ctrl+Z', async ({ app: page }) => {
  for (const t of ['1234', '12.5+', '1:05.22', 'dnf', '987']) await addTime(page, t);
  await expect(page.locator('#statsBar')).toContainText('9.87');
  await expect(page.locator('.time-item')).toHaveCount(5);
  await page.mouse.click(650, 300);
  await page.keyboard.press('Alt+KeyZ');
  await expect(page.locator('.time-item')).toHaveCount(4);
  await page.keyboard.press('Control+KeyZ');
  await expect(page.locator('.time-item')).toHaveCount(5);
});

test('inspección configurable: pasarse da +2', async ({ app: page }) => {
  await page.click('#settingsToggle');
  await page.selectOption('#setInspDur', '8');
  await expect(page.locator('#hint')).toContainText('(8 s)');
  await page.mouse.click(650, 600);
  await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await page.waitForTimeout(9100);
  await expect(page.locator('#timer')).toHaveText('+2');
  await page.keyboard.down('Space'); await page.waitForTimeout(400); await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyA');
  expect(await page.evaluate(() => catSolves()[0].penalty)).toBe('+2');
});

test('tamaño del scramble', async ({ app: page }) => {
  await page.click('#settingsToggle');
  await page.click('#setScrSize button[data-v=xl]');
  await expect(page.locator('#scrambleText')).toHaveCSS('font-size', '25.6px');
});

test('seleccionar varios, moverlos a una sesión nueva y deshacer', async ({ app: page }) => {
  for (const t of ['10.00', '11.00', '12.00', '13.00']) await addTime(page, t);
  await page.click('#selOn');
  await page.locator('.time-item').nth(0).click();
  await page.locator('.time-item').nth(2).click({ modifiers: ['Shift'] });
  await expect(page.locator('#listTools')).toContainText('3 sel.');
  page.promptAnswer = 'Práctica OH';
  await page.selectOption('#selMove', '__new');
  await expect(page.locator('.time-item')).toHaveCount(1);
  await expect(page.locator('#session')).toContainText('Práctica OH (3)');
  await page.keyboard.press('Control+KeyZ');
  await expect(page.locator('.time-item')).toHaveCount(4);
});

test('mover un tiempo desde su detalle y vaciar la sesión', async ({ app: page }) => {
  for (const t of ['10.00', '11.00']) await addTime(page, t);
  page.promptAnswer = 'Otra';
  await page.selectOption('#session', '__new');
  await page.selectOption('#category', '3x3');
  const first = await page.evaluate(() => sessions['3x3'].list[0].id);
  await page.selectOption('#session', first);
  await page.locator('.time-item').first().click();
  const target = await page.evaluate(() => sessions['3x3'].list[1].id);
  await page.selectOption('#dSess', target);
  await page.click('#dDone');
  await expect(page.locator('.time-item')).toHaveCount(1);
  await page.selectOption('#session', '__clear');
  await page.click('#modalConfirm');
  await expect(page.locator('.time-item')).toHaveCount(0);
  await page.click('#toastUndo');
  await expect(page.locator('.time-item')).toHaveCount(1);
});

test('pantalla encendida: se pide el bloqueo', async ({ page }) => {
  await page.addInitScript(() => {
    window.__wl = 0;
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wl++; return { release: async () => {}, addEventListener() {} }; } } });
    localStorage.setItem('ekitimer-settings', JSON.stringify({ rs: false }));
  });
  await page.route(/cdn\.cubing\.net|fonts\./, r => r.abort());
  await page.goto('/');
  await page.mouse.click(500, 500);
  await expect.poll(() => page.evaluate(() => window.__wl)).toBeGreaterThan(0);
});

test('todas las categorías se pintan sin errores', async ({ app: page }) => {
  const cats = await page.$$eval('#category option', os => os.map(o => o.value));
  for (const c of cats) {
    await page.selectOption('#category', c);
    await expect(page.locator('#scrambleText')).not.toHaveText(/Generando/);
  }
});

test('la app es instalable: manifiesto e iconos', async ({ app: page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.short_name).toBe('EKITIMER');
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  expect((await request.get('/sw.js')).ok()).toBe(true);
});
