// The bugs. Each break() puts a [data-bug] slot into its broken state; each
// fix() puts it right, animated when motion is on, and must leave correct
// content whether or not it animates.
const setPink = (text) => {
  const row = document.querySelector('.name__pink > span');
  if (row) row.textContent = text;
};

function reel(digit) {
  const r = document.createElement('span');
  r.className = 'reel';
  const strip = document.createElement('span');
  strip.className = 'reel__strip';
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('span');
    d.textContent = String(i);
    strip.append(d);
  }
  r.append(strip);
  gsap.set(strip, { yPercent: -digit * 10 });
  return r;
}

const SVG = 'http://www.w3.org/2000/svg';
function beetleSvg() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('focusable', 'false');
  const add = (tag, attrs) => {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  for (const d of ['M14 15 L6 10', 'M13 20 L4 20', 'M14 25 L6 31', 'M26 15 L34 10', 'M27 20 L36 20', 'M26 25 L34 31'])
    add('path', { d, stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', fill: 'none' });
  add('ellipse', { cx: '20', cy: '23', rx: '8', ry: '10', fill: 'currentColor' });
  add('circle', { cx: '20', cy: '11', r: '4.5', fill: 'currentColor' });
  add('path', { d: 'M20 14 L20 32', stroke: '#F4EFE4', 'stroke-width': '1.2' });
  return svg;
}

export const BUGS = [
  {
    id: 'letters',
    label: 'two letters swapped in my name',
    note: 'Caught by reading it one letter at a time. Spellcheckers skip names.',
    break(slot) {
      const [i, e] = slot.children;
      slot.insertBefore(e, i);
      slot.classList.add('is-bugged');
      setPink('Daneil');
    },
    async fix(slot, { motion }) {
      const [e, i] = slot.children;
      const before = [e, i].map((x) => x.getBoundingClientRect().left);
      slot.insertBefore(i, e);
      slot.classList.remove('is-bugged');
      setPink('Daniel');
      if (!motion) return;
      const after = [e, i].map((x) => x.getBoundingClientRect().left);
      const lift = parseFloat(getComputedStyle(slot).fontSize) * 0.3;
      await gsap.timeline()
        .from(e, { x: before[0] - after[0], rotation: -9, duration: 0.5, ease: 'power2.inOut' }, 0)
        .from(i, { x: before[1] - after[1], rotation: 7, duration: 0.5, ease: 'power2.inOut' }, 0)
        .to(e, { y: -lift, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.out' }, 0)
        .to(i, { y: lift * 0.5, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.out' }, 0)
        .fromTo([e, i], { scaleY: 0.82 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.45, ease: 'elastic.out(1, 0.35)' }, 0.5)
        .set([e, i], { clearProps: 'transform' });
    },
  },
  {
    id: 'date',
    label: 'a start date in the future',
    note: 'Caught with a boundary check: nobody starts a job in 2090.',
    break(slot) { slot.textContent = '2090'; },
    async fix(slot, { motion }) {
      if (!motion) { slot.textContent = '2009'; return; }
      slot.textContent = '20';
      const a = reel(9), b = reel(0);
      slot.append(a, b);
      await gsap.timeline()
        .to(a.firstChild, { yPercent: 0, duration: 0.7, ease: 'back.out(1.4)' }, 0)
        .to(b.firstChild, { yPercent: -90, duration: 0.7, ease: 'back.out(1.4)' }, 0.08);
      slot.textContent = '2009';
    },
  },
  {
    id: 'overflow',
    label: 'a heading spilling out of its box',
    note: 'Caught by testing with the longest real data, not the shortest.',
    break(slot) { slot.classList.add('is-spilling'); },
    async fix(slot, { motion }) {
      const before = slot.getBoundingClientRect().left;
      slot.classList.remove('is-spilling');
      if (!motion) return;
      const after = slot.getBoundingClientRect().left;
      await gsap.from(slot, { x: before - after, duration: 0.8, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' });
    },
  },
  {
    id: 'upside-down',
    label: 'a screenshot upside down',
    note: 'Caught by looking at the page itself, not just the test report.',
    break(slot) { slot.classList.add('is-flipped'); },
    async fix(slot, { motion }) {
      slot.classList.remove('is-flipped');
      if (motion) await gsap.from(slot, { rotation: 180, duration: 1.1, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
    },
  },
  {
    id: 'unit',
    label: 'a distance in the wrong unit',
    note: 'Caught by checking units wherever two systems meet.',
    break(slot) { slot.textContent = 'miles'; },
    async fix(slot, { motion }) {
      if (!motion) { slot.textContent = 'km'; return; }
      await gsap.to(slot, { scaleX: 0, duration: 0.18, ease: 'power2.in', transformOrigin: '0 50%' });
      slot.textContent = 'km';
      await gsap.to(slot, { scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' });
    },
  },
  {
    id: 'beetle',
    label: 'a beetle loose in the list',
    buttonClass: 'bug--beetle',
    note: 'Caught. Most bugs are found by someone who went looking.',
    break(slot) { slot.append(beetleSvg()); },
    renderFixed(slot) { if (!slot.firstChild) slot.append(beetleSvg()); },
    async fix(slot, { motion }) {
      if (motion) await gsap.fromTo(slot, { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
    },
  },
  {
    id: 'dodge',
    self: true,
    label: 'this button runs away from the pointer',
    note: 'Caught by testing with a mouse, a finger and a keyboard.',
    break(slot, { motion }) {
      if (!motion) { slot.classList.add('is-askew'); return; }
      slot.addEventListener('pointerdown', (e) => { slot.dataset.pointer = e.pointerType; });
      slot.addEventListener('keydown', () => { slot.dataset.pointer = 'key'; });
      const zone = slot.closest('section');
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      let dodges = 0, busy = false, x = 0, y = 0;
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || busy || dodges >= 3 || slot.dataset.fixed || slot.dataset.fixing) return;
        const r = slot.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) > Math.max(r.width, r.height) * 0.9) return;
        dodges++;
        busy = true;
        const a = Math.atan2(cy - e.clientY, cx - e.clientX);
        // Clamp the button's real position, not just its offset, so it can
        // never run off the page: r is the moved box, so r.left - x is home.
        const z = zone.getBoundingClientRect();
        const pad = 16;
        const homeL = r.left - x;
        let nx = x + Math.cos(a) * 150;
        if (homeL + nx < z.left + pad || homeL + nx + r.width > z.right - pad) nx = x - Math.cos(a) * 150; // bounce the other way
        x = clamp(nx, z.left + pad - homeL, z.right - pad - r.width - homeL);
        y = clamp(y + Math.sin(a) * 60, -50, 50);
        gsap.to(slot, { x, y, rotation: x / 30, duration: 0.35, ease: 'power3.out', onComplete: () => { busy = false; } });
      });
    },
    activate(e, slot, { motion }) {
      // Touch has no hover, so the first tap makes it hop and the second fixes it.
      if (!motion || slot.dataset.pointer !== 'touch' || slot.dataset.hopped) return true;
      slot.dataset.hopped = '1';
      gsap.to(slot, { x: 70, rotation: 6, duration: 0.3, ease: 'back.out(2)' });
      return false;
    },
    async fix(slot, { motion }) {
      slot.classList.remove('is-askew');
      if (motion) await gsap.to(slot, { x: 0, y: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
    },
  },
];
