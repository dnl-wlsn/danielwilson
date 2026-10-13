import { test, expect } from '@playwright/test';

// WCAG relative-luminance contrast between two CSS colours, computed in the page.
const contrast = (page, a, b) => page.evaluate(([a, b]) => {
  const rgb = (c) => { const x = document.createElement('i'); x.style.color = c; document.body.append(x); const v = getComputedStyle(x).color.match(/[\d.]+/g).map(Number); x.remove(); return v; };
  const lum = ([r, g, bl]) => [r, g, bl].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}, [a, b]);

for (const scheme of ['light', 'dark']) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test('the keyboard focus ring has at least 3:1 contrast against the page', async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');
      const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineColor);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(await contrast(page, ring, bg)).toBeGreaterThanOrEqual(3);
    });

    test('button text stays readable on hover', async ({ page }, info) => {
      test.skip(info.project.name === 'mobile', 'hover is a pointer state');
      await page.goto('/');
      const btn = page.locator('.btn').first();
      await btn.scrollIntoViewIfNeeded();
      await btn.hover();
      await page.waitForTimeout(100);
      const [fg, bg] = await btn.evaluate((b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]);
      expect(await contrast(page, fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
}
