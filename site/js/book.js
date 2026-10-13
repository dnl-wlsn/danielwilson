// The summit: the book turns from spine-on to face-on while its stage is pinned.
// Resting angle lives in CSS, so reduced motion and no-JS get it for free.
export function initBook({ motion }) {
  const stage = document.querySelector('.book-stage');
  const book = stage?.querySelector('.book');
  if (!book || !motion) return;
  const phone = window.matchMedia('(max-width: 40rem)').matches;
  gsap.set(book, { rotationX: 6, rotationY: 90 });
  gsap.timeline({
    scrollTrigger: { trigger: stage, start: 'center center', end: phone ? '+=60%' : '+=100%', pin: true, scrub: 0.6 },
  }).to(book, { rotationY: -18, ease: 'power2.inOut' });
}
