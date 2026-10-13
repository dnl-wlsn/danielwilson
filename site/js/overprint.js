// Display headings print in two inks. The second ink is a CSS pseudo-element
// that copies the heading text (alt text "" keeps it out of the accessible
// name). It starts well out of register and settles as the heading scrolls in.
export function initOverprint({ motion }) {
  for (const h of document.querySelectorAll('.ink')) {
    h.dataset.text = h.textContent.trim();
    if (!motion) continue;
    gsap.fromTo(h, { '--mis': 5 }, {
      '--mis': 1, ease: 'none',
      scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 45%', scrub: true },
    });
  }
}
