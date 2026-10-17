const path = require('node:path');
const fs = require('node:fs');
const { test, expect, addTime } = require('./helpers');

const FX = path.join(__dirname, '..', 'fixtures', 'wca');
const FILES = {
  'persons/2099TEST01': 'person.json',
  'persons/2099TEST01/competitions': 'competitions.json',
  'persons/2099TEST01/results': 'results.json',
  'competitions/BilbaoOpen2025/scrambles': 'scrambles-BilbaoOpen2025.json',
  'competitions/BilbaoOpen2025/wcif/public': 'wcif-BilbaoOpen2025.json'
};
const json = (route, status, body, headers = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body });

/** Simula la API pública de la WCA con datos de ejemplo (estructura real de Bilbao Open 2025). */
async function mockWca(page, { busy = 0 } = {}) {
  let left = busy;
  await page.route(/worldcubeassociation\.org\/api\/v0\//, route => {
    const p = route.request().url().split('/api/v0/')[1];
    if (left > 0 && p.startsWith('persons/')) { left--; return json(route, 429, '{}', { 'retry-after': '1' }); }
    if (FILES[p]) return json(route, 200, fs.readFileSync(path.join(FX, FILES[p]), 'utf8'));
    if (p === 'competitions/ViejaOpen2012/scrambles') return json(route, 200, '[]');
    return json(route, 404, '{"error":"not found"}');
  });
}

async function openBilbao(page) {
  await page.click('#wcaBtn');
  await page.fill('#wcaIdInput', '2099test01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-person')).toContainText('Competidora de Prueba');
  await page.click('[data-comp=BilbaoOpen2025]');
  await expect(page.locator('.wr-round').first()).toBeVisible();
}

test('WCA ID: validación, no encontrado y lista de competiciones', async ({ app: page }) => {
  await mockWca(page);
  await page.click('#wcaBtn');
  await page.fill('#wcaIdInput', '2017GON');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-err')).toContainText('10 caracteres');
  await page.fill('#wcaIdInput', '2099ZZZZ01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-err')).toContainText('No hay ningún competidor');
  await page.fill('#wcaIdInput', '2099test01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-item')).toHaveCount(2);
  await expect(page.locator('.wca-item').first()).toContainText('Bilbao Open 2025');
  await page.fill('#wcaSearch', 'vieja');
  await expect(page.locator('.wca-item:visible')).toHaveCount(1);
  await page.click('[data-comp=ViejaOpen2012]');
  await expect(page.locator('#wcaBody')).toContainText('no tiene publicadas las mezclas');
  // Recuerda el WCA ID al volver a abrir
  await page.reload();
  await page.click('#wcaBtn');
  await expect(page.locator('.wca-person')).toContainText('2099TEST01');
});

test('competición: categorías, resultados oficiales, grupo probable y reglas', async ({ app: page }) => {
  await mockWca(page);
  await openBilbao(page);
  await expect(page.locator('.wca-chip.on')).toContainText('3×3×3');
  const r1 = page.locator('.wr-round').first();
  await expect(r1).toContainText('Primera ronda');
  await expect(r1).toContainText('media 13.58');
  await expect(r1).toContainText('(11.09) (15.63) 13.50 11.80 15.45');
  await expect(r1.locator('.wca-set.mine')).toHaveText(/A/);
  await expect(page.locator('.wr-round').nth(1).locator('.wca-set.mine')).toHaveText(/C/);
  await page.click('[data-ev="333mbf"]');
  await expect(page.locator('.wr-round').first()).toContainText('9/10 20:45');
  await page.click('[data-ev="444"]');
  await page.locator('.wr-round').first().locator('.wca-set').nth(1).click();
  await expect(page.locator('.wca-info')).toContainText('corte 1:15.00 en 2 intentos');
  await expect(page.locator('.wca-info')).toContainText('este fue tu grupo');
  await expect(page.locator('.wca-scr li')).toHaveCount(5);
  await page.check('#wcaExtras');
  await expect(page.locator('.wca-scr li')).toHaveCount(7);
});

