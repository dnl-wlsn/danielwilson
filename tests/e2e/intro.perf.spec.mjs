import { test, expect } from '@playwright/test';

// Dan saw the intro "jump from one state to another" on a real laptop and phone.
// Cause: multi-second main-thread tasks during load starved the animation of
// frames. This measures the intro itself, from first paint to "dnl wlsn", on a
// 4x-throttled CPU with a cold cache.
test('the intro gets smooth frames on a slow CPU with a cold cache', async ({ page, context }) => {
  test.setTimeout(60_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    const T = (window.__intro = { frames: [], done: 0, boot: 0 });
    // Checked per frame: an observer added here would watch the pre-parse
    // document element, which the parser replaces.
    const tick = (t) => {
      T.frames.push(t);
      if (!T.boot && document.documentElement.dataset.start === 'playing') T.boot = t;
      if (document.documentElement.dataset.start === 'done') T.done = t;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__intro.done > 0, null, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__intro.boot), 'intro was never seen playing').toBeGreaterThan(0);
  const worstGap = await page.evaluate(() => {
    // From the first frame of the intro to "dnl wlsn". (Setup work before the
    // intro starts isn't visible: nothing is drawn until the intro plays.)
    const { frames, boot } = window.__intro;
    const f = frames.slice(frames.indexOf(boot));
    let worst = 0;
    for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
    return Math.round(worst);
  });
  console.log(`worst frame gap during intro: ${worstGap}ms`);
  expect(worstGap).toBeLessThan(50); // 17ms (every frame) once fixed; 5750ms before
});
