// The prize for finding all 7 bugs: the letters of my name as physics bodies.
// They rain in and pile up, can be grabbed and thrown, and after a beat the
// vowels fall through the floor, leaving "DNL WLSN" (v1's name, as a nod).
// Matter.js loads only now, never before.
const root = document.documentElement;
const VOWEL = /[AEIOU]/;

const loadMatter = () => (window.Matter ? Promise.resolve() : new Promise((ok, no) => {
  const s = document.createElement('script');
  s.src = '/js/vendor/matter.min.js';
  s.onload = ok;
  s.onerror = no;
  document.head.append(s);
}));

export function initReward({ motion }) {
  const box = document.querySelector('.reward');
  if (!box) return;
  const stage = box.querySelector('.reward__stage');
  const unlock = () => {
    if (!box.hidden) return;
    box.hidden = false;
    const still = () => { box.classList.add('is-static'); root.dataset.reward = 'static'; };
    if (!motion) { still(); return; }
    root.dataset.reward = 'loading';
    loadMatter()
      .then(() => {
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          playground(box, stage);
        }, { threshold: 0.3 });
        io.observe(stage);
      })
      .catch((err) => { console.error(err); still(); });
  };
  if (root.dataset.bugs === 'complete') unlock();
  document.addEventListener('bugs:complete', unlock);
}

function playground(box, stage) {
  const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Sleeping } = window.Matter;
  const letters = [...stage.querySelectorAll('.rl')];
  const mouse = Mouse.create(stage);
  stage.removeEventListener('wheel', mouse.mousewheel); // let the page scroll over it
  // gen tags each animation loop; a rebuild bumps it so an old loop stops.
  let engine, mc, pairs = [], W = 0, H = 0, running = false, visible = true, vowelTimer = 0, gen = 0;

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(stage);

  function build() {
    gen++;
    running = false;
    clearTimeout(vowelTimer);
    stage.classList.remove('is-laid');
    for (const el of letters) { el.classList.remove('is-gone'); el.style.transform = ''; }
    const s = stage.getBoundingClientRect();
    const rects = letters.map((el) => el.getBoundingClientRect());
    stage.classList.add('is-laid');
    W = s.width; H = s.height;
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.1;
    const T = 80;
    const walls = [
      Bodies.rectangle(W / 2, H + T / 2, W * 2, T, { isStatic: true }),
      Bodies.rectangle(-T / 2, H / 2, T, H * 6, { isStatic: true }),
      Bodies.rectangle(W + T / 2, H / 2, T, H * 6, { isStatic: true }),
    ];
    pairs = letters.map((el, i) => {
      const r = rects[i];
      const b = Bodies.rectangle(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2 - H, r.width, r.height, {
        restitution: 0.3, friction: 0.5, angle: (Math.random() - 0.5) * 0.5,
      });
      return { el, b, w: r.width, h: r.height, vowel: VOWEL.test(el.textContent), gone: false };
    });
    mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
    Composite.add(engine.world, [...walls, ...pairs.map((p) => p.b), mc]);
    Events.on(mc, 'startdrag', start);
    vowelTimer = setTimeout(dropVowels, 2600);
    start();
  }

  function dropVowels() {
    for (const p of pairs) {
      if (!p.vowel) continue;
      p.b.collisionFilter.mask = 0; // collides with nothing, so it falls through the floor
      Sleeping.set(p.b, false);
    }
    start();
  }

  function step(mine) {
    if (mine !== gen) return;
    Engine.update(engine, 1000 / 60);
    let awake = mc.body !== null;
    for (const p of pairs) {
      if (p.gone) continue;
      const { x, y } = p.b.position;
      if (p.vowel && y > H + p.h) {
        p.gone = true;
        Composite.remove(engine.world, p.b);
        p.el.classList.add('is-gone');
        continue;
      }
      p.el.style.transform = `translate(${(x - p.w / 2).toFixed(1)}px, ${(y - p.h / 2).toFixed(1)}px) rotate(${p.b.angle.toFixed(3)}rad)`;
      if (!p.b.isSleeping) awake = true;
    }
    if (awake && visible) {
      requestAnimationFrame(() => step(mine));
    } else {
      running = false;
      root.dataset.reward = 'settled';
    }
  }

  function start() {
    if (running || !engine) return;
    running = true;
    root.dataset.reward = 'running';
    const mine = gen;
    requestAnimationFrame(() => step(mine));
  }

  stage.addEventListener('pointerdown', start);
  box.querySelector('[data-reward="shake"]').addEventListener('click', () => {
    for (const p of pairs) {
      if (p.gone) continue;
      Sleeping.set(p.b, false);
      Body.setVelocity(p.b, { x: (Math.random() - 0.5) * 16, y: -10 - Math.random() * 10 });
    }
    start();
  });
  const rebuild = () => {
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    build();
  };
  box.querySelector('[data-reward="reset"]').addEventListener('click', rebuild);
  // The walls are sized to the stage, so a resize or a phone rotation rebuilds it.
  let lastW = stage.clientWidth, resizeTimer = 0;
  new ResizeObserver(() => {
    if (stage.clientWidth === lastW) return;
    lastW = stage.clientWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 200);
  }).observe(stage);
  build();
}
