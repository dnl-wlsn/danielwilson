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

test('stickers end up visible', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('.stickers').first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.$$eval('.stickers li', (l) => l.filter((x) => Number(getComputedStyle(x).opacity) < 1).length)).toBe(0);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('edges are flat', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const t = await page.$eval('#studio .sheet-edge', (e) => getComputedStyle(e).transform);
    expect(t).toBe('none');
  });
});

test('the route follows the page when it grows (opening a role)', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const d = page.locator('#testing details').first();
  await d.scrollIntoViewIfNeeded();
  await d.locator('summary').click();
  // The last checkpoint's dot still sits on its anchor.
  const off = async () => page.evaluate(() => {
    const main = document.querySelector('.trail').getBoundingClientRect();
    const a = [...document.querySelectorAll('[data-cp]')].at(-1).getBoundingClientRect();
    const dot = [...document.querySelectorAll('.route__cp')].at(-1);
    return Math.abs(Number(dot.getAttribute('cy')) - (a.top - main.top));
  });
  await expect.poll(off).toBeLessThan(2);
});

test('the page settles: no endless re-measuring once loaded', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__refreshes = 0; ScrollTrigger.addEventListener('refresh', () => { window.__refreshes++; }); });
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => window.__refreshes)).toBe(0);
});
