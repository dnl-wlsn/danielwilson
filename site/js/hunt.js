// The bug hunt is opt-in. Off by default, so a recruiter skimming the page
// sees every fact as written. "Play" turns it on and reloads from the top
// (the bugs are broken at load); "Stop playing" turns it off again.
import { HUNT_KEY } from './lib/bug-state.js';

const root = document.documentElement;

export const huntOn = () => root.dataset.hunt === 'on';

const save = (on) => {
  try {
    if (on) localStorage.setItem(HUNT_KEY, 'on');
    else localStorage.removeItem(HUNT_KEY);
    return true;
  } catch { return false; }
};

function reloadAtTop() {
  try { sessionStorage.setItem('dw-top', '1'); history.scrollRestoration = 'manual'; } catch { /* restores as usual */ }
  window.scrollTo(0, 0);
  // Drop any #section from the address, or the reload would jump straight back to it.
  if (location.hash) location.replace(location.pathname + location.search);
  else location.reload();
}

export function initHunt(ctx = {}) {
  const start = document.querySelector('[data-hunt-on]');
  const stop = document.querySelector('[data-hunt-off]');
  if (start && !huntOn() && save(false)) {
    start.hidden = false;
    start.addEventListener('click', () => {
      if (!save(true)) return;
      reloadAtTop();
    });
  }
  stop?.addEventListener('click', () => {
    save(false);
    reloadAtTop();
  });
  // Arrived from one of those reloads: make sure we're at the top once the
  // smooth scroller and the pinned scenes have set up.
  if (root.dataset.toTop) {
    const top = () => { ctx.lenis?.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); };
    top();
    requestAnimationFrame(top);
    window.addEventListener('load', () => requestAnimationFrame(top), { once: true });
    delete root.dataset.toTop;
  }
}
