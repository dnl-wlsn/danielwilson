// The finish tape stays up until every bug is fixed. Once they are, it snaps
// the next time it's on screen (straight away if it already is).
const root = document.documentElement;

export function initFinish({ motion }) {
  const tape = document.querySelector('.tape');
  if (!tape) return;
  const snap = () => tape.classList.add('is-broken');
  const complete = () => root.dataset.bugs === 'complete';
  if (!motion) {
    if (complete()) snap();
    document.addEventListener('bugs:complete', snap);
    return;
  }
  let seen = false;
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen && complete()) snap();
  }, { threshold: 1 }).observe(tape);
  document.addEventListener('bugs:complete', () => { if (seen) snap(); });
}
