// Shared helpers for the bug hunt specs.
export const ready = (page) => page.waitForFunction(() =>
  document.documentElement.dataset.boot === 'ok' && document.documentElement.dataset.opening === 'done', null, { timeout: 20_000 })
  .catch(async (err) => {
    // Rare under a full parallel run: say which stage stalled, not just "timeout".
    const st = await page.evaluate(() => {
      const d = document.documentElement;
      return { boot: d.dataset.boot, opening: d.dataset.opening, motion: d.classList.contains('motion'), visibility: document.visibilityState };
    }).catch(() => 'page gone');
    throw new Error(`page never became ready: ${JSON.stringify(st)}\n${err.message}`);
  });

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
