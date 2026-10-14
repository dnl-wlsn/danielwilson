import { test, expect } from '@playwright/test';

// Proxy for "Chrome performance trace on a throttled phone": 4x CPU throttle via
// CDP, then count requestAnimationFrame callbacks while wheel-scrolling the
// whole page (through both pins).
test('scrolling holds at least 55 fps on a throttled phone', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.boot === 'ok'
    && document.documentElement.dataset.running === 'ready'
    && document.documentElement.dataset.opening === 'done', null, { timeout: 15000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    const tick = (t) => { window.__frames.push(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  for (let i = 0; i < 100; i++) { // the page grew (headline wins, recent sites rail), so scroll further
    await page.mouse.wheel(0, 260);
    await page.waitForTimeout(80);
  }
  const fps = await page.evaluate(() => {
    const f = window.__frames;
    return (f.length - 1) / ((f.at(-1) - f[0]) / 1000);
  });
  // The measurement only means something if the page really scrolled through
  // both pinned scenes while frames were counted.
  const runEnd = await page.evaluate(() => ScrollTrigger.getAll().find((t) => t.pin?.classList.contains('run-stage')).start);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(runEnd);
  console.log(`average fps: ${fps.toFixed(1)} over ${await page.evaluate(() => Math.round(window.scrollY))}px`);
  expect(fps).toBeGreaterThanOrEqual(55);
});
