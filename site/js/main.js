// Entry point. Vendor scripts (gsap, ScrollTrigger, Lenis) are classic deferred
// scripts that run before this module, so they are available as globals.
import { initStart } from './start.js';
import { initRoute } from './route.js';
import { initBook } from './book.js';
import { initRunning } from './running.js';

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
  initStart(ctx);
  initBook(ctx);
  initRunning(ctx)
    .then(() => {
      // The browser jumped to any #hash before the pins existed; the pins have
      // since pushed the target down, so go to it again.
      const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
      if (motion && target) {
        lenis.resize(); // Lenis caches the old page height and would clamp to it
        lenis.scrollTo(target, { immediate: true, force: true });
      }
    })
    .catch(console.error);
  initRoute(ctx);
  root.dataset.boot = 'ok';
} catch (err) {
  fallBack(err);
}
