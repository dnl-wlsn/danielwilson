import { test, expect } from '@playwright/test';

test('the playground holds 55 fps on a throttled phone while the letters fall', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('dw-bugs-v1', JSON.stringify(['letters', 'date', 'route', 'upside-down', 'unit', 'beetle', 'dodge'])));
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.opening === 'done', null, { timeout: 15_000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => { window.__frames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.reward === 'running', null, { timeout: 15_000 });
  const from = await page.evaluate(() => window.__frames.length);
  await page.waitForTimeout(3000);
  const fps = await page.evaluate((from) => {
    const f = window.__frames.slice(from);
    return (f.length - 1) / ((f.at(-1) - f[0]) / 1000);
  }, from);
  console.log(`reward fps: ${fps.toFixed(1)}`);
  expect(fps).toBeGreaterThanOrEqual(55);
});
