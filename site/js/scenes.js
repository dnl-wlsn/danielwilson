// Per-section motion: stretching company names, the screenshot coming off the
// press, and the likes going on like stickers.
export function initScenes({ motion }) {
  if (!motion) return;
  for (const org of document.querySelectorAll('#testing .role__org')) {
    ScrollTrigger.create({ trigger: org, start: 'center 60%', end: 'center 40%', toggleClass: 'is-wide' });
  }
  const work = document.querySelector('#studio .studio-work');
  gsap.from(work, {
    yPercent: 22, rotation: -3, autoAlpha: 0, ease: 'power2.out',
    scrollTrigger: { trigger: work, start: 'top 95%', end: 'top 55%', scrub: true },
  });
  for (const list of document.querySelectorAll('.stickers')) {
    gsap.from(list.children, {
      scale: 1.35, autoAlpha: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.07,
      scrollTrigger: { trigger: list, start: 'top 85%' },
    });
  }
}