test('práctica libre: mezclas oficiales en orden, navegación y resumen', async ({ app: page }) => {
  await mockWca(page);
  await openBilbao(page);
  await page.locator('.wr-round').first().locator('.wca-set').first().click();
  const first = (await page.locator('.wca-scr li .scr').first().textContent()).trim();
  await page.click('#wcaFree');
  await expect(page.locator('#scrSrc')).toContainText('oficial');
  await expect(page.locator('#scrambleText')).toHaveText(first);
  await expect(page.locator('#wcaBar')).toContainText('mezcla 1 de 5');
  await page.click('#wbNext');
  await expect(page.locator('#wcaBar')).toContainText('mezcla 2 de 5');
  await page.click('#wbPrev');
  for (const t of ['10.11', '11.22', '12.33', '13.44', '14.55']) await addTime(page, t);
  await expect(page.locator('#wcaOverlay')).toHaveClass(/active/);
  await expect(page.locator('#wcaBody')).toContainText('Tu Ao5 con estas mezclas: 12.33');
  await expect(page.locator('#wcaBody')).toContainText('1.25 mejor que tu 13.58 oficial');
  await page.locator('.time-item').first().evaluate(() => {}); // la lista sigue viva detrás
  await page.click('#wcaSumExit');
  await expect(page.locator('#scrSrc')).not.toContainText('oficial');
  // El tiempo guarda de qué mezcla oficial es
  await page.locator('.time-item').nth(4).click();
  await expect(page.locator('#dMeta')).toContainText('Mezcla oficial: Bilbao Open 2025 · Primera ronda · Grupo A · nº 1');
});

test('repetir la ronda: objetivo = resultado oficial, corte oficial y comparación', async ({ app: page }) => {
  await mockWca(page);
  await openBilbao(page);
  await page.click('[data-ev="444"]');
  await page.locator('.wr-round').first().locator('.wca-set').nth(1).click();
  await page.click('#wcaRepeat');
  await expect(page.locator('#category')).toHaveValue('4x4');
  await expect(page.locator('.comp-panel')).toContainText('mejorar tu 50.62 oficial');
  await expect(page.locator('.comp-panel')).toContainText('Corte: baja de 1:15.00 en los 2 primeros intentos');
  await expect(page.locator('.comp-panel')).toContainText('Límite: 10:00.00');
  for (const t of ['48.00', '49.00', '50.00', '45.00', '47.00']) await addTime(page, t);
  await expect(page.locator('#rBig')).toHaveText('48.00');
  await expect(page.locator('#rNotes')).toContainText('Has mejorado tu 50.62 oficial en 2.62');
  await expect(page.locator('#rAgain')).toHaveText('Repetir otra vez');
  await page.click('#rAgain');
  await expect(page.locator('.comp-panel')).toContainText('Repetición');
  await page.click('#cpAbandon');
  await page.click('.tab[data-tab=rounds]');
  await expect(page.locator('#roundsList')).toContainText('Bilbao Open 2025 · Primera ronda · Grupo B');
});

test('repetir la ronda con corte oficial no superado', async ({ app: page }) => {
  await mockWca(page);
  await openBilbao(page);
  await page.click('[data-ev="444"]');
  await page.locator('.wr-round').first().locator('.wca-set').first().click();
  await page.click('#wcaRepeat');
  await addTime(page, '1:20.00');
  await addTime(page, '1:16.00');
  await expect(page.locator('#rBig')).toHaveText('Sin media');
  await expect(page.locator('#rNotes')).toContainText('corte');
});

test('la WCA limita peticiones: reintenta solo y avisa si sigue ocupada', async ({ app: page }) => {
  await mockWca(page, { busy: 3 });
  await page.click('#wcaBtn');
  await page.fill('#wcaIdInput', '2099TEST01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-person')).toContainText('Competidora de Prueba', { timeout: 15000 });
});

test('la WCA sigue ocupada: mensaje claro', async ({ app: page }) => {
  await mockWca(page, { busy: 99 });
  await page.click('#wcaBtn');
  await page.fill('#wcaIdInput', '2099TEST01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-err')).toContainText('demasiadas peticiones', { timeout: 15000 });
});

test('sin conexión con la WCA', async ({ app: page }) => {
  await page.route(/worldcubeassociation\.org/, r => r.abort());
  await page.click('#wcaBtn');
  await page.fill('#wcaIdInput', '2099TEST01');
  await page.press('#wcaIdInput', 'Enter');
  await expect(page.locator('.wca-err')).toContainText('No se ha podido conectar');
});
