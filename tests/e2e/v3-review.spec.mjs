import { test, expect } from '@playwright/test';
import { ready, trigger, seed, activate } from './helpers.mjs';

const overlaps = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

test('the glitch stamp never covers the Oakam copy', async ({ page }) => {
  await seed(page, ['route']);
  await page.goto('/');
  await ready(page);
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  const hits = await page.evaluate(() => {
    const s = document.querySelector('.bug--glitch .stamp').getBoundingClientRect();
    const li = document.querySelector('.bug--glitch').closest('li');
    return [...li.querySelectorAll('p, h3, summary')].map((e) => e.getBoundingClientRect())
      .filter((r) => !(r.right <= s.left || s.right <= r.left || r.bottom <= s.top || s.bottom <= r.top)).length;
  });
  expect(hits).toBe(0);
});

test('marker checkpoints are solid pink on black paper', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const fills = await page.$$eval('.route__cp--marker', (cs) => cs.map((c) => getComputedStyle(c).fill));
  expect(fills.length).toBe(3); // the three certificates
  for (const f of fills) expect(f).toBe('rgb(255, 79, 154)');
});

test('focus reveals content with no stagger delay', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('.role--book a').focus();
  const delay = await page.$eval('.role--book a', (a) => getComputedStyle(a.closest('[data-reveal]')).transitionDelay);
  expect(delay.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('if the motion code fails, the route falls back to fully drawn', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  await page.evaluate(() => window.__dwStatic());
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect.poll(() => page.$eval('.route__line', (p) => parseFloat(p.style.strokeDashoffset))).toBe(0);
});

test('desktop: contours are masked clear behind the whole reading column', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'desktop only');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await ready(page);
  // The mask's first fully clear stop must sit at or left of the text's left edge.
  const r = await page.evaluate(() => {
    const s = document.querySelector('#testing');
    const m = getComputedStyle(s, '::before').maskImage;
    const half = s.clientWidth / 2;
    const a = m.match(/rgba\(0, 0, 0, 0\) calc\(50% - ([\d.]+)px\)/);
    const b = m.match(/rgba\(0, 0, 0, 0\) max\(([\d.]+)px, 50% - ([\d.]+)px\)/);
    const clearAt = a ? half - +a[1] : Math.max(+b[1], half - +b[2]);
    return { clearAt, text: s.querySelector('.lede').getBoundingClientRect().left };
  });
  expect(r.clearAt).toBeLessThanOrEqual(r.text);
});
