import { test, expect } from '@playwright/test';
import { ready, trigger, seed } from './helpers.mjs';

const ALL = ['letters', 'date', 'route', 'upside-down', 'unit', 'beetle', 'typo'];

test('Reset letters never stacks physics loops', async ({ page }) => {
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.Matter && /running|settled/.test(document.documentElement.dataset.reward));
  for (let i = 0; i < 4; i++) await page.locator('[data-reward="reset"]').click();
  const perFrame = await page.evaluate(() => new Promise((ok) => {
    let updates = 0, frames = 0;
    const orig = Matter.Engine.update;
    Matter.Engine.update = function (...a) { updates++; return orig.apply(this, a); };
    const tick = () => { frames++; if (frames < 40) requestAnimationFrame(tick); else { Matter.Engine.update = orig; ok(updates / frames); } };
    requestAnimationFrame(tick);
  }));
  expect(perFrame).toBeLessThanOrEqual(1.1);
});

test('the letters stay in the playground after a resize', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'desktop resize');
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.reward === 'settled', null, { timeout: 15_000 });
  await page.setViewportSize({ width: 600, height: 800 });
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => {
    const s = document.querySelector('.reward__stage').getBoundingClientRect();
    return [...document.querySelectorAll('.rl:not(.is-gone)')].filter((l) => {
      const r = l.getBoundingClientRect();
      return r.left < s.left - 2 || r.right > s.right + 2;
    }).length;
  }), { timeout: 10_000 }).toBe(0);
});

test('a click while the email typo is being fixed does not open email', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'typo');
  await t.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('[data-for="typo"]')) window.__dp = e.defaultPrevented; }));
  await t.focus();
  await page.keyboard.press('Enter');
  await t.dispatchEvent('click');
  expect(await page.evaluate(() => window.__dp)).toBe(true);
});

test('the Cabot heading is named just "Cabot Credit Management"', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('#testing .role__org').nth(5)).toHaveAccessibleName('Cabot Credit Management');
});

test('the skip link shows a focus ring and lands on the page start', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const skip = page.locator('.skip');
  await skip.focus();
  expect(await skip.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none');
  const target = (await skip.getAttribute('href')).slice(1);
  expect(await page.locator(`#${target}`).count()).toBe(1);
  expect(target).toBe('start');
});

test('the bug bar cannot be used until the opening has played', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.opening), { timeout: 15_000 }).toBe('playing');
  await expect(page.locator('.bugbar')).toHaveAttribute('inert', '');
  await ready(page);
  await expect(page.locator('.bugbar')).not.toHaveAttribute('inert', '');
});

test('if a later module throws, smooth scrolling is switched off too', async ({ page }) => {
  await page.route('**/js/scenes.js', (r) => r.fulfill({ contentType: 'application/javascript', body: 'export function initScenes() { throw new Error("boom"); }' }));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('motion')), { timeout: 10_000 }).toBe(false);
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
  await expect(page.locator('h1')).toHaveAccessibleName('Daniel Wilson');
});
