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
  const playIntro = initStart(ctx);
  initBook(ctx);
  const runningDone = initRunning(ctx)
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
  const route = initRoute(ctx);
  root.dataset.boot = 'ok';
  // Start the intro once the page has settled: display font loaded (so letters
  // don't change shape mid-animation), running scene pinned, and the route
  // rebuilt and quiet. Setup work then can't steal frames from the animation.
  // Capped, so a slow network never holds the name back for long.
  const quiet = () => new Promise((ok) => {
    let since = 0;
    const check = (t) => {
      if (root.dataset.route !== 'ready') since = 0;
      else if (!since) since = t;
      if (since && t - since >= 150) ok();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  const settled = Promise.all([
    document.fonts.load('800 1em Archivo').catch(() => {}),
    runningDone.catch(() => {}),
  ]).then(quiet);
  Promise.race([settled, new Promise((ok) => setTimeout(ok, 2500))])
    .then(() => requestAnimationFrame(() => {
      playIntro();
      route.rebuild(); // the intro has just placed the landing dot under the "o"
    }));
} catch (err) {
  fallBack(err);
}
