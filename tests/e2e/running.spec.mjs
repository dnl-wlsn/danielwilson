import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const race = JSON.parse(readFileSync(new URL('../../site/data/race.json', import.meta.url), 'utf8'));
const stat = (page, k) => page.locator(`[data-stat="${k}"]`).textContent();

const fmt = (n) => n.toLocaleString('en-GB');
const km = (n) => (Math.round((n + Number.EPSILON) * 10) / 10).toFixed(1);
const hms = (t) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

test('static HTML totals match the race data', async () => {
  const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
  expect(html).toContain(`<span data-stat="km">${km(race.distance_km)}</span>`);
  expect(html).toContain(`<span data-stat="climb">${fmt(race.climb_m)}</span>`);
  expect(html).toContain(`<span data-stat="time">${hms(race.elapsed_s)}</span>`);
  expect(html).toContain(`<span data-stat="calories">${fmt(race.calories)}</span>`);
  expect(html).toContain(`>${race.name}</h3>`);
  expect(html).toContain('>Moving time</dt>');
  expect(html).not.toContain('data-placeholder="race"');
});

test('calories count up with the run and finish at the real total', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
  await expect.poll(() => stat(page, 'calories')).toBe('0');
  const st = await page.evaluate(() => { const t = ScrollTrigger.getAll().find((x) => x.pin?.classList.contains('run-stage')); return [t.start, t.end]; });
  await page.evaluate((y) => window.scrollTo(0, y), Math.round((st[0] + st[1]) / 2));
  await expect.poll(async () => Number((await stat(page, 'calories')).replace(/,/g, ''))).toBeGreaterThan(race.calories * 0.3);
  await page.evaluate((y) => window.scrollTo(0, y + 5), st[1]);
  await expect.poll(() => stat(page, 'calories')).toBe(fmt(race.calories));
  await expect.poll(() => stat(page, 'climb')).toBe(fmt(race.climb_m));
});

test('the dot runs the profile with scroll', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
  await expect.poll(() => stat(page, 'km')).toBe('0.0');
  const st = await page.evaluate(() => { const t = ScrollTrigger.getAll().find((x) => x.pin?.classList.contains('run-stage')); return { start: t.start, end: t.end }; });
  await page.evaluate((y) => window.scrollTo(0, y), Math.round((st.start + st.end) / 2));
  await expect.poll(async () => Number(await stat(page, 'km'))).toBeGreaterThan(race.distance_km * 0.3);
  expect(Number(await stat(page, 'km'))).toBeLessThan(race.distance_km * 0.7);
  await page.evaluate((y) => window.scrollTo(0, y + 5), st.end);
  await expect.poll(() => stat(page, 'km')).toBe(km(race.distance_km));
  const clip = await page.$eval('.run__clip', (r) => Number(r.getAttribute('width')));
  expect(clip).toBeGreaterThan(900);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('shows the finished profile and totals with no pin', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
    expect(await stat(page, 'km')).toBe(km(race.distance_km));
    expect(await page.locator('.run-stage').evaluate((el) => el.parentElement.classList.contains('pin-spacer'))).toBe(false);
  });
});

test('the runner dot stays round however the plot is stretched', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
  const st = await page.evaluate(() => ScrollTrigger.getAll().find((x) => x.pin?.classList.contains('run-stage')).start);
  await page.evaluate((y) => window.scrollTo(0, y + 200), st);
  await page.waitForTimeout(400);
  const r = await page.$eval('.run__dot', (d) => { const b = d.getBoundingClientRect(); return b.width / b.height; });
  expect(r).toBeGreaterThan(0.9);
  expect(r).toBeLessThan(1.1);
});

test('the runner dot sits on the profile line', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
  const st = await page.evaluate(() => { const t = ScrollTrigger.getAll().find((x) => x.pin?.classList.contains('run-stage')); return [t.start, t.end]; });
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(st[0] + (st[1] - st[0]) * 0.4));
  await page.waitForTimeout(500);
  const miss = await page.evaluate(() => {
    const d = document.querySelector('.run__dot').getBoundingClientRect();
    const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
    const line = document.querySelector('.run__line');
    const m = line.getScreenCTM();
    let best = Infinity;
    const L = line.getTotalLength();
    for (let l = 0; l <= L; l += 1) {
      const p = line.getPointAtLength(l);
      const sx = m.a * p.x + m.c * p.y + m.e, sy = m.b * p.x + m.d * p.y + m.f;
      best = Math.min(best, Math.hypot(sx - cx, sy - cy));
    }
    return best;
  });
  expect(miss).toBeLessThan(3);
});

test('screen readers hear the real race totals, not the animated counters', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.running === 'ready');
  await expect(page.locator('.run__stats')).toHaveAttribute('aria-hidden', 'true');
  const summary = await page.locator('.run__summary').textContent();
  expect(summary).toContain(`${km(race.distance_km)} km`);
  expect(summary).toContain(`${fmt(race.climb_m)} m`);
  expect(summary).toContain(`${fmt(race.calories)} calories`);
  expect(summary).toContain(race.name);
});
