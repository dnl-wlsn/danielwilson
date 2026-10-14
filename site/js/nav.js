// Closes the checkpoint menu after a jump, on Escape, and on a click outside.
export function initNav() {
  const d = document.querySelector('.cpnav details');
  if (!d) return;
  const close = () => { d.open = false; };
  d.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && d.open) { close(); d.querySelector('summary').focus(); }
  });
  document.addEventListener('click', (e) => { if (d.open && !d.contains(e.target)) close(); });
}
