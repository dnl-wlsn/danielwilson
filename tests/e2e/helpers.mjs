// Shared helpers for the bug hunt specs.
export const ready = (page) => page.waitForFunction(() =>
  document.documentElement.dataset.boot === 'ok' && document.documentElement.dataset.opening === 'done', null, { timeout: 15_000 });

export const trigger = (page, id) => page.locator(`[data-for="${id}"]`);

// Seeds saved progress before the page loads.
export const seed = (page, ids) => page.addInitScript((v) => localStorage.setItem('dw-bugs-v1', v), JSON.stringify(ids));

export async function activate(page, id, how) {
  const t = trigger(page, id);
  await t.scrollIntoViewIfNeeded();
  if (how === 'keyboard') { await t.focus(); await page.keyboard.press('Enter'); }
  else if (how === 'tap') await t.tap();
  else await t.click();
}

export const pointerFor = (info) => (info.project.name === 'mobile' ? 'tap' : 'click');
