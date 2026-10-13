// Moves the beetle bug around the likes section until it's caught, then parks
// it in the bottom corner so its stamp never covers the list.
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
  const park = () => { btn.style.transform = `translate(${w.toFixed(1)}px, ${h.toFixed(1)}px)`; };
  const show = () => (btn.dataset.fixed ? park() : place(t));
  measure();
  show();
  new ResizeObserver(() => { measure(); show(); }).observe(zone);
  document.addEventListener('bug:fixed', (e) => {
    if (e.detail.id !== 'beetle') return;
    if (motion) gsap.to(btn, { x: w, y: h, rotation: 0, duration: 0.8, delay: 0.3, ease: 'power3.inOut' });
    else park();
  });
  if (!motion || btn.dataset.fixed) return;
  let paused = false, visible = false, frozenUntil = 0;
  btn.addEventListener('focus', () => { paused = true; });
  btn.addEventListener('blur', () => { paused = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(zone);
  // Like a real beetle, it freezes (and twitches) when a pointer comes close.
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || btn.dataset.fixed) return;
    const r = btn.getBoundingClientRect();
    if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 90) return;
    if (performance.now() > frozenUntil) {
      btn.classList.remove('is-twitch');
      void btn.offsetWidth;
      btn.classList.add('is-twitch');
    }
    frozenUntil = performance.now() + 1200;
  });
  const tick = (_time, dt) => {
    if (btn.dataset.fixed || btn.dataset.fixing) { gsap.ticker.remove(tick); return; }
    if (paused || !visible || performance.now() < frozenUntil) return;
    t += dt / 1000;
    place(t);
  };
  gsap.ticker.add(tick);
}
