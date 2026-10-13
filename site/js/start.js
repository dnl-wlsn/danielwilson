// Opening shot: "daniel wilson" loses its vowels and settles as "dnl wlsn".
// Vowels are taken out of flow where they stand, consonants FLIP-slide together
// (transform only), then the word widens once along Archivo's wdth axis.
const TILT = [-12, 9, -7, 14, -10];

export function initStart({ motion }) {
  const name = document.querySelector('.start__name');
  const glyphs = name.querySelector('.start__glyphs');
  const section = name.closest('.start');
  const landing = section.querySelector('.start__landing');
  const type = section.querySelector('.start__type');
  const all = [...glyphs.querySelectorAll('.g')];
  const vowels = all.filter((g) => g.classList.contains('v'));
  const consonants = all.filter((g) => !g.classList.contains('v'));

  const placeLanding = () => {
    const o = vowels[vowels.length - 1];
    const s = section.getBoundingClientRect();
    const r = o.getBoundingClientRect();
    landing.style.setProperty('--landing-x', `${r.left + r.width / 2 - s.left}px`);
  };
  const finish = () => {
    name.classList.add('is-done');
    landing.classList.add('is-lit');
    document.documentElement.dataset.start = 'done';
  };

  if (!motion) {
    finish();
    return;
  }

  // A failed start must never leave the name hidden.
  window.addEventListener('error', () => { glyphs.style.visibility = 'visible'; type.style.visibility = 'visible'; }, { once: true });
  placeLanding();
  const text = type.textContent;
  type.textContent = '';
  const chars = [...text].map((ch) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch;
    type.append(s);
    return s;
  });

  glyphs.style.visibility = 'visible';
  type.style.visibility = 'visible';
  const tl = gsap.timeline({ onComplete: finish });
  tl.from(all, { autoAlpha: 0, y: 24, duration: 0.5, stagger: 0.03, ease: 'power3.out' });
  tl.set(chars, { autoAlpha: 0 }, 0);
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
  const fall = (v) => landing.getBoundingClientRect().top - v.getBoundingClientRect().top;
  vowels.forEach((v, i) => {
    const at = 0.6 + i * 0.14;
    tl.to(v, { rotation: TILT[i], duration: 0.14, ease: 'power1.out' }, at);
    tl.to(v, { y: () => fall(v), duration: 0.55, ease: 'power2.in' }, at + 0.14);
    tl.to(v, { autoAlpha: 0, duration: 0.2 }, at + 0.62);
  });
  tl.to(consonants, { x: 0, duration: 0.6, ease: 'power3.inOut', stagger: 0.02 }, 0.8);
  tl.to(glyphs, { '--wdth': 125, duration: 0.5, ease: 'power2.out' }, '>-0.1');
  tl.add(() => landing.classList.add('is-lit'));
  tl.to(chars, { autoAlpha: 1, duration: 0.01, stagger: 0.022 }, '<');
}
