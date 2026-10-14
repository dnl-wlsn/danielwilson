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
import { initRoute } from './route.js';
import { initFinish } from './finish.js';
import { initHunt, huntOn } from './hunt.js';
import { initNav } from './nav.js';

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
    window.__dwLenis = lenis; // so the static fallback can switch smooth scrolling off
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const ctx = { motion, lenis };
  // Before the bugs: bug 3 is drawn by the route.
  ctx.route = initRoute(ctx);
  // The hunt is opt-in: until the visitor presses Play, every slot keeps its correct content.
  initHunt(ctx);
  initNav();
  if (huntOn()) initBugs(ctx, BUGS);
  initBeetle(ctx);
  const playOpening = initOpening(ctx);
  initOverprint(ctx);
  initSheets(ctx);
  initScenes(ctx);
  initFinish(ctx);
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
    // A refresh un-pins and re-pins the running scene, moving it in the DOM,
    // which drops keyboard focus inside it; put focus back where it was.
    let focused = null;
    ScrollTrigger.addEventListener('refreshInit', () => { refreshing = true; focused = document.activeElement; });
    ScrollTrigger.addEventListener('refresh', () => {
      refreshing = false;
      lastH = main.offsetHeight;
      if (focused && focused !== document.activeElement && focused.isConnected) focused.focus({ preventScroll: true });
    });
    const remeasure = () => {
      // Never mid-glide, and never during the opening: a refresh is a long task
      // that would cost the opening its frames.
      if (lenis.isScrolling || root.dataset.opening === 'playing') { timer = setTimeout(remeasure, 200); return; }
      lenis.resize();
      ScrollTrigger.refresh();
    };
    new ResizeObserver(() => {
      // Sub-pixel rounding makes the height wobble by a pixel while pins move; ignore that.
      if (refreshing || Math.abs(main.offsetHeight - lastH) <= 2) return;
      clearTimeout(timer);
      timer = setTimeout(remeasure, 150);
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
