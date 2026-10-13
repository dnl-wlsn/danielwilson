// Each section feeds in over the last like a sheet through a printer: a band
// of the new paper rises over the overlap and flattens from a slight skew,
// scrubbed by scroll so it plays both ways. Transform only.
export function initSheets({ motion }) {
  for (const s of [...document.querySelectorAll('.sheet')].slice(1)) {
    const edge = document.createElement('span');
    edge.className = 'sheet-edge';
    edge.setAttribute('aria-hidden', 'true');
    s.prepend(edge);
    if (!motion) continue;
    gsap.fromTo(edge, { yPercent: 100, skewY: -5 }, {
      yPercent: 0, skewY: 0, ease: 'none',
      scrollTrigger: { trigger: s, start: 'top bottom', end: 'top 35%', scrub: true },
    });
  }
}
