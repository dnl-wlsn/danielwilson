// Per-section motion: stretching company names, the screenshot coming off the
// press, and the likes going on like stickers.
export function initScenes({ motion }) {
  if (!motion) return;
  // A wider name can wrap onto a different number of lines. Hold each name at
  // the height of its tallest state, so stretching never changes the layout
  // (otherwise scroll anchoring nudges the page and the stretch flickers).
  const orgs = [...document.querySelectorAll('#testing .role__org')];
  const lockHeights = () => {
    for (const org of orgs) {
      const had = org.classList.contains('is-wide');
      org.style.transition = 'none';
      org.style.minHeight = '';
      org.classList.remove('is-wide');
      const narrow = org.offsetHeight;
      org.classList.add('is-wide');
      const wide = org.offsetHeight;
      org.classList.toggle('is-wide', had);
      org.style.minHeight = `${Math.max(narrow, wide)}px`;
      org.style.transition = '';
    }
  };
  lockHeights();
  ScrollTrigger.addEventListener('refreshInit', lockHeights);
  for (const org of orgs) {
    ScrollTrigger.create({ trigger: org, start: 'center 60%', end: 'center 40%', toggleClass: 'is-wide' });
  }
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
