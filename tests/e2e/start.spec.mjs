import { test, expect } from '@playwright/test';

const visibleName = (page) => page.$$eval('.start__glyphs .g', (gs) => gs
  .filter((g) => getComputedStyle(g).display !== 'none' && Number(getComputedStyle(g).opacity) > 0.01)
  .map((g) => g.textContent).join(''));

test('start line drops the vowels and settles as "dnl wlsn"', async ({ page }) => {
  // Read the name at DOMContentLoaded, before any animation can have run, so a
  // slow page load under a busy test run can't make this flaky.
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    window.__initialName = [...document.querySelectorAll('.start__glyphs .g')]
      .filter((g) => getComputedStyle(g).display !== 'none').map((g) => g.textContent).join('');
  }));
  await page.goto('/');
  expect(await page.evaluate(() => window.__initialName)).toBe('daniel wilson');
  await page.waitForFunction(() => document.documentElement.dataset.start === 'done', null, { timeout: 8000 });
  expect(await visibleName(page)).toBe('dnl wlsn');
  const wdth = await page.$eval('.start__glyphs', (el) => getComputedStyle(el).getPropertyValue('--wdth').trim());
  expect(Number(wdth)).toBe(125);
  await expect(page.locator('.start__landing')).toHaveClass(/is-lit/);
});

test('screen readers get the real name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Daniel Wilson');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('shows the finished name immediately', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.classList.contains('motion'))).toBe(false);
    expect(await visibleName(page)).toBe('dnl wlsn');
    await page.waitForFunction(() => document.documentElement.dataset.start === 'done');
  });
});

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('shows the finished name', async ({ page }) => {
    await page.goto('/');
    expect(await visibleName(page)).toBe('dnl wlsn');
  });
});

for (const [w, h] of [[1280, 800], [1440, 900], [900, 700], [375, 812], [320, 640]]) {
  test(`the full name fits the screen at ${w}px before the vowels drop`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    // Measure a still clone of the full name in the same grid slot, so the
    // running animation can't affect the reading.
    const right = await page.evaluate(() => {
      const h1 = document.querySelector('.start__name');
      const clone = h1.cloneNode(true);
      clone.classList.remove('is-done');
      clone.style.visibility = 'hidden';
      const g = clone.querySelector('.start__glyphs');
      g.style.setProperty('--wdth', '100');
      g.style.visibility = 'hidden';
      g.querySelectorAll('.g').forEach((x) => { x.classList.remove('is-loose'); x.removeAttribute('style'); });
      h1.after(clone);
      const r = g.getBoundingClientRect().right;
      clone.remove();
      return r;
    });
    expect(right).toBeLessThanOrEqual(w - 16);
  });
}

test('a slow font delays the intro rather than swapping letters mid-animation', async ({ page }) => {
  await page.route('**/fonts/archivo-var-v1.woff2', async (r) => { await new Promise((ok) => setTimeout(ok, 1000)); await r.continue(); });
  await page.addInitScript(() => {
    window.__m = {};
    const tick = (t) => {
      if (document.documentElement.dataset.start === 'playing' && !window.__m.play) window.__m.play = t;
      if (!window.__m.font && [...document.fonts].some((f) => f.family.includes('Archivo') && f.status === 'loaded')) window.__m.font = t;
      if (!window.__m.play) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__m.play > 0, null, { timeout: 10_000 });
  const m = await page.evaluate(() => window.__m);
  expect(m.font, 'font had loaded before the intro played').toBeGreaterThan(0);
  expect(m.play).toBeGreaterThanOrEqual(m.font);
});
