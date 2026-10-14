import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
// Headings that hold a bug slot carry their real text in a visually hidden span.
const realText = (els) => els.map((x) => (x.querySelector('.visually-hidden') ?? x).textContent.trim());

test('sections appear in order and alternate cream and black', async ({ page }) => {
  await page.goto('/');
  const s = await page.$$eval('main > section.sheet', (s) => s.map((x) => [x.id, x.dataset.paper]));
  expect(s).toEqual([
    ['start', 'cream'], ['testing', 'black'], ['studio', 'cream'],
    ['running', 'black'], ['likes', 'cream'], ['contact', 'black'],
  ]);
});

test('the testing section runs 2009 to Simply Business in order', async ({ page }) => {
  await page.goto('/');
  const orgs = await page.$$eval('#testing .role__org', realText);
  expect(orgs).toEqual([
    'SEGA Europe', 'Software Quality Systems', 'Think Finance', 'Oakam', 'Elevate',
    'Cabot Credit Management', 'Connells Group', 'NewDay', 'Simply Business',
  ]);
  expect(await page.locator('#testing .marker').count()).toBe(3);
  await expect(page.locator('#testing .role--book cite')).toHaveText('The Book On Software Testing: A Guide for Non‑Testers');
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

test('the page says Daniel Wilson, never dnl wlsn, outside the reward', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Daniel Wilson');
  await expect(page.locator('h1')).toHaveAccessibleName('Daniel Wilson');
  const outside = html.replace(/<div class="reward"[\s\S]*?<\/div>\s*<\/section>/, '');
  expect(outside.toLowerCase()).not.toContain('dnl wlsn');
});

test('every bug slot is in the page, once', async ({ page }) => {
  await page.goto('/');
  const ids = await page.$$eval('[data-bug]', (e) => e.map((x) => x.dataset.bug));
  expect(ids).toEqual(['letters', 'date', 'route', 'upside-down', 'unit', 'beetle', 'dodge']);
});

test('career details expand on tap', async ({ page }) => {
  await page.goto('/');
  const d = page.locator('#testing details').first();
  await d.scrollIntoViewIfNeeded();
  await expect(d).not.toHaveAttribute('open', '');
  await d.locator('summary').click();
  await expect(d).toHaveAttribute('open', '');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every heading and paragraph is visible', async ({ page }) => {
    await page.goto('/');
    const hidden = await page.$$eval('main h1, main h2, main h3, main p', (els) =>
      els.filter((e) => !e.closest('[hidden]') && !e.classList.contains('visually-hidden')).filter((e) => {
        const cs = getComputedStyle(e);
        return cs.opacity === '0' || cs.visibility === 'hidden' || e.getClientRects().length === 0;
      }).filter((e) => !e.closest('details:not([open])')).map((e) => e.textContent.trim().slice(0, 40)));
    expect(hidden).toEqual([]);
  });

  test('every value is correct and there is no game', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.name__pair')).toHaveText('ie');
    await expect(page.locator('[data-bug="date"]')).toHaveText('2009');
    await expect(page.locator('[data-bug="unit"]')).toHaveText('km');
    await expect(page.locator('.bug')).toHaveCount(0);
    await expect(page.locator('.bugbar')).toBeHidden();
    await expect(page.locator('.reward')).toBeHidden();
  });
});

test('no horizontal scroll at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(375);
});

test('the name fits its section at every width', async ({ page }) => {
  for (const w of [320, 375, 768, 1280, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    const [nameW, boxW] = await page.$eval('.name', (n) => [n.scrollWidth, n.parentElement.clientWidth]);
    expect(nameW, `at ${w}px`).toBeLessThanOrEqual(boxW);
  }
});

test('placeholders are marked (informational list)', async ({ page }) => {
  await page.goto('/');
  const marks = await page.$$eval('[data-placeholder]', (e) => [...new Set(e.map((x) => x.dataset.placeholder))].sort());
  console.log('placeholders still in the page:', marks.join(', ') || 'none');
});
