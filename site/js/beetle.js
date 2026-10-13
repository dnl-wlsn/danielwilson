// Moves the beetle bug around the likes section until it's caught.
import { beetleAt } from './lib/beetle-math.js';

export function initBeetle({ motion }) {
  const btn = document.querySelector('.bug--beetle');
  if (!btn) return;
  const zone = btn.parentElement;
  // Sizes are read on resize, not every frame, so the crawl never forces layout.
  let w = 0, h = 0, t = 14;
  const measure = () => { w = zone.clientWidth - btn.offsetWidth; h = zone.clientHeight - btn.offsetHeight; };
  const place = (time) => {
    const p = beetleAt(time, w, h);
    btn.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.angle.toFixed(1)}deg)`;
  };
  measure();
  place(t);
  new ResizeObserver(() => { measure(); place(t); }).observe(zone);
  if (!motion || btn.dataset.fixed) return;
  let paused = false, visible = false;
  btn.addEventListener('focus', () => { paused = true; });
  btn.addEventListener('blur', () => { paused = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(zone);
  const tick = (_time, dt) => {
    if (btn.dataset.fixed || btn.dataset.fixing) { gsap.ticker.remove(tick); return; }
    if (paused || !visible) return;
    t += dt / 1000;
    place(t);
  };
  gsap.ticker.add(tick);
}
