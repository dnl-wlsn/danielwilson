import { test, expect } from '@playwright/test';

const allVisible = (page) => page.$$eval('main h1, main h2, main h3, main p, main li', (els) => els
  .filter((e) => !e.closest('[hidden], details:not([open])') && !e.classList.contains('visually-hidden'))
  .filter((e) => { const cs = getComputedStyle(e); return cs.visibility === 'hidden' || Number(cs.opacity) < 1 || !e.getClientRects().length; }).length);

for (const blocked of ['**/js/vendor/gsap.min.js', '**/js/vendor/lenis.min.js', '**/js/opening.js', '**/js/bugs.js']) {
  test(`if ${blocked.split('/').pop()} fails to load, the page still shows everything, correctly`, async ({ page }) => {
    test.setTimeout(20_000);
    await page.route(blocked, (r) => r.abort());
    await page.goto('/');
    await expect.poll(() => allVisible(page), { timeout: 10_000 }).toBe(0);
    await expect(page.locator('h1')).toHaveAccessibleName('Daniel Wilson');
    // No half-broken game: either no bugs at all, or a working counter.
    const bugs = await page.locator('.bug').count();
    if (bugs === 0) await expect(page.locator('.name__pair')).toHaveText('ie');
    else await expect(page.locator('.bugbar')).toBeVisible();
  });
}
