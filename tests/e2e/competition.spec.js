const { test, expect, addTime, startRound } = require('./helpers');

test('ronda Ao5 con objetivo: tiempo necesario, resultado e historial', async ({ app: page }) => {
  await startRound(page, { target: '12' });
  await expect(page.locator('#category')).toBeDisabled();
  await expect(page.locator('#scrambleLabel')).toContainText(/intento 1\/5/i);
  for (const t of ['11.20', '9.87', '12.34', 'dnf']) await addTime(page, t);
  const panel = page.locator('.comp-panel');
  await expect(panel).toContainText('Necesitas 12.44 o menos');
  await expect(panel).toContainText('Mejor posible: 11.14');
  await expect(panel).toContainText('Peor posible: DNF');
  await addTime(page, '12.00');
  await expect(page.locator('#roundOverlay')).toHaveClass(/active/);
  await expect(page.locator('#rBig')).toHaveText('11.85');
  await expect(page.locator('#rTimes')).toContainText('(9.87)');
  await expect(page.locator('#rTimes')).toContainText('(DNF)');
  await expect(page.locator('#rNotes')).toContainText('conseguido');
  await expect(page.locator('#rDelete')).toBeHidden();
  await page.click('#rClose');
  await expect(page.locator('#category')).toBeEnabled();
  await page.click('.tab[data-tab=rounds]');
  await expect(page.locator('#roundsList')).toContainText('11.85');
  await page.click('.tab[data-tab=times]');
  await expect(page.locator('.time-item')).toHaveCount(5);
});

test('corte no superado y DNF corregido que hace fallar el corte', async ({ app: page }) => {
  await startRound(page, { cutoff: '10' });
  await addTime(page, '11.00');
  await addTime(page, '12.00');
  await expect(page.locator('#rBig')).toHaveText('Sin media');
  await expect(page.locator('#rNotes')).toContainText('corte');
  await page.click('#rClose');

  await startRound(page, { cutoff: '15' });
  await addTime(page, '16.00');
  await addTime(page, '14.00');
  await expect(page.locator('.comp-panel')).toContainText('Corte superado');
  await page.locator('.cp-slot.filled').nth(1).click();
  await page.click("#dPen button[data-pen='DNF']");
  await expect(page.locator('#roundOverlay')).toHaveClass(/active/);
  await expect(page.locator('#rNotes')).toContainText('corte');
});

test('límite de tiempo: el timer se para solo y cuenta DNF', async ({ app: page }) => {
  await startRound(page, { limit: '0:02' });
  await page.keyboard.down('Space'); await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space');
  await expect(page.locator('.cp-slot').first()).toContainText('DNF', { timeout: 5000 });
});

test('BLD (mejor de 3), 6×6 (media de 3 con corte) y FMC', async ({ app: page }) => {
  await page.selectOption('#category', '3x3bld');
  await startRound(page, { target: '1:00' });
  await addTime(page, 'dnf'); await addTime(page, '1:05.00'); await addTime(page, '58.00');
  await expect(page.locator('#rBig')).toHaveText('58.00');
  await page.click('#rClose');

  await page.selectOption('#category', '6x6');
  await startRound(page, { target: '2:00', cutoff: '2:10' });
  await addTime(page, '2:05'); await addTime(page, '1:55');
  await expect(page.locator('.comp-panel')).toContainText('Necesitas 1:59.98 o menos');
  await addTime(page, '2:01');
  await expect(page.locator('#rBig')).toHaveText('2:00.33');
  await page.click('#rClose');

  await page.selectOption('#category', '3x3fmc');
  await startRound(page, { target: '30' });
  await addTime(page, '28'); await addTime(page, '31');
  await expect(page.locator('.comp-panel')).toContainText('Necesitas 30 o menos');
  await addTime(page, '30');
  await expect(page.locator('#rBig')).toHaveText('29.67');
  await page.click('#rClose');

  await page.selectOption('#category', 'mbld');
  await expect(page.locator('#compBtn')).toBeDisabled();
});

test('la ronda sobrevive a una recarga y se puede deshacer un intento', async ({ app: page }) => {
  await startRound(page, { target: '12' });
  await addTime(page, '11.00'); await addTime(page, '12.00');
  await page.reload();
  await expect(page.locator('.cp-slot.filled')).toHaveCount(2);
  await expect(page.locator('#category')).toBeDisabled();
  await page.mouse.click(650, 300);
  await page.keyboard.press('Alt+KeyZ');
  await expect(page.locator('.cp-slot.filled')).toHaveCount(1);
  await page.keyboard.press('Control+KeyZ');
  await expect(page.locator('.cp-slot.filled')).toHaveCount(2);
  await page.click('#cpAbandon');
  await expect(page.locator('.comp-panel')).toHaveCount(0);
});

test('corregir una ronda terminada la recalcula; borrar y deshacer', async ({ app: page }) => {
  await startRound(page);
  for (const t of ['11.00', '12.00', '10.00', '10.50', '11.50']) await addTime(page, t);
  await expect(page.locator('#rBig')).toHaveText('11.00');
  await page.keyboard.press('Escape');
  await page.locator('.time-item').first().click();
  await page.click("#dPen button[data-pen='DNF']");
  await page.click('#dDone');
  await page.click('.tab[data-tab=rounds]');
  await expect(page.locator('.round-item').first()).toContainText('11.17');
  await page.locator('.round-item').first().click();
  await page.click('#rDelete');
  await expect(page.locator('.round-item')).toHaveCount(0);
  await page.keyboard.press('Control+KeyZ');
  await expect(page.locator('.round-item')).toHaveCount(1);
});

test('el formulario valida objetivo, corte y límite', async ({ app: page }) => {
  await page.click('#compBtn');
  await page.fill('#compTarget', 'abc');
  await page.click('#compStart');
  await expect(page.locator('#compTarget')).toHaveClass(/err/);
  await page.fill('#compTarget', '');
  await page.fill('#compCutoff', '20');
  await page.fill('#compLimit', '10');
  await page.click('#compStart');
  await expect(page.locator('#compOverlay')).toHaveClass(/active/);
  await page.click('#compTarget');
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => tState)).toBe('idle');
});
