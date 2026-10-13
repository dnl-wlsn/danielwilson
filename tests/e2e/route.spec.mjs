import { test, expect } from '@playwright/test';

const ready = (page) => page.waitForFunction(() => document.documentElement.dataset.route === 'ready');

// Largest distance from any checkpoint dot centre to the drawn path. A scale(0)
// dot keeps its centre, so unrevealed dots are measured too.
const worstDotMiss = (page) => page.evaluate(() => {
  const main = document.querySelector('.trail');
  const box = main.getBoundingClientRect();
  const path = document.querySelector('.route__line');
  const total = path.getTotalLength();
  const samples = [];
  for (let l = 0; l <= total; l += 2) samples.push(path.getPointAtLength(l));
  let worst = 0;
  for (const d of document.querySelectorAll('[data-cp]')) {
    const r = d.getBoundingClientRect();
    const x = r.left + r.width / 2 - box.left, y = r.top + r.height / 2 - box.top;
    worst = Math.max(worst, Math.min(...samples.map((p) => Math.hypot(p.x - x, p.y - y))));
  }
  return worst;
});

const reachedIds = (page) => page.$$eval('main > section.is-reached', (s) => s.map((x) => x.id));

test('the line passes through every checkpoint', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  expect(await worstDotMiss(page)).toBeLessThan(3);
});

test('scrolling draws the line and reveals checkpoints in order', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  expect(await reachedIds(page)).toEqual([]);
  const y = await page.$eval('#career', (el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await expect.poll(() => reachedIds(page)).toEqual(['about', 'career']);
  await expect(page.locator('#about h2')).toHaveCSS('opacity', '1');
  const offset = await page.$eval('.route__line', (p) => parseFloat(p.style.strokeDashoffset));
  expect(offset).toBeGreaterThan(0);
});

test('the bottom of the page reaches the finish', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('#finish')).toHaveClass(/is-reached/);
  await expect(page.locator('.finish-links')).toHaveCSS('opacity', '1');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('everything visible, line fully drawn, nothing pinned', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    expect((await reachedIds(page)).length).toBe(7);
    expect(await page.$eval('.route__line', (p) => parseFloat(p.style.strokeDashoffset))).toBe(0);
    expect(await page.locator('.pin-spacer').count()).toBe(0);
    const faded = await page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
    expect(faded).toBe(0);
  });
});

test('route stays inside a 375px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await ready(page);
  const b = await page.$eval('.route__line', (p) => { const r = p.getBBox(); return { l: r.x, r: r.x + r.width }; });
  expect(b.l).toBeGreaterThanOrEqual(0);
  expect(b.r).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('on phones the line never cuts across the reading column', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await ready(page);
  // Every crossing from the landing point to the rail happens above the about text.
  const bad = await page.evaluate(() => {
    const main = document.querySelector('.trail').getBoundingClientRect();
    const path = document.querySelector('.route__line');
    const firstText = document.querySelector('#about [data-reveal]').getBoundingClientRect().top - main.top;
    const colLeft = document.querySelector('#about h2').getBoundingClientRect().left - main.left;
    const total = path.getTotalLength();
    const out = [];
    for (let l = 0; l <= total; l += 4) {
      const p = path.getPointAtLength(l);
      if (p.y > firstText - 4 && p.x > colLeft) out.push(Math.round(p.y));
    }
    return out.length;
  });
  expect(bad).toBe(0);
});

// Review Focus 1
test('rotating or resizing mid-scroll rebuilds the route and keeps reveals', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await ready(page);
  const y = await page.$eval('#book', (el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await expect.poll(() => reachedIds(page)).toContain('book');
  const before = await reachedIds(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(600);
  await ready(page);
  const after = await reachedIds(page);
  for (const id of before) expect(after).toContain(id);
  expect(await worstDotMiss(page)).toBeLessThan(3);
  const b = await page.$eval('.route__line', (p) => p.getBBox().x + p.getBBox().width);
  expect(b).toBeLessThanOrEqual(375);
});

// Review Focus 2
test('a deep link to #finish shows the contacts', async ({ page }) => {
  await page.goto('/#finish');
  await ready(page);
  await expect(page.locator('#finish')).toHaveClass(/is-reached/);
  await expect(page.locator('.finish-links')).toHaveCSS('opacity', '1');
});

// Review Focus 3
test('with webfonts blocked the line still meets every dot', async ({ page }) => {
  await page.route('**/*.woff2', (r) => r.abort());
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(300);
  expect(await worstDotMiss(page)).toBeLessThan(3);
});

test('after fonts load the line still meets every dot', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  expect(await worstDotMiss(page)).toBeLessThan(3);
});

// Review Focus 4
test('tabbing ahead of the route never focuses something invisible', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'keyboard test is desktop only');
  await page.goto('/');
  await ready(page);
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const href = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    if (href === 'https://www.amazon.co.uk/dp/B0G3QK8Q3G') break;
  }
  await expect(page.locator('a[href="https://www.amazon.co.uk/dp/B0G3QK8Q3G"]')).toBeFocused();
  await expect(page.locator('#book')).toHaveClass(/is-reached/);
  await expect(page.locator('[data-book-cta]')).toHaveCSS('opacity', '1');
});

// Review Focus 5
test('opening a career detail moves the dots below and the line follows', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('#career details summary').first().click();
  await page.waitForTimeout(500);
  await ready(page);
  expect(await worstDotMiss(page)).toBeLessThan(3);
});

test('print shows everything', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.emulateMedia({ media: 'print' });
  const faded = await page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
  expect(faded).toBe(0);
});
