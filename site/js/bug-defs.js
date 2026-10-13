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
];
