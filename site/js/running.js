import { makeScale, profileD, sampleAt, gradientAt, formatTime } from './lib/profile-math.js';

const W = 1000, H = 320, PAD = 12;

export async function initRunning({ motion }) {
  const stage = document.querySelector('.run-stage');
  if (!stage) return;
  const race = await (await fetch('/data/race.json')).json();
  const pts = race.points;
  const scale = makeScale(pts, W, H, PAD);
  stage.querySelector('.run__ghost').setAttribute('d', profileD(pts, scale, H, false));
  stage.querySelector('.run__area').setAttribute('d', profileD(pts, scale, H, true));
  stage.querySelector('.run__line').setAttribute('d', profileD(pts, scale, H, false));
  const clip = stage.querySelector('.run__clip');
  const dot = stage.querySelector('.run__dot');
  const out = {
    km: stage.querySelector('[data-stat="km"]'),
    climb: stage.querySelector('[data-stat="climb"]'),
    time: stage.querySelector('[data-stat="time"]'),
  };
  if (race.elapsed_s == null) stage.querySelector('.run__time').hidden = true;

  // Plot size in CSS px, so viewBox units can be turned into a transform.
  const svg = stage.querySelector('.run__svg');
  let plotW = svg.clientWidth, plotH = svg.clientHeight;
  let last = 0;
  new ResizeObserver(() => { plotW = svg.clientWidth; plotH = svg.clientHeight; show(last); }).observe(svg);

  function show(progress) {
    last = progress;
    const s = sampleAt(pts, progress * race.distance_km);
    const x = scale.x(s.km);
    clip.setAttribute('width', String(Math.round(x)));
    dot.style.transform = `translate(${((x / W) * plotW).toFixed(1)}px, ${((scale.y(s.ele) / H) * plotH).toFixed(1)}px)`;
    out.km.textContent = progress >= 1 ? race.distance_km.toFixed(1) : s.km.toFixed(1);
    out.climb.textContent = String(progress >= 1 ? race.climb_m : s.climb);
    out.time.textContent = formatTime(progress >= 1 ? race.elapsed_s : s.t);
    const steep = Math.min(1, Math.max(0, gradientAt(pts, s.km) / 0.15));
    stage.style.setProperty('--steep', steep.toFixed(2));
  }

  if (!motion) {
    show(1);
  } else {
    const phone = window.matchMedia('(max-width: 40rem)').matches;
    show(0);
    ScrollTrigger.create({
      trigger: stage, start: 'top top', end: phone ? '+=150%' : '+=250%',
      pin: true, scrub: true, onUpdate: (self) => show(self.progress),
    });
    ScrollTrigger.refresh();
  }
  document.documentElement.dataset.running = 'ready';
}
