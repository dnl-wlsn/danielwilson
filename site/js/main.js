// Entry point. Vendor scripts (gsap, ScrollTrigger, Lenis) are classic deferred
// scripts that run before this module, so they are available as globals.
import { initStart } from './start.js';

const motion = document.documentElement.classList.contains('motion');
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
