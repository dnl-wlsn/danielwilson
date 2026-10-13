// Moves the beetle bug around the likes section until it's caught.
import { beetleAt } from './lib/beetle-math.js';

export function initBeetle({ motion }) {
  const btn = document.querySelector('.bug--beetle');
  if (!btn) return;
  const zone = btn.parentElement;
  const place = (t) => {
    const p = beetleAt(t, zone.clientWidth - btn.offsetWidth, zone.clientHeight - btn.offsetHeight);
    btn.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.angle.toFixed(1)}deg)`;
  };
  let t = 14;
  place(t);
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
