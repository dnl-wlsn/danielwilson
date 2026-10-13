// Opening shot: the letters of "Daniel Wilson" drop in with a weighted bounce,
// the pink ink slides from well out of register to almost in, then the bug
// counter pops in and the swapped letters start to wiggle.
const root = document.documentElement;

export function initOpening({ motion }) {
  const name = document.querySelector('.name');
  const bar = document.querySelector('.bugbar');
  const done = () => {
    root.dataset.opening = 'done';
    bar.inert = false;
    bar.classList.add('is-in');
    document.dispatchEvent(new Event('opening:done'));
  };
  if (!motion) { done(); return () => {}; }

  const pink = name.querySelector('.name__pink');
  const fs = parseFloat(getComputedStyle(name).fontSize);
  const tl = gsap.timeline({ paused: true, onComplete: done });
  tl.from(name.querySelectorAll('.g'), {
    yPercent: -170, autoAlpha: 0, duration: 0.95, ease: 'bounce.out', stagger: 0.045, clearProps: 'transform',
  });
  tl.fromTo(pink, { x: fs * 0.22, y: fs * -0.12, autoAlpha: 0 }, { x: fs * 0.035, y: fs * 0.02, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.55');
  // Built paused: main.js plays it once fonts and setup work have settled, so
  // the clock never starts inside a long task and jumps ahead.
  return () => {
    root.dataset.opening = 'playing';
    tl.play(0);
  };
}
