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
