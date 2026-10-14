// The bug hunt is opt-in: off by default, on after Play, off again after Stop.
import { test, expect } from '@playwright/test';
import { ready } from './helpers.mjs';

test.use({ storageState: { cookies: [], origins: [] } });

test('hunt is off by default: correct content, no bugs, a Play button', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-hunt', 'off');
  await expect(page.locator('[data-for]')).toHaveCount(0);
  await expect(page.locator('.bugbar')).toBeHidden();
  await expect(page.locator('.contact__cta a')).toHaveAttribute('href', 'mailto:dvnielwilson@gmail.com');
  await expect(page.locator('[data-hunt-on]')).toBeVisible();
});

test('Play turns the hunt on, Stop turns it off', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('[data-hunt-on]').click();
  await page.waitForLoadState('load');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-hunt', 'on');
  await expect(page.locator('.bugbar')).toBeVisible();
  await expect(page.locator('[data-for]')).toHaveCount(7);
  await expect(page.locator('[data-hunt-on]')).toBeHidden();
  await page.locator('[data-hunt-off]').click();
  await page.waitForLoadState('load');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-hunt', 'off');
  await expect(page.locator('[data-for]')).toHaveCount(0);
});

test('without the hunt the finish tape snaps when reached', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const tape = page.locator('.tape');
  await tape.scrollIntoViewIfNeeded();
  await expect(tape).toHaveClass(/is-broken/);
  await expect(page.locator('.reward-lock')).toBeHidden();
});

test('Play and Stop reload at the top, wherever you were', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => { const y = document.querySelector('#running').offsetTop; window.__dwLenis ? window.__dwLenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y); });
  await page.waitForTimeout(300);
  await page.locator('[data-hunt-on]').click();
  await page.waitForLoadState('load');
  await ready(page);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await page.evaluate(() => { const y = document.querySelector('#running').offsetTop; window.__dwLenis ? window.__dwLenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y); });
  await page.waitForTimeout(300);
  await page.locator('[data-hunt-off]').click();
  await page.waitForLoadState('load');
  await ready(page);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
});
