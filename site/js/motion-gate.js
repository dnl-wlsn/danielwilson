// Runs before first paint (plain, blocking script in <head>). Decides once whether
// the page animates. Everything hidden-before-reveal is scoped under html.motion,
// so no-JS and reduced-motion visitors always see the finished page.
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');
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
  };
  setTimeout(function () { if (d.dataset.boot !== 'ok') window.__dwStatic(); }, 6000);
})();
