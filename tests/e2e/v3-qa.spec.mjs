import { test, expect } from '@playwright/test';
import { ready, trigger, seed, activate } from './helpers.mjs';

const ALL = ['letters', 'date', 'route', 'upside-down', 'unit', 'beetle', 'dodge'];
const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

test('the beetle wiggles in place: its button never rotates off its hit area', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const anim = await trigger(page, 'beetle').evaluate((b) => { b.classList.add('is-wiggle'); return getComputedStyle(b).animationName; });
  expect(anim).toBe('none');
  expect(await trigger(page, 'route').evaluate((b) => { b.classList.add('is-wiggle'); return getComputedStyle(b).animationName; })).toBe('none');
});

for (const [id, value] of [['date', '[data-bug="date"]'], ['unit', '[data-bug="unit"]']]) {
  test(`the ${id} stamp sits beside the fixed value, not over it`, async ({ page }) => {
    await seed(page, [id]);
    await page.goto('/');
    await ready(page);
    const ok = await page.evaluate(([id, sel]) => {
      const s = document.querySelector(`[data-for="${id}"] .stamp`).getBoundingClientRect();
      const v = document.querySelector(sel).getBoundingClientRect();
      return s.right <= v.left || v.right <= s.left || s.bottom <= v.top || v.bottom <= s.top;
    }, [id, value]);
    expect(ok).toBe(true);
  });
}

test('the beetle stamp stays on screen when it parks', async ({ page }) => {
  await seed(page, ['beetle']);
  await page.goto('/');
  await ready(page);
  await trigger(page, 'beetle').scrollIntoViewIfNeeded();
  const r = await page.locator('.bug--beetle .stamp').boundingBox();
  const vw = page.viewportSize().width;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(vw);
});

test('Email me lines up with the reading column on wide screens', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'desktop only');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await ready(page);
  const [btn, h2] = await Promise.all([page.locator('[data-bug="dodge"]').boundingBox(), page.locator('#contact h2').boundingBox()]);
  expect(Math.abs(btn.x - h2.x)).toBeLessThan(2);
});

test('the prize stage stays empty until the letters start to fall', async ({ page }) => {
  await seed(page, ALL.filter((x) => x !== 'unit'));
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => {
    window.__flash = 0;
    const box = document.querySelector('.reward');
    const look = () => {
      if (!box.hidden && !document.querySelector('.reward__stage').classList.contains('is-laid')) {
        const l = document.querySelector('.rl');
        if (getComputedStyle(l).visibility === 'visible') window.__flash++;
      }
      if (document.documentElement.dataset.reward !== 'running') requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  await activate(page, 'unit', 'keyboard');
  await page.waitForFunction(() => document.documentElement.dataset.reward === 'running', null, { timeout: 15000 });
  expect(await page.evaluate(() => window.__flash)).toBe(0);
});

test('the contact links reveal with their section', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  for (const sel of ['#contact .contact__cta', '#contact .contact__links']) {
    await expect(page.locator(sel)).toHaveAttribute('data-reveal', '');
  }
});

test('the route keeps up when a role opens (no second-long lag)', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  const d = page.locator('#testing details').first();
  await d.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await d.locator('summary').click();
  await page.waitForTimeout(350);
  const off = await page.evaluate(() => {
    const main = document.querySelector('.trail').getBoundingClientRect();
    const a = [...document.querySelectorAll('[data-cp]')].at(-1).getBoundingClientRect();
    const dot = [...document.querySelectorAll('.route__cp')].at(-1);
    return Math.abs(Number(dot.getAttribute('cy')) - (a.top - main.top));
  });
  expect(off).toBeLessThan(2);
});

test('the route runs on into the finish tape', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.waitForFunction(() => document.documentElement.dataset.route === 'ready');
  const [end, tape] = await page.evaluate(() => {
    const main = document.querySelector('.trail').getBoundingClientRect();
    const d = document.querySelector('.route__line').getAttribute('d').trim().split(/\s+/);
    const t = document.querySelector('.tape').getBoundingClientRect();
    return [+d.at(-1), t.top - main.top + t.height / 2];
  });
  expect(Math.abs(end - tape)).toBeLessThan(8);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no empty chart or stray dot in the running section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.run__plot')).toBeHidden();
  });
});
