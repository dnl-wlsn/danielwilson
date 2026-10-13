import { test, expect } from '@playwright/test';

// Measures the opening itself on a 4x-throttled CPU with a cold cache. v1's
// intro once stalled for 5.75 s from setup work stealing frames.
test('the opening gets smooth frames on a slow CPU with a cold cache', async ({ page, context }) => {
  test.setTimeout(60_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    const T = (window.__intro = { frames: [], done: 0, boot: 0 });
    const tick = (t) => {
      T.frames.push(t);
      if (!T.boot && document.documentElement.dataset.opening === 'playing') T.boot = t;
      if (document.documentElement.dataset.opening === 'done') T.done = t;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__intro.done > 0, null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__intro.boot), 'opening was never seen playing').toBeGreaterThan(0);
  const worstGap = await page.evaluate(() => {
    const { frames, boot } = window.__intro;
    const f = frames.slice(frames.indexOf(boot));
    let worst = 0;
    for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
    return Math.round(worst);
  });
  console.log(`worst frame gap during the opening: ${worstGap}ms`);
  expect(worstGap).toBeLessThan(50);
});
