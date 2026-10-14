// The route: one pink line down the whole page, drawn by scroll, through a
// checkpoint for every section and role. It runs in the rails beside the
// reading column and only crosses sides in a sheet's empty top padding. It
// also draws bug 3, a glitch between two checkpoints (see glitchSegments).
import { routeSegments, segmentsToD, sampleSegments, lengthAtY, pointAtLength, glitchSegments } from './lib/route-math.js';

const TIP = 0.6;      // the line's tip sits 60% of the way down the viewport
const NS = 'http://www.w3.org/2000/svg';
const root = document.documentElement;

export function initRoute() {
  // Read live: the watchdog can switch motion off after boot (dw:static).
  const animated = () => root.classList.contains('motion');
  const phoneQuery = window.matchMedia('(max-width: 40rem)'); // phones keep to the left rail
  const main = document.querySelector('.trail');
  const svg = main.querySelector('.route');
  const path = svg.querySelector('.route__line');
  const runner = svg.querySelector('.route__runner');
  const anchors = [...main.querySelectorAll('[data-cp]')];
  const owners = [...main.querySelectorAll('[data-reach]')];
  // Each owner staggers only its own reveals, not those of the roles inside it.
  for (const o of owners) {
    [...o.querySelectorAll('[data-reveal]')]
      .filter((el) => el.parentElement.closest('[data-reach]') === o)
      .forEach((el, i) => el.style.setProperty('--i', i));
  }
  const RADIUS = { start: 0, '': 9, small: 6.5, marker: 4.5 };
  const cps = anchors.map((a) => {
    const kind = a.dataset.cp;
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', String(RADIUS[kind] ?? 9));
    dot.setAttribute('class', `route__cp${kind ? ` route__cp--${kind}` : ''}${a.closest('[data-paper]')?.dataset.paper === 'black' ? ' on-black' : ''}`);
    svg.querySelector('.route__cps').append(dot);
    return { anchor: a, dot, owner: a.closest('[data-reach]'), len: 0, reached: false };
  });
  const gi = anchors.findIndex((a) => a.hasAttribute('data-glitch-from'));

  let base = [], pts = [], table = null, total = 0, mainTop = 0, phone = false, amp = 0;

  const reach = (c) => {
    if (c.reached) return;
    c.reached = true;
    c.dot.classList.add('is-reached');
    c.owner?.classList.add('is-reached');
  };

  // Layout reads: where every checkpoint sits. Runs after each refresh.
  function measure() {
    const box = main.getBoundingClientRect();
    mainTop = box.top + window.scrollY;
    const w = main.clientWidth, h = main.offsetHeight;
    phone = phoneQuery.matches;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const edges = new Map();
    pts = anchors.map((a) => {
      const sheet = a.closest('.sheet');
      if (!edges.has(sheet)) {
        const col = sheet.querySelector(':scope > :not(.sheet-edge, .cp-anchor)').getBoundingClientRect();
        edges.set(sheet, { l: col.left - box.left, r: col.right - box.left });
      }
      const e = edges.get(sheet);
      const right = !phone && sheet.dataset.side === 'right';
      const x = right ? e.r + Math.min((w - e.r) / 2, 52) : e.l - Math.min(e.l / 2, 52);
      const r = a.getBoundingClientRect();
      return { x: Math.round(x * 10) / 10, y: Math.round((r.top - box.top) * 10) / 10 };
    });
    base = routeSegments(pts, { cross: phone ? 140 : 230, wiggle: phone ? 6 : 10, minX: 8, maxX: w - 8 });
    cps.forEach((c, i) => {
      c.dot.setAttribute('cx', pts[i].x);
      c.dot.setAttribute('cy', pts[i].y);
    });
    draw();
    placeGlitch(box);
    root.dataset.route = 'ready';
  }

  // Geometry only, no layout reads, so the glitch can be redrawn every frame.
  function draw() {
    const glitched = gi >= 0 && amp !== 0;
    // Wider rails, bigger zigzag, so it reads as a fault on a big screen too.
    const glitchSize = phone || gi < 0 ? 11 : Math.min(30, Math.max(16, pts[gi].x * 0.35));
    const segs = glitched ? glitchSegments(base, pts[gi], pts[gi + 1], amp, { size: glitchSize, step: phone ? 20 : 24 }) : base;
    path.setAttribute('d', segmentsToD(segs));
    // Measured in JS, not with getPointAtLength (which froze v1's intro for
    // seconds). pathLength makes the browser's dash maths use our length.
    table = sampleSegments(segs);
    total = table.ls.at(-1);
    path.setAttribute('pathLength', total.toFixed(3));
    path.style.strokeDasharray = `${total}`;
    cps.forEach((c, i) => { c.len = lengthAtY(table, pts[i].y); });
    update();
  }

  // The glitch's button sits over the zigzag. It lives in the role's list item
  // (so it comes in reading order), and is moved out to the rail from there.
  function placeGlitch(box) {
    const btn = document.querySelector('.bug--glitch');
    if (!btn || gi < 0) return;
    const li = btn.offsetParent.getBoundingClientRect();
    const a = pts[gi], b = pts[gi + 1];
    btn.style.height = `${Math.max(40, b.y - a.y - 24)}px`;
    btn.style.transform = `translate(${(a.x - (li.left - box.left) - btn.offsetWidth / 2).toFixed(1)}px, ${(a.y + 12 - (li.top - box.top)).toFixed(1)}px)`;
    btn.dataset.placed = '1';
  }

  function update() {
    if (!table) return;
    let len = total;
    if (animated()) {
      const atBottom = window.scrollY >= ScrollTrigger.maxScroll(window) - 2;
      len = atBottom ? total : lengthAtY(table, window.scrollY + window.innerHeight * TIP - mainTop);
    }
    path.style.strokeDashoffset = `${total - len}`;
    const p = pointAtLength(table, len);
    runner.setAttribute('transform', `translate(${p.x} ${p.y})`);
    for (const c of cps) if (len >= c.len - 1) reach(c);
  }

  // data-route is 'pending' from the moment a measure is queued until it
  // lands, so anything waiting on 'ready' sees the current layout.
  let frame = 0;
  const schedule = () => {
    root.dataset.route = 'pending';
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };

  const still = () => { cps.forEach(reach); schedule(); };
  if (animated()) {
    // main.js refreshes ScrollTrigger whenever the page's height changes.
    ScrollTrigger.addEventListener('refresh', schedule);
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
    document.addEventListener('dw:static', still, { once: true });
  } else {
    cps.forEach(reach);
  }
  // Re-measure as soon as the page changes size (a role opening, the prize
  // appearing), not only after main.js's debounced refresh: the anchors are
  // in the DOM, so the dots can follow them straight away.
  let lastW = main.clientWidth, lastH = main.offsetHeight;
  new ResizeObserver(() => {
    if (main.clientWidth === lastW && main.offsetHeight === lastH) return;
    lastW = main.clientWidth;
    lastH = main.offsetHeight;
    schedule();
  }).observe(main);
  document.fonts.ready.then(schedule);
  // Keyboard users must never land on content that hasn't been revealed.
  document.addEventListener('focusin', (e) => {
    const owner = e.target.closest?.('[data-reach]');
    for (const c of cps) if (c.owner && (c.owner === owner || c.owner.contains(owner))) reach(c);
  });
  schedule();

  return {
    rebuild: schedule,
    setGlitch(v) { amp = v; if (table) draw(); },
    // Fixing bug 3: the zigzag relaxes back into the curve.
    async relaxGlitch(animate) {
      if (animate) {
        const o = { a: amp };
        await gsap.to(o, { a: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)', onUpdate: () => { amp = o.a; draw(); } });
      }
      amp = 0;
      draw();
    },
  };
}
