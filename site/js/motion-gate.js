// Runs before first paint (plain, blocking script in <head>). Decides once whether
// the page animates. Everything hidden-before-reveal is scoped under html.motion,
// so no-JS and reduced-motion visitors always see the finished page.
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');
  // The bug hunt is opt-in. Decided before paint so the page never flashes broken.
  try { d.dataset.hunt = localStorage.getItem('dw-hunt-v1') === 'on' ? 'on' : 'off'; } catch (e) { d.dataset.hunt = 'off'; }
  // Turning the hunt on or off reloads the page: start that reload at the top,
  // not wherever the browser would restore to (Safari ignores the setting made
  // before the reload, so it's made again here, before anything paints).
  try {
    if (sessionStorage.getItem('dw-top') === '1') {
      sessionStorage.removeItem('dw-top');
      d.dataset.toTop = '1';
      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  } catch (e) { /* no storage: the browser restores as usual */ }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  d.classList.add('motion');

  // Safety net: if the animation code never finishes booting (a script failed to
  // load or threw), drop back to the static page so nothing stays hidden.
  window.__dwStatic = function () {
    if (!d.classList.contains('motion')) return;
    d.classList.remove('motion');
    if (window.ScrollTrigger) window.ScrollTrigger.killAll();
    if (window.__dwLenis) window.__dwLenis.destroy();
    var styled = document.querySelectorAll('main [style]');
    for (var i = 0; i < styled.length; i++) styled[i].removeAttribute('style');
    var bar = document.querySelector('.bugbar');
    if (bar) { bar.classList.add('is-in'); bar.inert = false; }
    d.dataset.opening = 'done';
    document.dispatchEvent(new Event('dw:static'));
  };
  setTimeout(function () { if (d.dataset.boot !== 'ok') window.__dwStatic(); }, 6000);
})();
