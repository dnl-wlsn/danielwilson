import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');

test('sections appear in route order', async ({ page }) => {
  await page.goto('/');
  const ids = await page.$$eval('main.trail > section[data-section]', (s) => s.map((x) => x.id));
  expect(ids).toEqual(['start', 'about', 'career', 'book', 'studio', 'running', 'aid', 'finish']);
});

test('career runs 2009 to Simply Business in order with markers', async ({ page }) => {
  await page.goto('/');
  const orgs = await page.$$eval('#career .role__org', (h) => h.map((x) => x.textContent.trim()));
  expect(orgs).toEqual([
    'SEGA Europe', 'Software Quality Systems', 'Think Finance', 'Oakam', 'Elevate',
    'Cabot Credit Management', 'Connells Group', 'NewDay', 'Simply Business',
  ]);
  expect(await page.locator('#career .marker').count()).toBe(3);
});

test('external links are exact', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href^="http"]', (a) => a.map((x) => x.getAttribute('href')));
  for (const want of [
    'https://www.amazon.co.uk/dp/B0G3QK8Q3G',
    'https://www.linkedin.com/in/protesting',
    'https://github.com/dnl-wlsn',
    'https://littleoceans.co.uk/work/',
    'https://rushtonelectrical.co.uk',
  ]) expect(hrefs).toContain(want);
  for (const h of hrefs) expect(h.startsWith('https://')).toBe(true);
});

test('in-page anchors all point at real ids', async ({ page }) => {
  await page.goto('/');
  const missing = await page.$$eval('a[href^="#"]', (a) =>
    a.map((x) => x.getAttribute('href').slice(1)).filter((id) => !document.getElementById(id)));
  expect(missing).toEqual([]);
});

test('copy has no em dashes and no phone numbers', () => {
  expect(html).not.toContain('—');
  expect(html.replace(/[\s().-]/g, '')).not.toMatch(/(?:\+?44|0)7\d{9}/);
});

test('career details expand on tap', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('#career details').first();
  await expect(d).not.toHaveAttribute('open', '');
  await d.locator('summary').click();
  await expect(d).toHaveAttribute('open', '');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every heading and paragraph is visible', async ({ page }) => {
    await page.goto('/');
    const hidden = await page.$$eval('main h1, main h2, main h3, main p', (els) =>
      els.filter((e) => {
        const cs = getComputedStyle(e);
        return cs.opacity === '0' || cs.visibility === 'hidden' || e.getClientRects().length === 0;
      }).filter((e) => !e.closest('details:not([open])')).map((e) => e.textContent.trim().slice(0, 40)));
    expect(hidden).toEqual([]);
  });
});

test('no horizontal scroll at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(375);
});

test('placeholders are marked (informational list)', async ({ page }) => {
  await page.goto('/');
  const marks = await page.$$eval('[data-placeholder]', (e) => [...new Set(e.map((x) => x.dataset.placeholder))].sort());
  console.log('placeholders still in the page:', marks.join(', ') || 'none');
});
