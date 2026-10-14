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

export function initHunt() {
  const start = document.querySelector('[data-hunt-on]');
  const stop = document.querySelector('[data-hunt-off]');
  if (start && !huntOn() && save(false)) {
    start.hidden = false;
    start.addEventListener('click', () => {
      if (!save(true)) return;
      try { history.scrollRestoration = 'manual'; } catch { /* old browsers just restore */ }
      window.scrollTo(0, 0);
      location.reload();
    });
  }
  stop?.addEventListener('click', () => {
    save(false);
    location.reload();
  });
}
