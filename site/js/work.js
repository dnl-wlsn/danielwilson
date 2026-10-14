// Prev/next buttons for the recent sites rail. Without JS it still scrolls sideways.
export function initWork() {
  const rail = document.querySelector('.work__rail');
  const btns = document.querySelector('.work__btns');
  if (!rail || !btns) return;
  const prev = btns.querySelector('[data-work="prev"]');
  const next = btns.querySelector('[data-work="next"]');
  const step = () => (rail.querySelector('.card')?.offsetWidth ?? 300) + 24;
  const sync = () => {
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    btns.hidden = rail.scrollWidth <= rail.clientWidth + 2;
  };
  prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  rail.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(sync).observe(rail);
  sync();
}
