import { test, expect } from '@playwright/test';

test('home page serves with the right title and fonts load', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
  await expect(page).toHaveTitle('Daniel Wilson');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return ['900 1em Archivo', '400 1em Anton', '400 1em "IBM Plex Mono"'].map((f) => document.fonts.check(f));
  });
  expect(loaded).toEqual([true, true, true]);
});

test('vendor scripts are present', async ({ request }) => {
  for (const f of ['gsap.min.js', 'ScrollTrigger.min.js', 'lenis.min.js']) {
    expect((await request.get(`/js/vendor/${f}`)).status()).toBe(200);
  }
});
