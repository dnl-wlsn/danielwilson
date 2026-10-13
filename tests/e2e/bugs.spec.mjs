import { test, expect } from '@playwright/test';
import { ready, trigger, seed, activate, pointerFor } from './helpers.mjs';

// What each slot bug looks like broken, and fixed.
const SLOT_BUGS = [
  { id: 'letters', broken: async (p) => { await expect(p.locator('.name__pair')).toHaveText('ei'); await expect(p.locator('.name__pink > span').first()).toHaveText('Daneil'); },
    fixed: async (p) => { await expect(p.locator('.name__pair')).toHaveText('ie'); await expect(p.locator('.name__pink > span').first()).toHaveText('Daniel'); } },
  { id: 'date', broken: (p) => expect(p.locator('[data-bug="date"]')).toHaveText('2090'),
    fixed: (p) => expect(p.locator('[data-bug="date"]')).toHaveText('2009') },
  { id: 'overflow', broken: (p) => expect(p.locator('[data-bug="overflow"]')).toHaveClass(/is-spilling/),
    fixed: (p) => expect(p.locator('[data-bug="overflow"]')).not.toHaveClass(/is-spilling/) },
  { id: 'upside-down', broken: (p) => expect(p.locator('[data-bug="upside-down"]')).toHaveClass(/is-flipped/),
    fixed: (p) => expect(p.locator('[data-bug="upside-down"]')).not.toHaveClass(/is-flipped/) },
  { id: 'unit', broken: (p) => expect(p.locator('[data-bug="unit"]')).toHaveText('miles'),
    fixed: (p) => expect(p.locator('[data-bug="unit"]')).toHaveText('km') },
];

for (const bug of SLOT_BUGS) {
  for (const how of ['pointer', 'keyboard']) {
    test(`${bug.id}: fixed by ${how}`, async ({ page }, info) => {
      await page.goto('/');
      await ready(page);
      await bug.broken(page);
      await expect(trigger(page, bug.id)).toHaveAttribute('aria-label', /^Fix bug: /);
      await activate(page, bug.id, how === 'pointer' ? pointerFor(info) : 'keyboard');
      await expect(trigger(page, bug.id)).toHaveAttribute('data-fixed', '1');
      await bug.fixed(page);
      await expect(trigger(page, bug.id)).toHaveAttribute('aria-label', /^Fixed: /);
      await expect(trigger(page, bug.id)).toHaveAttribute('aria-disabled', 'true');
      await expect(trigger(page, bug.id).locator('.stamp')).toHaveText('Fixed');
      await expect(page.locator('[data-bug-count]')).toHaveText('1');
    });
  }
}

test('screen readers get the real value while the bug is showing', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('h1')).toHaveAccessibleName('Daniel Wilson');
  await expect(page.locator('#testing .role__year').first()).toContainText('2009');
  await expect(page.locator('.run__big .visually-hidden')).toHaveText('52.2 kilometres');
});

test('activating twice counts once', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const t = trigger(page, 'unit');
  await t.scrollIntoViewIfNeeded();
  await t.dblclick();
  await t.click();
  await expect(t).toHaveAttribute('data-fixed', '1');
  await expect(page.locator('[data-bug-count]')).toHaveText('1');
});

test('each fix is announced, with how it was caught', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await activate(page, 'date', 'keyboard');
  await expect(page.locator('[data-bug-live]')).toHaveText(/^Bug fixed, 1 of 7\. Caught with a boundary check/);
  await expect(page.locator('[data-bug-note]')).toHaveText(/^Caught with a boundary check/);
});

test('progress survives a reload, and reset clears it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await activate(page, 'date', 'keyboard');
  await activate(page, 'unit', 'keyboard');
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-bug-count]')).toHaveText('2');
  await expect(page.locator('[data-bug="date"]')).toHaveText('2009');
  await expect(trigger(page, 'date')).toHaveAttribute('data-fixed', '1');
  await expect(trigger(page, 'letters')).not.toHaveAttribute('data-fixed', '1');
  await page.locator('[data-bug-reset]').click();
  await ready(page);
  await expect(page.locator('[data-bug-count]')).toHaveText('0');
  await expect(page.locator('[data-bug="date"]')).toHaveText('2090');
});

test('corrupt saved progress is ignored', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dw-bugs-v1', '{oops'));
  await page.goto('/');
  await ready(page);
  await expect(page.locator('[data-bug-count]')).toHaveText('0');
});

test('saved progress with unknown ids keeps only the real ones', async ({ page }) => {
  await seed(page, ['date', 'old-bug']);
  await page.goto('/');
  await ready(page);
  await expect(page.locator('[data-bug-count]')).toHaveText('1');
});

test('hint goes to the next unfound bug in page order', async ({ page }) => {
  await seed(page, ['letters']);
  await page.goto('/');
  await ready(page);
  await page.locator('[data-bug-hint]').click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.dataset.for)).toBe('date');
});

test('the bar shows the count from the start', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page.locator('.bugbar')).toBeVisible();
  await expect(page.locator('.bugbar__count')).toHaveText('0 / 7 bugs found');
  await expect(page.locator('[data-bug-reset]')).toBeHidden();
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('bugs still break and fix, without movement', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('[data-bug="date"]')).toHaveText('2090');
    await activate(page, 'date', 'keyboard');
    await expect(page.locator('[data-bug="date"]')).toHaveText('2009');
    await expect(page.locator('[data-bug-count]')).toHaveText('1');
  });
});
