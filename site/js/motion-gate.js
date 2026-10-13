// Runs before first paint (plain, blocking script in <head>). Decides once whether
// the page animates. Everything hidden-before-reveal is scoped under html.motion,
// so no-JS and reduced-motion visitors always see the finished page.
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js');
  d.classList.add('js');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) d.classList.add('motion');
})();
