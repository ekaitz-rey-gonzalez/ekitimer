const path = require('node:path');
const fs = require('node:fs');
const { test, expect, addTime, startRound, FIXTURES } = require('./helpers');

test('copia de seguridad, restauración sin duplicados y Excel', async ({ app: page, browser }, info) => {
  await startRound(page, { target: '12' });
  for (const t of ['11.20', '10.50', '12.10', '11.80', '11.00']) await addTime(page, t);
  await page.click('#rClose');
  await addTime(page, '9.99');
  await page.click('#dataBtn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkDownload')]);
  const file = info.outputPath('copia.json');
  await dl.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.app).toBe('ekitimer');
  expect(backup.solves).toHaveLength(6);
  expect(backup.rounds).toHaveLength(1);
  const asUpload = { name: 'copia.json', mimeType: 'application/json', buffer: fs.readFileSync(file) };

  const [x] = await Promise.all([page.waitForEvent('download'), page.click('#exportXlsxBtn')]);
  expect(x.suggestedFilename()).toMatch(/^EKITIMER_.*\.xlsx$/);

  // Navegador nuevo, sin datos: restaurar
  const ctx = await browser.newContext();
  const fresh = await ctx.newPage();
  const freshErrors = [];
  fresh.on('pageerror', e => freshErrors.push(e.message));
  await fresh.addInitScript(() => localStorage.setItem('ekitimer-settings', JSON.stringify({ rs: false })));
  await fresh.route(/cdn\.cubing\.net|fonts\./, r => r.abort());
  await fresh.goto('/');
  await fresh.click('#dataBtn');
  await fresh.setInputFiles('#impFile', asUpload);
  await expect(fresh.locator('#impPlan')).toContainText('Se añadirán 6 tiempos y 1 ronda');
  await fresh.click('#impGo');
  await expect(fresh.locator('.time-item')).toHaveCount(6);
  await fresh.click('#dataBtn');
  await fresh.setInputFiles('#impFile', asUpload);
  await expect(fresh.locator('#impPlan')).toContainText('Ya tienes todo');
  expect(freshErrors).toEqual([]);
  await ctx.close();
});

test('importar csTimer y Twisty Timer, sin duplicar y con deshacer', async ({ app: page }) => {
  await page.click('#dataBtn');
  await page.setInputFiles('#impFile', path.join(FIXTURES, 'cstimer.txt'));
  await expect(page.locator('#impPlan')).toContainText('Se añadirán 4 tiempos en 2 sesiones');
  await expect(page.locator('#impPlan')).toContainText('(FTO)');
  await page.click('#impGo');
  expect(await page.evaluate(() => solves.length)).toBe(4);
  expect(await page.evaluate(() => sessions['3x3'].list.some(s => s.name === 'main'))).toBe(true);

  await page.click('#dataBtn');
  await page.setInputFiles('#impFile', path.join(FIXTURES, 'cstimer.txt'));
  await expect(page.locator('#impPlan')).toContainText('No hay tiempos nuevos');
  await page.setInputFiles('#impFile', path.join(FIXTURES, 'twisty.csv'));
  await expect(page.locator('#impPlan')).toContainText('Twisty Timer');
  await page.click('#impGo');
  expect(await page.evaluate(() => solves.some(s => s.category === 'pyraminx' && s.time === 5))).toBe(true);
  await page.keyboard.press('Control+KeyZ');
  expect(await page.evaluate(() => solves.some(s => s.category === 'pyraminx'))).toBe(false);
});

test('archivo no reconocido', async ({ app: page }, info) => {
  const bad = info.outputPath('basura.txt');
  fs.writeFileSync(bad, 'esto no es un export');
  await page.click('#dataBtn');
  await page.setInputFiles('#impFile', bad);
  await expect(page.locator('#impPlan')).toContainText('No reconozco');
});

test('aviso si el navegador no deja guardar (modo privado)', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError'); } }));
  await page.route(/cdn\.cubing\.net|fonts\./, r => r.abort());
  await page.goto('/');
  await expect(page.locator('#banner')).toBeVisible();
  await addTime(page, '10.00');
  await expect(page.locator('.time-item')).toHaveCount(1);
  await ctx.close();
});

test('aviso si el almacenamiento está lleno', async ({ app: page }) => {
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'ekitimer-solves') throw new DOMException('lleno', 'QuotaExceededError');
      return set.call(this, k, v);
    };
  });
  await addTime(page, '10.00');
  await expect(page.locator('#banner')).toContainText('No se ha podido guardar');
});

test('carga datos de la versión anterior', async ({ browser }) => {
  const v2 = [
    { id: 'a1', scramble: 'R U', category: '3x3', session: 's1', date: '2026-10-09T10:00:00.000Z', comment: '', time: 12.5, penalty: null },
    { id: 'a2', scramble: 'F', category: '3x3', session: 's1', date: '2026-10-09T10:01:00.000Z', comment: 'hola', time: 11, penalty: '+2', insp: 9.5 },
    { scramble: 'y', category: '2x2', date: '2026-10-08T10:02:00.000Z', time: 3.2 }
  ];
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(d => {
    if (!localStorage.getItem('ekitimer-solves')) localStorage.setItem('ekitimer-solves', JSON.stringify(d));
    localStorage.setItem('ekitimer-settings', JSON.stringify({ rs: false }));
  }, v2);
  await page.route(/cdn\.cubing\.net|fonts\./, r => r.abort());
  await page.goto('/');
  await expect(page.locator('.time-item')).toHaveCount(2);
  await expect(page.locator('#timesList')).toContainText('13.00+');
  await page.selectOption('#category', '2x2');
  await expect(page.locator('#timesList')).toContainText('3.20');
  await ctx.close();
});
