// The checkpoint menu: jumps to a section without putting #section in the
// address bar (otherwise every reload, including pull-to-refresh, lands back
// there). Closes after a jump, on Escape, and on a click outside.
export function initNav(ctx = {}) {
  const d = document.querySelector('.cpnav details');
  if (!d) return;
  const close = () => { d.open = false; };
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) { if (e.target.closest('a')) close(); return; }
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation(); // Lenis's own anchor handling would set the hash
    close();
    if (ctx.lenis) ctx.lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: document.documentElement.classList.contains('motion') ? 'smooth' : 'auto' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && d.open) { close(); d.querySelector('summary').focus(); }
  });
  document.addEventListener('click', (e) => { if (d.open && !d.contains(e.target)) close(); });
}
