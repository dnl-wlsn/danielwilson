import { test, expect } from '@playwright/test';
import { ready, trigger, seed, activate, pointerFor } from './helpers.mjs';

const routeReady = (page) => page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
const reached = (page) => page.$$eval('main > section.is-reached', (s) => s.map((x) => x.id));

// Largest distance from a checkpoint dot to the drawn line.
const worstDotMiss = (page) => page.evaluate(() => {
  const path = document.querySelector('.route__line');
  const total = path.getTotalLength();
  const coarse = [];
  for (let l = 0; l <= total; l += 12) coarse.push([l, path.getPointAtLength(l)]);
  let worst = 0;
  for (const c of document.querySelectorAll('.route__cp')) {
    const x = Number(c.getAttribute('cx')), y = Number(c.getAttribute('cy'));
    const dist = (p) => Math.hypot(p.x - x, p.y - y);
    const [bestL] = coarse.reduce((a, b) => (dist(b[1]) < dist(a[1]) ? b : a));
    let best = Infinity;
    for (let l = Math.max(0, bestL - 12); l <= Math.min(total, bestL + 12); l += 0.5) best = Math.min(best, dist(path.getPointAtLength(l)));
    worst = Math.max(worst, best);
  }
  return worst;
});

test('one checkpoint per section and role, all on the line', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  expect(await page.locator('.route__cp').count()).toBe(await page.locator('[data-cp]').count());
  expect(await worstDotMiss(page)).toBeLessThan(3);
});

test('scrolling draws the line and reveals sections in order', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  expect(await reached(page)).toEqual([]);
  await expect(page.locator('#testing h2')).toHaveCSS('opacity', '0');
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#studio').offsetTop));
  await expect.poll(() => reached(page)).toEqual(['testing', 'studio']);
  await expect(page.locator('#testing h2')).toHaveCSS('opacity', '1');
  expect(await page.$eval('.route__line', (p) => parseFloat(p.style.strokeDashoffset))).toBeGreaterThan(0);
});

test('the bottom of the page reaches the finish', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('#contact')).toHaveClass(/is-reached/);
  await expect(page.locator('#contact h2')).toHaveCSS('opacity', '1');
});

test('tabbing into a section that the line has not reached reveals it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.locator('#studio .btn').focus();
  await expect(page.locator('#studio')).toHaveClass(/is-reached/);
});

test('the line never crosses the reading column', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  // Sample the line at every text block's height: it must be beside it, not over it.
  const hits = await page.evaluate(() => {
    const main = document.querySelector('.trail').getBoundingClientRect();
    const path = document.querySelector('.route__line');
    const total = path.getTotalLength();
    const pts = [];
    for (let l = 0; l <= total; l += 8) pts.push(path.getPointAtLength(l));
    // Cards scrolled out of the recent-sites rail are clipped by it, so they can't be under the line.
    const rail = document.querySelector('.work__rail')?.getBoundingClientRect();
    const shown = (el, r) => !rail || !el.closest('.work__rail') || (r.left >= rail.left - 1 && r.right <= rail.right + 1);
    const blocks = [...document.querySelectorAll('main h2, main h3, main p, main li > p')].map((b) => [b, b.getBoundingClientRect()])
      .filter(([el, r]) => r.width > 0 && shown(el, r)).map(([, r]) => r).map((r) => ({ l: r.left - main.left, r: r.right - main.left, t: r.top - main.top, b: r.bottom - main.top }));
    return pts.filter((p) => blocks.some((b) => p.x > b.l + 2 && p.x < b.r - 2 && p.y > b.t + 2 && p.y < b.b - 2)).length;
  });
  expect(hits).toBe(0);
});

test('phones: no horizontal scroll, line inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  const b = await page.$eval('.route__line', (p) => { const r = p.getBBox(); return { l: r.x, r: r.x + r.width }; });
  expect(b.l).toBeGreaterThanOrEqual(0);
  expect(b.r).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('line drawn in full, every section shown', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await routeReady(page);
    expect((await reached(page)).length).toBe(5);
    expect(await page.$eval('.route__line', (p) => parseFloat(p.style.strokeDashoffset))).toBe(0);
    const faded = await page.$$eval('[data-reveal]', (els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
    expect(faded).toBe(0);
  });
  test('the glitch fix snaps the line straight', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await activate(page, 'route', 'keyboard');
    await expect.poll(() => page.$eval('.route__line', (l) => (l.getAttribute('d').match(/L/g) ?? []).length)).toBe(0);
  });
});

test('the glitch button sits on the zigzag', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  const t = trigger(page, 'route');
  await t.scrollIntoViewIfNeeded();
  const ok = await page.evaluate(() => {
    const btn = document.querySelector('.bug--glitch').getBoundingClientRect();
    const main = document.querySelector('.trail').getBoundingClientRect();
    const d = document.querySelector('.route__line').getAttribute('d');
    const legs = [...d.matchAll(/L([\d.]+) ([\d.]+)/g)].map((m) => ({ x: +m[1] + main.left, y: +m[2] + main.top }));
    const mid = legs[Math.floor(legs.length / 2)];
    return mid.x > btn.left - 20 && mid.x < btn.right + 20 && mid.y > btn.top && mid.y < btn.bottom;
  });
  expect(ok).toBe(true);
});

test('the zigzag relaxes into the curve over time, not in one jump', async ({ page }, info) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  const t = trigger(page, 'route');
  await t.scrollIntoViewIfNeeded();
  const spread = () => page.$eval('.route__line', (l) => {
    const xs = [...l.getAttribute('d').matchAll(/L([\d.]+) /g)].map((m) => +m[1]);
    return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  });
  const before = await spread();
  await activate(page, 'route', pointerFor(info));
  await page.waitForTimeout(150);
  const mid = await spread();
  expect(mid).toBeLessThan(before);
  await expect(t).toHaveAttribute('data-fixed', '1');
  expect(await spread()).toBe(0);
});

test('the spider drops when the aid station is reached', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const ty = () => page.$eval('.spider', (s) => new DOMMatrix(getComputedStyle(s).transform).f);
  expect(await ty()).toBeLessThan(-50);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#likes').offsetTop));
  await expect.poll(ty, { timeout: 5000 }).toBe(0);
});

test('the route ends at the Finish checkpoint, not past it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  const [end, finish] = await page.evaluate(() => {
    const path = document.querySelector('.route__line');
    const p = path.getPointAtLength(path.getTotalLength());
    const dot = [...document.querySelectorAll('.route__cp')].at(-1);
    return [p.y, Number(dot.getAttribute('cy'))];
  });
  expect(Math.abs(end - finish)).toBeLessThan(2);
  expect(await page.$$eval('#contact .cp-anchor', (a) => a.length)).toBe(1);
});

test('the route is one smooth line, with no side-to-side wobble along a rail', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phones keep to one rail, so the line should be dead straight there');
  await page.goto('/');
  await ready(page);
  await routeReady(page);
  const spread = await page.evaluate(() => {
    const path = document.querySelector('.route__line');
    const total = path.getTotalLength();
    const xs = [];
    for (let l = total * 0.2; l <= total * 0.8; l += 10) xs.push(path.getPointAtLength(l).x);
    return Math.max(...xs) - Math.min(...xs);
  });
  expect(spread).toBeLessThan(1);
});
