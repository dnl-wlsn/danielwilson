// Each section after the first gets a band of its own paper over the overlap
// with the one before. It used to feed in with a skew as you scrolled, but the
// moving gap read as a rendering bug, so the edge now just sits there.
export function initSheets() {
  for (const s of [...document.querySelectorAll('.sheet')].slice(1)) {
    const edge = document.createElement('span');
    edge.className = 'sheet-edge';
    edge.setAttribute('aria-hidden', 'true');
    s.prepend(edge);
  }
}
