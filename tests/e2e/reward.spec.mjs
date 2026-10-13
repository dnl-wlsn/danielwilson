import { test, expect } from '@playwright/test';
import { ready, seed, activate } from './helpers.mjs';

const ALL = ['letters', 'date', 'overflow', 'upside-down', 'unit', 'beetle', 'dodge'];
const watchMatter = (page) => {
  const seen = { matter: false };
  page.on('request', (r) => { if (r.url().includes('matter')) seen.matter = true; });
  return seen;
};

test('no reward, and no physics download, before all 7 are found', async ({ page }) => {
  const seen = watchMatter(page);
  await seed(page, ALL.slice(0, 6));
  await page.goto('/');
  await ready(page);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(page.locator('.reward')).toBeHidden();
  expect(seen.matter).toBe(false);
});

test('the last fix unlocks the playground, and the vowels drop out', async ({ page }) => {
  test.setTimeout(30_000);
  const seen = watchMatter(page);
  await seed(page, ALL.filter((x) => x !== 'unit'));
  await page.goto('/');
  await ready(page);
  await activate(page, 'unit', 'keyboard');
  await expect(page.locator('[data-bug-live]')).toContainText('all 7');
  await page.locator('[data-bug-hint]').click(); // now "See prize"
  await expect(page.locator('.reward')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reward), { timeout: 10_000 }).toMatch(/running|settled/);
  expect(seen.matter).toBe(true);
  await expect.poll(() => page.locator('.rl.v.is-gone').count(), { timeout: 10_000 }).toBe(5);
  await expect(page.locator('.rl:not(.is-gone)')).toHaveText(['D', 'N', 'L', 'W', 'L', 'S', 'N']);
});

test('a returning visitor with all 7 gets the reward without fixing anything', async ({ page }) => {
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.reward')).toBeAttached();
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reward), { timeout: 10_000 }).toMatch(/running|settled/);
});

test('Shake and Reset letters work from the keyboard', async ({ page }) => {
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reward), { timeout: 10_000 }).toBe('settled');
  await page.locator('[data-reward="shake"]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.reward)).toBe('running');
  await page.locator('[data-reward="reset"]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('.rl.is-gone').count()).toBe(0);
});

test('the playground never makes the page scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('the reward is a still, with no physics download', async ({ page }) => {
    const seen = watchMatter(page);
    await seed(page, ALL);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.reward')).toBeVisible();
    await expect(page.locator('.reward')).toHaveClass(/is-static/);
    expect(await page.evaluate(() => document.documentElement.dataset.reward)).toBe('static');
    expect(seen.matter).toBe(false);
  });
});
