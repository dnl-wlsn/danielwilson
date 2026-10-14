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

test('the email address is always a plain link too', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.contact__links a[href^="mailto:"]')).toHaveCount(1);
});

test('the email typo: Email me always works, the address is fixed by a click', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.contact__cta a')).not.toHaveAttribute('data-for', /.+/);
  const t = trigger(page, 'typo');
  await expect(t).toHaveText('dvnielwilson@gmial.com');
  await expect(t).toHaveAccessibleDescription(/^Bug: /);
  await t.scrollIntoViewIfNeeded();
  await t.click();
  await expect(t).toHaveAttribute('data-fixed', '1');
  await expect(t).toHaveText('dvnielwilson@gmail.com');
  await expect(t).toHaveAttribute('href', 'mailto:dvnielwilson@gmail.com');
});
