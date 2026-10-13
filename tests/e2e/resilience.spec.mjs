import { test, expect } from '@playwright/test';

const allVisible = (page) => page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
const nameShown = (page) => page.$$eval('.start__glyphs .g', (gs) => gs
  .filter((g) => getComputedStyle(g).display !== 'none' && getComputedStyle(g).visibility !== 'hidden' && Number(getComputedStyle(g).opacity) > 0.99)
  .map((g) => g.textContent).join(''));

for (const blocked of ['**/js/vendor/lenis.min.js', '**/js/route.js', '**/js/vendor/gsap.min.js']) {
  test(`if ${blocked.split('/').pop()} fails to load, the page still shows everything`, async ({ page }) => {
    test.setTimeout(20_000);
    await page.route(blocked, (r) => r.abort());
    await page.goto('/');
    await expect.poll(() => allVisible(page), { timeout: 10_000 }).toBe(0);
    await expect.poll(() => nameShown(page), { timeout: 10_000 }).toBe('dnl wlsn');
  });
}
