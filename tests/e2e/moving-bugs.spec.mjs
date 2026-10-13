import { test, expect } from '@playwright/test';
import { ready, trigger, activate } from './helpers.mjs';

test('the beetle crawls, and stops once caught', async ({ page }, info) => {
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'beetle');
  await t.scrollIntoViewIfNeeded();
  await expect(t.locator('svg')).toHaveCount(1);
  const pos = () => t.evaluate((el) => el.style.transform);
  const a = await pos();
  await expect.poll(pos).not.toBe(a); // it moves on its own
  // Focus pauses the crawl, so pointer and touch users can land on it too.
  await t.focus();
  if (info.project.name === 'mobile') await t.tap(); else await t.click();
  await expect(t).toHaveAttribute('data-fixed', '1');
  // Once caught it walks to the bottom corner (clear of the list) and stays.
  await page.waitForTimeout(1400);
  const b = await pos();
  await page.waitForTimeout(600);
  expect(await pos()).toBe(b);
  const [box, zone] = await Promise.all([t.boundingBox(), page.locator('.likes__cols').boundingBox()]);
  expect(box.x + box.width).toBeGreaterThan(zone.x + zone.width - 4);
  expect(box.y + box.height).toBeGreaterThan(zone.y + zone.height - 4);
});

test('the beetle can be caught from the keyboard', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await activate(page, 'beetle', 'keyboard');
  await expect(trigger(page, 'beetle')).toHaveAttribute('data-fixed', '1');
});

test('Email me dodges the mouse three times, then can be caught', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'mouse only');
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'dodge');
  await t.scrollIntoViewIfNeeded();
  const start = await t.boundingBox();
  for (let i = 0; i < 3; i++) {
    const b = await t.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    await page.waitForTimeout(450);
  }
  const moved = await t.boundingBox();
  expect(Math.abs(moved.x - start.x) + Math.abs(moved.y - start.y)).toBeGreaterThan(40);
  await t.click();
  await expect(t).toHaveAttribute('data-fixed', '1');
  await expect(t).toHaveAttribute('href', 'mailto:dwqa.dan@gmail.com');
  await expect(page.locator('[data-bug-count]')).toHaveText('1');
});

test('on touch, the first tap makes it hop and the second fixes it', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch only');
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'dodge');
  await t.scrollIntoViewIfNeeded();
  await t.tap();
  await expect(t).not.toHaveAttribute('data-fixed', '1');
  await t.tap();
  await expect(t).toHaveAttribute('data-fixed', '1');
});

test('from the keyboard it never moves, and Enter fixes it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'dodge');
  await expect(t).toHaveAccessibleDescription(/^Bug: /);
  await t.focus();
  await page.keyboard.press('Enter');
  await expect(t).toHaveAttribute('data-fixed', '1');
  await expect(t).not.toHaveAttribute('aria-describedby', /.+/);
});

test('the email address is always a plain link too', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.contact__links a[href^="mailto:"]')).toHaveCount(1);
});
