import { test, expect } from '@playwright/test';

test('the download link serves the PDF', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('.cv-download a').getAttribute('href');
  expect(href).toBe('/cv/daniel-wilson-cv-2026.pdf');
  const res = await request.get(href);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');
});
