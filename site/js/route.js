import { routeSegments, segmentsToD, sampleSegments, lengthAtY, pointAtLength } from './lib/route-math.js';

const TIP = 0.6;          // the line's tip sits 60% of the way down the viewport
const DESKTOP = 832;      // matches the 52rem layout breakpoint

export function initRoute({ motion }) {
  const main = document.querySelector('.trail');
  const svg = main.querySelector('.route');
  const path = svg.querySelector('.route__line');
  const runner = svg.querySelector('.route__runner');
  const dots = [...main.querySelectorAll('[data-cp]')];
  const owners = [...main.querySelectorAll('[data-reach]')];
  owners.forEach((o) => o.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--i', i)));

  let table = null;
  let total = 0;
  let mainTop = 0;
  let cps = [];
  const reach = (el) => el && el.classList.add('is-reached');

  function rebuild() {
    const box = main.getBoundingClientRect();
    mainTop = box.top + window.scrollY;
    const w = main.clientWidth;
    const h = main.scrollHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const pts = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
    // Phones keep a short crossing too: the route starts under the fallen "o",
    // not on the rail, and has to reach the rail inside the empty top padding.
    const wide = w >= DESKTOP;
    const segs = routeSegments(pts, { cross: wide ? 230 : 140, wiggle: wide ? 10 : 6, minX: 8, maxX: w - 8 });
    path.setAttribute('d', segmentsToD(segs));
    // Measured in JS, not with getPointAtLength (which froze the intro for
    // seconds). pathLength makes the browser's dash maths use our length.
    table = sampleSegments(segs);
    total = table.ls.at(-1);
    path.setAttribute('pathLength', total.toFixed(3));
    cps = dots.map((d, i) => ({ owner: d.closest('[data-reach]'), len: lengthAtY(table, pts[i].y) }));
    path.style.strokeDasharray = `${total}`;
    update();
    document.documentElement.dataset.route = 'ready';
  }

  function update() {
    if (!table) return;
    let len = total;
    if (motion) {
      const se = document.scrollingElement;
      const atBottom = window.innerHeight + window.scrollY >= se.scrollHeight - 2;
      len = atBottom ? total : lengthAtY(table, window.scrollY + window.innerHeight * TIP - mainTop);
    }
    path.style.strokeDashoffset = `${total - len}`;
    const p = pointAtLength(table, len);
    runner.setAttribute('transform', `translate(${p.x} ${p.y})`);
    for (const c of cps) if (len >= c.len - 1) reach(c.owner);
  }

  // data-route is 'pending' from the moment a rebuild is queued until it lands,
  // so anything waiting on 'ready' sees the current layout, not a stale one.
  const pending = () => { document.documentElement.dataset.route = 'pending'; };
  let frame = 0;
  const schedule = () => {
    pending();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(rebuild);
  };
  const relayout = () => (motion ? ScrollTrigger.refresh() : schedule());

  let lastW = -1;
  let lastH = -1;
  let timer = 0;
  new ResizeObserver(() => {
    if (main.clientWidth === lastW && main.scrollHeight === lastH) return;
    lastW = main.clientWidth;
    lastH = main.scrollHeight;
    pending();
    clearTimeout(timer);
    timer = setTimeout(relayout, 100);
  }).observe(main);

  if (motion) {
    ScrollTrigger.addEventListener('refresh', schedule);
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
  } else {
    owners.forEach(reach);
  }
  document.fonts.ready.then(() => { pending(); relayout(); });
  document.addEventListener('focusin', (e) => reach(e.target.closest('[data-reach]')));
  window.__route = { rebuild };
  schedule();
  return { rebuild: schedule };
}
