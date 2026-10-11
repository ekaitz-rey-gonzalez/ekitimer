const path = require('node:path');
const fs = require('node:fs');
const { test: base, expect } = require('@playwright/test');

const XLSX_LIB = path.join(__dirname, '..', '..', 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

/** Página limpia con scrambles locales (rápidos y sin red) y la librería de Excel servida en local. */
const test = base.extend({
  app: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('ekitimer-settings')) localStorage.setItem('ekitimer-settings', JSON.stringify({ rs: false }));
    });
    await page.route(/cdn\.cubing\.net/, r => r.abort());
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    if (fs.existsSync(XLSX_LIB)) await page.route(/xlsx\.full\.min\.js/, r => r.fulfill({ path: XLSX_LIB, contentType: 'text/javascript' }));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.promptAnswer = null;
    page.on('dialog', d => (d.type() === 'prompt' ? d.accept(page.promptAnswer ?? undefined) : d.accept()));
    await page.goto('/');
    await expect(page.locator('#scrambleText')).not.toHaveText(/Cargando|Generando/);
    await use(page);
    expect(errors, 'errores de JavaScript en la página').toEqual([]);
  }
});

async function addTime(page, value) {
  await page.fill('#manualInput', value);
  await page.press('#manualInput', 'Enter');
}

async function startRound(page, { target = '', cutoff = '', limit = '' } = {}) {
  await page.click('#compBtn');
  await expect(page.locator('#compOverlay')).toHaveClass(/active/);
  await page.fill('#compTarget', target);
  if (await page.isVisible('#compCutoff')) await page.fill('#compCutoff', cutoff);
  if (await page.isVisible('#compLimit')) await page.fill('#compLimit', limit);
  await page.click('#compStart');
  await expect(page.locator('.comp-panel')).toBeVisible();
}

module.exports = { test, expect, addTime, startRound, FIXTURES };
