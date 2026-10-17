const { test, expect, addTime, startRound } = require('./helpers');

test('móvil: ronda visible sin desplazar, sin scroll horizontal y toque para inspeccionar', async ({ app: page }) => {
  await startRound(page, { target: '12' });
  for (const t of ['11.20', '10.50', '12.10', '11.80']) await addTime(page, t);
  await page.evaluate(() => (document.querySelector('main').scrollTop = 0));
  const fits = await page.evaluate(() => {
    const p = document.querySelector('.comp-panel').getBoundingClientRect();
    return p.bottom <= document.querySelector('main').getBoundingClientRect().bottom + 4;
  });
  expect(fits).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  await addTime(page, '11.00');
  await expect(page.locator('#rDelete')).toBeHidden();
  await page.click('#rClose');
  const box = await page.locator('#timer').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => tState)).toBe('inspecting');
});

test('móvil: botón WCA y ventana de competiciones sin desbordar', async ({ app: page }) => {
  await page.route(/worldcubeassociation\.org\/api\/v0\//, r => r.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await expect(page.locator('#wcaBtn')).toBeVisible();
  await page.click('#wcaBtn');
  await expect(page.locator('#wcaIdInput')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
});
