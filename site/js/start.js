// Opening shot: "daniel wilson" loses its vowels and settles as "dnl wlsn".
// The vowels drop out first; only then do the consonants FLIP-slide together
// (transform only), and the word widens once along Archivo's wdth axis.
const TILT = [-12, 9, -7, 14, -10];

// Returns a function that starts the intro.
export function initStart({ motion }) {
  const name = document.querySelector('.start__name');
  const glyphs = name.querySelector('.start__glyphs');
  const section = name.closest('.start');
  const landing = section.querySelector('.start__landing');
  const all = [...glyphs.querySelectorAll('.g')];
  const vowels = all.filter((g) => g.classList.contains('v'));
  const consonants = all.filter((g) => !g.classList.contains('v'));

  const placeLanding = () => {
    const o = vowels[vowels.length - 1];
    const s = section.getBoundingClientRect();
    const r = o.getBoundingClientRect();
    // A percentage, not px: the name is sized in vw, so the spot under the "o"
    // scales with the screen, and a resize can never strand the route's start
    // point off-screen.
    landing.style.setProperty('--landing-x', `${(((r.left + r.width / 2 - s.left) / s.width) * 100).toFixed(2)}%`);
  };
  const finish = () => {
    name.classList.add('is-done');
    landing.classList.add('is-lit');
    document.documentElement.dataset.start = 'done';
  };

  if (!motion) {
    finish();
    return () => {};
  }

  // A failed start must never leave the name hidden.
  window.addEventListener('error', () => { glyphs.style.visibility = 'visible'; }, { once: true });

  // Built paused: the caller plays it on the first frame after all setup work,
  // so the clock doesn't start inside a long task and jump ahead.
  const tl = gsap.timeline({ paused: true, onComplete: finish });
  tl.from(all, { autoAlpha: 0, y: 24, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
  glyphs.style.visibility = 'visible';

  // Take the vowels out of flow where they stand, and hold the consonants in
  // place with transforms so nothing moves yet.
  tl.add(() => {
    const first = consonants.map((c) => c.getBoundingClientRect().left);
    const box = glyphs.getBoundingClientRect();
    vowels.forEach((v) => {
      const r = v.getBoundingClientRect();
      v.style.left = `${r.left - box.left}px`;
      v.style.top = `${r.top - box.top}px`;
      v.classList.add('is-loose');
    });
    const last = consonants.map((c) => c.getBoundingClientRect().left);
    consonants.forEach((c, i) => gsap.set(c, { x: first[i] - last[i] }));
  }, 0.55);

  // 1. The vowels tip and drop out of the word, one after another.
  const fall = (v) => landing.getBoundingClientRect().top - v.getBoundingClientRect().top;
  vowels.forEach((v, i) => {
    const at = 0.6 + i * 0.1;
    tl.to(v, { rotation: TILT[i], duration: 0.14, ease: 'power1.out' }, at);
    tl.to(v, { y: () => fall(v), duration: 0.55, ease: 'power2.in' }, at + 0.14);
    tl.to(v, { autoAlpha: 0, duration: 0.2 }, at + 0.62);
  });

  // 2. Once they've all gone, the consonants squash up to each other,
  // 3. then the word widens and settles as "dnl wlsn".
  tl.to(consonants, { x: 0, duration: 0.6, ease: 'power3.inOut', stagger: 0.02 }, '>');
  tl.to(glyphs, { '--wdth': 125, duration: 0.5, ease: 'power2.out' }, '>-0.1');
  tl.add(() => landing.classList.add('is-lit'));

  return () => {
    placeLanding(); // measured now, with the real font in place
    document.documentElement.dataset.start = 'playing';
    tl.play(0);
  };
}
