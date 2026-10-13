import { test, expect } from '@playwright/test';
import { ready } from './helpers.mjs';

test('every sheet after the first has an edge that feeds in with scroll', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.sheet-edge')).toHaveCount(5);
  const edge = page.locator('#studio .sheet-edge');
  const skew = () => edge.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).b);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#studio').offsetTop - window.innerHeight));
  await expect.poll(skew).not.toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#studio').offsetTop));
  await expect.poll(skew).toBe(0);
});

test('the company in the middle of the screen stretches, one at a time', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const org = page.locator('#testing .role__org').nth(3);
  await org.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2));
  await expect(org).toHaveClass(/is-wide/);
  expect(await page.locator('#testing .role__org.is-wide').count()).toBe(1);
});

test('stickers end up visible', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('.stickers').first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.$$eval('.stickers li', (l) => l.filter((x) => Number(getComputedStyle(x).opacity) < 1).length)).toBe(0);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('edges are flat and nothing stretches', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const t = await page.$eval('#studio .sheet-edge', (e) => getComputedStyle(e).transform);
    expect(t).toBe('none');
    expect(await page.locator('.is-wide').count()).toBe(0);
  });
});

test('stretching a company name never moves the page (no jitter)', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const org = page.locator('#testing .role__org').nth(5); // Cabot Credit Management, the longest
  await org.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const ys = [];
  for (let i = 0; i < 10; i++) { ys.push(await page.evaluate(() => Math.round(window.scrollY))); await page.waitForTimeout(120); }
  expect(new Set(ys.slice(3)).size, `scrollY over time: ${ys.join(', ')}`).toBe(1);
  const heights = await page.$$eval('#testing .role__org', (hs) => hs.map((h) => {
    const had = h.classList.contains('is-wide');
    h.style.transition = 'none';
    h.classList.remove('is-wide'); const narrow = h.offsetHeight;
    h.classList.add('is-wide'); const wide = h.offsetHeight;
    h.classList.toggle('is-wide', had); h.style.transition = '';
    return narrow === wide;
  }));
  expect(heights.every(Boolean)).toBe(true);
});

test('scroll effects stay in the right place when the page grows (opening a role)', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const d = page.locator('#testing details').first();
  await d.scrollIntoViewIfNeeded();
  await d.locator('summary').click();
  const off = async () => page.evaluate(() => {
    const org = document.querySelectorAll('#testing .role__org')[5];
    const st = ScrollTrigger.getAll().find((t) => t.trigger === org);
    const r = org.getBoundingClientRect();
    const want = r.top + window.scrollY + r.height / 2 - window.innerHeight * 0.6;
    return Math.abs(st.start - want);
  });
  await expect.poll(off).toBeLessThan(3);
});

test('the page settles: no endless re-measuring once loaded', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__refreshes = 0; ScrollTrigger.addEventListener('refresh', () => { window.__refreshes++; }); });
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => window.__refreshes)).toBe(0);
});
