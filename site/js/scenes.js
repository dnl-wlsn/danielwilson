// Per-section motion: the screenshot coming off the press, and the likes
// going on like stickers. (The route reveals everything else.)
export function initScenes({ motion }) {
  if (!motion) return;
  const work = document.querySelector('#studio .studio-work');
  // opacity, not autoAlpha: visibility:hidden would drop the bug button inside
  // it out of the keyboard's tab order until scrolled to.
  gsap.from(work, {
    yPercent: 22, rotation: -3, opacity: 0, ease: 'power2.out',
    scrollTrigger: { trigger: work, start: 'top 95%', end: 'top 55%', scrub: true },
  });
  for (const list of document.querySelectorAll('.stickers')) {
    gsap.from(list.children, {
      scale: 1.35, opacity: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.07,
      scrollTrigger: { trigger: list, start: 'top 85%' },
    });
  }
}
