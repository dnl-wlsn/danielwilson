import { test, expect } from '@playwright/test';
import { ready, trigger, seed, activate } from './helpers.mjs';

const ALL = ['letters', 'date', 'route', 'upside-down', 'unit', 'beetle', 'dodge'];
const reward = (page) => page.evaluate(() => document.documentElement.dataset.reward);

test('fixing the 7th bug brings the prize into view and it plays', async ({ page }) => {
  await seed(page, ALL.filter((x) => x !== 'dodge'));
  await page.goto('/');
  await ready(page);
  await activate(page, 'dodge', 'keyboard');
  await expect.poll(() => reward(page), { timeout: 10_000 }).toMatch(/running|settled/);
  await expect(page.locator('[data-bug-note]')).toContainText('prize');
});

test('after the vowels drop, the rest line up as DNL WLSN', async ({ page }) => {
  test.setTimeout(30_000);
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.rl.v.is-gone').count(), { timeout: 10_000 }).toBe(5);
  await expect.poll(() => page.evaluate(() => {
    const ls = [...document.querySelectorAll('.rl:not(.is-gone)')].map((l) => [l.textContent, l.getBoundingClientRect()]);
    const bottoms = ls.map(([, r]) => Math.round(r.bottom));
    const sameLine = Math.max(...bottoms) - Math.min(...bottoms) <= 3;
    const order = [...ls].sort((a, b) => a[1].left - b[1].left).map(([t]) => t).join('');
    return sameLine ? order : 'not in line';
  }), { timeout: 10_000 }).toBe('DNLWLSN');
});

test('a letter let go outside the stage does not stick to the pointer', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'mouse');
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.reward === 'settled', null, { timeout: 20_000 });
  const b = await page.locator('.rl:not(.is-gone)').first().boundingBox();
  const s = await page.locator('.reward__stage').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, s.y - 60, { steps: 8 });
  await page.mouse.up();
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2, { steps: 8 });
  await expect.poll(() => reward(page), { timeout: 15_000 }).toBe('settled');
});

test('on touch, swiping the empty stage scrolls the page; touching a letter grabs it', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'touch');
  await seed(page, ALL);
  await page.goto('/');
  await ready(page);
  await page.locator('.reward__stage').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.reward === 'settled', null, { timeout: 20_000 });
  expect(await page.$eval('.reward__stage', (s) => getComputedStyle(s).touchAction)).toBe('pan-y');
  const prevented = (x, y) => page.evaluate(([x, y]) => {
    const stage = document.querySelector('.reward__stage');
    const t = new Touch({ identifier: 1, target: stage, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY });
    const e = new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], cancelable: true, bubbles: true });
    stage.dispatchEvent(e);
    const end = new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t], cancelable: true, bubbles: true });
    stage.dispatchEvent(end);
    return e.defaultPrevented;
  }, [x, y]);
  const s = await page.locator('.reward__stage').boundingBox();
  expect(await prevented(s.x + 8, s.y + 8)).toBe(false);
  const l = await page.locator('.rl:not(.is-gone)').first().boundingBox();
  expect(await prevented(l.x + l.width / 2, l.y + l.height / 2)).toBe(true);
});

for (const size of [null, { width: 390, height: 664 }]) test(`Hint on a phone keeps focus on the bug and does not keep re-measuring${size ? ' (iPhone 13 size)' : ''}`, async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone');
  if (size) await page.setViewportSize(size);
  await seed(page, ['letters', 'date', 'route', 'upside-down']);
  await page.goto('/');
  await ready(page);
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__r = 0; ScrollTrigger.addEventListener('refresh', () => window.__r++); });
  await page.locator('[data-bug-hint]').click();
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => window.__r)).toBeLessThanOrEqual(2); // was ~15 per hint
  expect(await page.evaluate(() => document.activeElement?.dataset.for)).toBe('unit');
});

test('the bar shows a dot per bug, filled as they are found', async ({ page }) => {
  await seed(page, ['date', 'unit']);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.bugbar__pips > *')).toHaveCount(7);
  await expect(page.locator('.bugbar__pips > .is-on')).toHaveCount(2);
  await activate(page, 'letters', 'keyboard');
  await expect(page.locator('.bugbar__pips > .is-on')).toHaveCount(3);
});

test('the prize shows as locked until all 7 are found', async ({ page }) => {
  await seed(page, ['date']);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.reward-lock')).toHaveText(/Finish locked\. 6 bugs to go\./);
  await activate(page, 'unit', 'keyboard');
  await expect(page.locator('.reward-lock')).toHaveText(/5 bugs to go/);
});

test('Reset bugs starts the hunt again from the top', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => localStorage.setItem('dw-bugs-v1', '["date"]'));
  await page.reload();
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('[data-bug-reset]').click();
  await ready(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(page.locator('[data-bug-count]')).toHaveText('0');
});

test('the opening lines up on one left edge', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const lefts = await page.$$eval('#start .name__row, #start .opening__tag, #start .lede', (els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(lefts).size, lefts.join(',')).toBe(1);
});

test('touch visitors are told to tap', async ({ page }, info) => {
  await page.goto('/');
  await ready(page);
  const want = info.project.name === 'mobile' ? /Tap anything that looks wrong/ : /Click anything that looks wrong/;
  await expect(page.locator('[data-bug-note]')).toHaveText(want);
});

test('the beetle freezes when the pointer gets close', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'mouse');
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'beetle');
  await t.scrollIntoViewIfNeeded();
  const b = await t.boundingBox();
  await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2);
  await page.waitForTimeout(150);
  const at = await t.evaluate((el) => el.style.transform);
  await page.waitForTimeout(500);
  expect(await t.evaluate((el) => el.style.transform)).toBe(at);
});

test('the bug bar never covers the name', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const bar = await page.locator('.bugbar').boundingBox();
  const hits = await page.$$eval('.name .g', (gs, bar) => gs.map((g) => g.getBoundingClientRect()).filter((r) =>
    !(bar.x + bar.width <= r.left || r.right <= bar.x || bar.y + bar.height <= r.top || r.bottom <= bar.y)).length, bar);
  expect(hits).toBe(0);
});

