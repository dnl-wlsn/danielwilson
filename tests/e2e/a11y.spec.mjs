import { test, expect } from '@playwright/test';

// WCAG contrast between two CSS colours, computed in the page.
const contrast = (page, a, b) => page.evaluate(([a, b]) => {
  const rgb = (c) => { const x = document.createElement('i'); x.style.color = c; document.body.append(x); const v = getComputedStyle(x).color.match(/[\d.]+/g).map(Number); x.remove(); return v; };
  const lum = ([r, g, bl]) => [r, g, bl].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}, [a, b]);

const paperOf = (page, sel) => page.$eval(sel, (el) => getComputedStyle(el.closest('.sheet')).getPropertyValue('--bg').trim());

test('body text passes AA on both papers', async ({ page }) => {
  await page.goto('/');
  // Text sits on its own background (a sticker, a button) or else on the sheet's paper.
  const pairs = await page.$$eval('main p:not(.visually-hidden), main li', (els) => els
    .filter((e) => e.getClientRects().length && !e.closest('[hidden]'))
    .map((e) => {
      let bg = null;
      for (let n = e; n && !n.classList.contains('sheet'); n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
      }
      return [getComputedStyle(e).color, bg ?? getComputedStyle(e.closest('.sheet')).getPropertyValue('--bg').trim(), e.textContent.trim().slice(0, 30)];
    }));
  for (const [fg, bg, what] of pairs) expect(await contrast(page, fg, bg), what).toBeGreaterThanOrEqual(4.5);
});

for (const sel of ['#testing .cv-download a', '#studio .btn', '#contact .contact__links a']) {
  test(`the focus ring is visible against the paper (${sel})`, async ({ page }) => {
    await page.goto('/');
    await page.locator(sel).first().focus();
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineColor);
    const bg = await paperOf(page, sel);
    expect(await contrast(page, ring, bg)).toBeGreaterThanOrEqual(3);
  });
}

test('buttons stay readable on hover on both papers', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'hover is a pointer state');
  await page.goto('/');
  for (const sel of ['#testing .btn', '#studio .btn']) {
    const btn = page.locator(sel).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.hover();
    await page.waitForTimeout(150);
    const [fg, bg] = await btn.evaluate((b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]);
    expect(await contrast(page, fg, bg), sel).toBeGreaterThanOrEqual(4.5);
  }
});
