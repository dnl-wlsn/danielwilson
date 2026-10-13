import { test, expect } from '@playwright/test';
import { ready } from './helpers.mjs';

const shown = (page) => page.$$eval('.name .g', (gs) => gs
  .filter((g) => getComputedStyle(g).visibility !== 'hidden' && Number(getComputedStyle(g).opacity) > 0.99)
  .map((g) => g.textContent).join(''));

test('the name drops in and ends as Daneil Wilson, bug showing', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.opening), { timeout: 15_000 }).toBe('playing');
  await ready(page);
  expect(await shown(page)).toBe('DaneilWilson');
  await expect(page.locator('.bugbar')).toHaveClass(/is-in/);
});

test('the name is hidden only while the opening plays', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const v = await page.$eval('.name', (n) => getComputedStyle(n).visibility);
  expect(v).toBe('visible');
});

test('headings get a second ink that settles almost in register', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const h = page.locator('#testing h2.ink');
  await expect(h).toHaveAttribute('data-text', 'Seventeen years of breaking things');
  const mis = () => h.evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--mis')));
  // Below the fold it is well out of register; with its top 30% down the screen it has settled.
  await h.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 1.02));
  await expect.poll(mis).toBeGreaterThan(4);
  await h.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3));
  await expect.poll(mis).toBeLessThan(1.2);
});

test('the second ink is not read out', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#testing h2.ink')).toHaveAccessibleName('Seventeen years of breaking things');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the name is there at once, with the bug showing', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    expect(await shown(page)).toBe('DaneilWilson');
  });
});
