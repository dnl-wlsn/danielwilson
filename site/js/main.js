// Entry point. Vendor scripts (gsap, ScrollTrigger, Lenis) are classic deferred
// scripts that run before this module, so they are available as globals.
import { initRunning } from './running.js';
import { initBugs } from './bugs.js';
import { BUGS } from './bug-defs.js';
import { initBeetle } from './beetle.js';
import { initOpening } from './opening.js';
import { initOverprint } from './overprint.js';
import { initSheets } from './sheets.js';
import { initScenes } from './scenes.js';
import { initReward } from './reward.js';

const root = document.documentElement;
const fallBack = (err) => {
  window.__dwStatic?.();
  console.error(err);
};

try {
  const motion = root.classList.contains('motion');
  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ autoRaf: false, anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const ctx = { motion, lenis };
  initBugs(ctx, BUGS);
  initBeetle(ctx);
  const playOpening = initOpening(ctx);
  initOverprint(ctx);
  initSheets(ctx);
  initScenes(ctx);
  initReward(ctx);
  const runningDone = initRunning(ctx)
    .then(() => {
      const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (motion && target) {
        lenis.resize();
        lenis.scrollTo(target, { immediate: true, force: true });
      }
    })
    .catch(console.error);
  if (motion) {
    // Scroll positions are measured once per refresh. Whenever the page's
    // height changes afterwards (fonts swapping in, a role opened, the reward
    // appearing), measure again so effects and pins stay where they belong.
    // A refresh briefly changes the height itself while it measures, so the
    // height that counts is the one it leaves behind.
    const main = document.querySelector('main');
    let lastH = 0, timer = 0, refreshing = false;
    ScrollTrigger.addEventListener('refreshInit', () => { refreshing = true; });
    ScrollTrigger.addEventListener('refresh', () => { refreshing = false; lastH = main.offsetHeight; });
    new ResizeObserver(() => {
      if (refreshing || main.offsetHeight === lastH) return;
      clearTimeout(timer);
      timer = setTimeout(() => { lenis.resize(); ScrollTrigger.refresh(); }, 150);
    }).observe(main);
  }
  root.dataset.boot = 'ok';
  // Start the opening once the page has settled (fonts loaded, running scene
  // pinned) so setup work can't steal its frames. Capped at 2.5 s.
  const settled = Promise.all([
    document.fonts.load('900 1em Archivo').catch(() => {}),
    document.fonts.load('400 1em Anton').catch(() => {}),
    runningDone.catch(() => {}),
  ]);
  Promise.race([settled, new Promise((ok) => setTimeout(ok, 2500))])
    .then(() => requestAnimationFrame(() => playOpening()));
} catch (err) {
  fallBack(err);
}
