// The prize for finding all 7 bugs: the letters of my name as physics bodies.
// They rain in and pile up, can be grabbed and thrown, and after a beat they
// slide into a readable line: DANIEL WILSON.
// Matter.js loads only now, never before.
const root = document.documentElement;

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
          // A short beat after 7/7, so the stamp and the letters do not land at once.
          setTimeout(() => playground(box, stage), 450);
        }, { threshold: 0.15 });
        io.observe(stage);
      })
      .catch((err) => { console.error(err); still(); });
  };
  if (root.dataset.bugs === 'complete') unlock();
  document.addEventListener('bugs:complete', unlock);
}

function playground(box, stage) {
  const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Sleeping, Query } = window.Matter;
  const letters = [...stage.querySelectorAll('.rl')];
  const mouse = Mouse.create(stage);
  stage.removeEventListener('wheel', mouse.mousewheel); // let the page scroll over it
  // A letter let go outside the stage must still be let go.
  window.addEventListener('mouseup', (e) => { if (mouse.button === 0) mouse.mouseup(e); });
  // Touch: Matter would block page scrolling anywhere on the stage. Only a
  // touch that starts on a letter grabs; any other swipe scrolls the page.
  stage.removeEventListener('touchstart', mouse.mousedown);
  stage.removeEventListener('touchmove', mouse.mousemove);
  stage.removeEventListener('touchend', mouse.mouseup);
  let grabbing = false;
  const onLetter = (e) => {
    const t = e.changedTouches[0], r = stage.getBoundingClientRect();
    return Query.point(pairs.filter((p) => !p.gone).map((p) => p.b), { x: t.clientX - r.left, y: t.clientY - r.top }).length > 0;
  };
  stage.addEventListener('touchstart', (e) => {
    if (!engine || !onLetter(e)) return;
    grabbing = true;
    mouse.mousedown(e); // calls preventDefault, so this gesture won't scroll
    start();
  }, { passive: false });
  stage.addEventListener('touchmove', (e) => { if (grabbing) mouse.mousemove(e); }, { passive: false });
  const letGo = (e) => { if (grabbing) { grabbing = false; mouse.mouseup(e); } };
  stage.addEventListener('touchend', letGo);
  stage.addEventListener('touchcancel', letGo);
  // gen tags each animation loop; a rebuild bumps it so an old loop stops.
  let engine, mc, pairs = [], W = 0, H = 0, running = false, visible = true, vowelTimer = 0, gen = 0;
  let lineup = null, tweens = [];

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(stage);

  function build() {
    gen++;
    running = false;
    clearTimeout(vowelTimer);
    clearTimeout(lineup);
    lineup = null;
    tweens.forEach((t) => t.kill());
    tweens = [];
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
      return { el, b, w: r.width, h: r.height, vowel: false, gone: false };
    });
    mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
    Composite.add(engine.world, [...walls, ...pairs.map((p) => p.b), mc]);
    Events.on(mc, 'startdrag', () => { release(); start(); });
    vowelTimer = setTimeout(lineUp, 2600);
    start();
  }

  function step(mine) {
    if (mine !== gen) return;
    Engine.update(engine, 1000 / 60);
    let awake = mc.body !== null || tweens.some((t) => t.progress() < 1);
    for (const p of pairs) {
      if (p.gone) continue;
      const { x, y } = p.b.position;
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

  // After a beat the letters slide into a readable line, wherever the
  // physics left them. Grab or shake to scatter again.
  function lineUp() {
    const rest = pairs.filter((p) => !p.gone);
    const gapL = rest[0].h * 0.03, gapW = rest[0].h * 0.35;
    const width = (ps) => ps.reduce((s, p) => s + p.w, 0) + gapL * (ps.length - 1);
    // One line if it fits, otherwise DANIEL on top of WILSON (phones).
    const rows = width(rest) + gapW <= W * 0.96 ? [rest] : [rest.slice(0, 6), rest.slice(6)];
    let k = 0;
    rows.forEach((row, r) => {
      const oneLine = rows.length === 1;
      let x = (W - width(row) - (oneLine ? gapW - gapL : 0)) / 2;
      const y = H - (rows.length - r - 1) * row[0].h * 1.05;
      row.forEach((p, i) => {
        if (oneLine && i === 6) x += gapW - gapL; // between DANIEL and WILSON
        const target = { x: x + p.w / 2, y: y - p.h / 2 };
        x += p.w + gapL;
        Body.setStatic(p.b, true);
        const turn = Math.round(p.b.angle / (2 * Math.PI)) * 2 * Math.PI;
        const pose = { x: p.b.position.x, y: p.b.position.y, a: p.b.angle };
        tweens.push(gsap.to(pose, {
          x: target.x, y: target.y, a: turn, duration: 0.9, delay: k++ * 0.06, ease: 'power3.inOut',
          onUpdate: () => { Body.setPosition(p.b, { x: pose.x, y: pose.y }); Body.setAngle(p.b, pose.a); },
          onComplete: () => { Body.setStatic(p.b, false); Sleeping.set(p.b, true); },
        }));
      });
    });
    start();
  }
  function release() {
    tweens.forEach((t) => t.kill());
    tweens = [];
    for (const p of pairs) if (!p.gone && p.b.isStatic) Body.setStatic(p.b, false);
  }

  stage.addEventListener('pointerdown', start);
  box.querySelector('[data-reward="shake"]').addEventListener('click', () => {
    release();
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
