// Entry point. Vendor scripts (gsap, ScrollTrigger, Lenis) are classic deferred
// scripts that run before this module, so they are available as globals.
import { initRunning } from './running.js';
import { initBugs } from './bugs.js';
import { BUGS } from './bug-defs.js';
import { initBeetle } from './beetle.js';
import { initOpening } from './opening.js';
import { initOverprint } from './overprint.js';

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
  const runningDone = initRunning(ctx)
    .then(() => {
      const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (motion && target) {
        lenis.resize();
        lenis.scrollTo(target, { immediate: true, force: true });
      }
    })
    .catch(console.error);
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
