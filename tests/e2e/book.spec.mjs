import { test, expect } from '@playwright/test';

// Yaw in degrees from the computed matrix. The resting value is computed the
// same way in the browser (DOMMatrix doesn't exist in Node), so the tests don't
// depend on matrix sign conventions.
const rotY = (page) => page.$eval('.book', (b) => {
  const m = new DOMMatrix(getComputedStyle(b).transform);
  return (Math.atan2(-m.m13, m.m11) * 180) / Math.PI;
});
const restYaw = (page) => page.evaluate(() => {
  const m = new DOMMatrix('rotateY(-18deg) rotateX(6deg)');
  return (Math.atan2(-m.m13, m.m11) * 180) / Math.PI;
});

test('cover image loads', async ({ request }) => {
  const res = await request.get('/img/book-cover-v1.jpg');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/jpeg');
});

test('book starts spine-on and turns to rest as you scroll through', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  expect(Math.abs(await rotY(page))).toBeGreaterThan(80);
  const end = await page.evaluate(() => ScrollTrigger.getAll().find((t) => t.pin?.classList.contains('book-stage')).end);
  await page.evaluate((y) => window.scrollTo(0, y + 10), end);
  const REST = await restYaw(page);
  await expect.poll(async () => Math.abs((await rotY(page)) - REST)).toBeLessThan(1);
  await expect(page.locator('[data-book-cta]')).toHaveCSS('opacity', '1');
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('book sits at its resting angle with no pin', async ({ page }) => {
    await page.goto('/');
    expect(Math.abs((await rotY(page)) - (await restYaw(page)))).toBeLessThan(1);
    expect(await page.locator('.book-stage').evaluate((el) => el.parentElement.classList.contains('pin-spacer'))).toBe(false);
  });
});
