// Entry point. Vendor scripts (gsap, ScrollTrigger, Lenis) are classic deferred
// scripts that run before this module, so they are available as globals.
import { initRunning } from './running.js';
import { initBugs } from './bugs.js';
import { BUGS } from './bug-defs.js';

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
  root.dataset.opening = 'done'; // Task 5 replaces this with the opening animation
  document.querySelector('.bugbar').classList.add('is-in');
  document.dispatchEvent(new Event('opening:done'));
  initRunning(ctx)
    .then(() => {
      // The browser jumped to any #hash before the pin existed; go to it again.
      const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (motion && target) {
        lenis.resize();
        lenis.scrollTo(target, { immediate: true, force: true });
      }
    })
    .catch(console.error);
  root.dataset.boot = 'ok';
} catch (err) {
  fallBack(err);
}
