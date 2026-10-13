// Per-section motion: stretching company names, the screenshot coming off the
// press, and the likes going on like stickers.
export function initScenes({ motion }) {
  if (!motion) return;
  // Each name stretches as wide as it can without wrapping onto a different
  // number of lines, so stretching never changes the layout (otherwise scroll
  // anchoring nudges the page and the stretch flickers).
  const orgs = [...document.querySelectorAll('#testing .role__org')];
  const lockHeights = () => {
    for (const org of orgs) {
      const had = org.classList.contains('is-wide');
      org.style.transition = 'none';
      org.classList.remove('is-wide');
      org.style.removeProperty('--wide');
      org.style.height = '';
      const narrow = org.offsetHeight;
      org.classList.add('is-wide');
      let fits = false;
      for (const s of [125, 115, 105, 95, 85, 75]) {
        org.style.setProperty('--wide', `${s}%`);
        if (org.offsetHeight === narrow) { fits = true; break; }
      }
      if (!fits) org.style.setProperty('--wide', '70%'); // no room to stretch at all
      // Both ends now share a height; pin it so in-between widths mid-animation
      // (which can wrap differently for a moment) never move the page either.
      org.style.height = `${narrow}px`;
      org.classList.toggle('is-wide', had);
      org.style.transition = '';
    }
  };
  lockHeights();
  ScrollTrigger.addEventListener('refreshInit', lockHeights);
  // Desktop: a big outlined year beside the list follows the role in the middle.
  const year = document.createElement('div');
  year.className = 'testing__year';
  year.setAttribute('aria-hidden', 'true');
  document.querySelector('#testing').append(year);
  ScrollTrigger.create({ trigger: '#testing .roles', start: 'top 55%', end: 'bottom 45%', toggleClass: { targets: year, className: 'is-on' } });
  const yearOf = (org) => {
    const y = org.closest('li').querySelector('.role__year');
    return ((y.querySelector('.visually-hidden') ?? y).textContent.match(/\d{4}/) ?? [''])[0];
  };
  for (const org of orgs) {
    ScrollTrigger.create({
      trigger: org, start: 'center 60%', end: 'center 40%', toggleClass: 'is-wide',
      onToggle: (self) => { if (self.isActive) year.textContent = yearOf(org); },
    });
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
