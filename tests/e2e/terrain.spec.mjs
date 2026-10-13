import { test, expect } from '@playwright/test';

test('terrain density rises to the book and peaks at running', async ({ page }) => {
  await page.goto('/');
  const terrain = await page.$$eval('main > section', (s) => Object.fromEntries(s.map((x) => [x.id, x.dataset.terrain])));
  expect(terrain).toEqual({ start: '1', about: '1', career: '2', book: '3', studio: '2', running: '3', aid: '2', finish: '2' });
  const bg = await page.$eval('#running', (el) => getComputedStyle(el, '::before').backgroundImage);
  expect(bg).toMatch(/contours-3-(light|dark)-v2\.svg/);
});

test('contour tiles are served', async ({ request }) => {
  for (const d of [1, 2, 3]) for (const m of ['light', 'dark']) {
    expect((await request.get(`/img/contours-${d}-${m}-v2.svg`)).status()).toBe(200);
  }
});
