import { test, expect } from '@playwright/test';

const ty = (page, sel) => page.$eval(sel, (el) => new DOMMatrix(getComputedStyle(el).transform).m42);
const op = (page, sel, pseudo) => page.$eval(sel, (el, p) => Number(getComputedStyle(el, p).opacity), pseudo);

test('the dislikes panel darkens and the spider drops once', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  expect(await op(page, '.aid-panel--dark', '::before')).toBe(0);
  expect(await ty(page, '.spider')).toBeLessThan(-20);
  const y = await page.$eval('#aid', (el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await expect.poll(() => op(page, '.aid-panel--dark', '::before')).toBe(1);
  await expect.poll(() => ty(page, '.spider')).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  expect(await ty(page, '.spider')).toBe(0);
});

test('the finish tape breaks at the end', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  expect(await op(page, '.tape__l')).toBe(1);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => op(page, '.tape__l')).toBe(0);
  await expect.poll(() => op(page, '.tape__r')).toBe(0);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('dark panel, spider down, tape already gone', async ({ page }) => {
    await page.goto('/');
    expect(await op(page, '.aid-panel--dark', '::before')).toBe(1);
    expect(await ty(page, '.spider')).toBe(0);
    expect(await op(page, '.tape__l')).toBe(0);
  });
});
