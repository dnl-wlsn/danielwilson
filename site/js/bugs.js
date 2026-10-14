// The bug hunt engine. Each [data-bug] element in the HTML holds the CORRECT
// content. This module breaks it (per its definition in bug-defs.js), wraps it
// in a real button and fixes it on activation. Screen readers always get the
// real value from visually hidden text beside the slot; the button names the bug.
import { STORAGE_KEY, parseSaved, serialize, nextUnfound, announceText } from './lib/bug-state.js';

const root = document.documentElement;
const store = {
  read() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } },
  write(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode: progress just isn't kept */ } },
  clear() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* as above */ } },
};

export function initBugs(ctx, defs) {
  const bar = document.querySelector('.bugbar');
  const count = bar.querySelector('[data-bug-count]');
  const live = bar.querySelector('[data-bug-live]');
  const note = bar.querySelector('[data-bug-note]');
  const hint = bar.querySelector('[data-bug-hint]');
  const reset = bar.querySelector('[data-bug-reset]');
  const lock = document.querySelector('.reward-lock');
  const touch = window.matchMedia('(hover: none)').matches;
  const ids = defs.map((d) => d.id);
  const found = new Set(parseSaved(store.read(), ids));
  const bugs = new Map();

  for (const def of defs) {
    const slot = document.querySelector(`[data-bug="${def.id}"]`);
    if (!slot) continue;
    const trigger = def.self ? slot : wrap(slot, def);
    trigger.dataset.for = def.id;
    const bug = { def, slot, trigger };
    bugs.set(def.id, bug);
    if (found.has(def.id)) {
      def.renderFixed?.(slot, ctx);
      markFixed(bug, false);
      continue;
    }
    def.break(slot, ctx);
    if (def.self) describe(bug);
    else trigger.setAttribute('aria-label', `Fix bug: ${def.label}`);
    trigger.addEventListener('click', (e) => {
      if (found.has(def.id)) {
        // A fixed link works normally again, but not while its fix still plays.
        if (!def.self || trigger.dataset.fixing) e.preventDefault();
        return;
      }
      e.preventDefault();
      if (def.activate && !def.activate(e, slot, ctx)) return;
      fix(bug);
    });
  }

  // The note under the counter says something, then tucks away so the bar
  // never sits over the page for long (it covers content on phones).
  let noteTimer = 0;
  const flashNote = (text, ms = 7000) => {
    note.textContent = text;
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { note.hidden = true; }, ms);
  };

  bar.querySelector('[data-bug-total]').textContent = String(bugs.size);
  // One dot per bug, filled as they're found: quicker to read than the numbers.
  const pips = document.createElement('span');
  pips.className = 'bugbar__pips';
  pips.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < bugs.size; i++) pips.append(document.createElement('span'));
  bar.querySelector('.bugbar__count').after(pips);
  bar.hidden = false;
  render();
  if (found.size === bugs.size) root.dataset.bugs = 'complete';
  const intro = found.size === bugs.size
    ? `All ${bugs.size} found. Your prize is at the bottom of the page.`
    : `Seven bugs are hidden along the route, on purpose. ${touch ? 'Tap' : 'Click'} anything that looks wrong.`;
  if (root.dataset.opening === 'done') flashNote(intro, 9000);
  else document.addEventListener('opening:done', () => flashNote(intro, 9000), { once: true });

  hint.addEventListener('click', () => {
    const ordered = [...bugs.values()]
      .sort((a, b) => (a.trigger.compareDocumentPosition(b.trigger) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((b) => b.def.id);
    const id = nextUnfound(ordered, found);
    const target = id ? bugs.get(id).trigger : document.querySelector('.reward');
    if (ctx.lenis) {
      ctx.lenis.resize(); // the reward may have just been unhidden; Lenis caches the page height
      ctx.lenis.scrollTo(target, { offset: -window.innerHeight / 3 });
    }
    else target.scrollIntoView({ block: 'center' });
    if (!id) return;
    target.focus({ preventScroll: true });
    target.classList.remove('is-hinted');
    void target.offsetWidth; // restart the pulse
    target.classList.add('is-hinted');
  });
  reset.addEventListener('click', () => {
    store.clear();
    // Start the hunt again from the top, not wherever the reload would restore to.
    try { history.scrollRestoration = 'manual'; } catch { /* old browsers just restore */ }
    window.scrollTo(0, 0);
    location.reload();
  });

  // Unfound bugs give a small wiggle when they come into view, once the
  // opening has finished. Nothing else moves while someone reads.
  const startWiggles = () => {
    if (!ctx.motion) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const t = e.target;
        if (e.isIntersecting && !t.dataset.fixed) t.classList.add('is-wiggle');
      }
    }, { threshold: 0.6 });
    for (const b of bugs.values()) {
      if (found.has(b.def.id)) continue;
      b.trigger.addEventListener('animationend', (e) => { if (e.animationName === 'bug-wiggle') b.trigger.classList.remove('is-wiggle'); });
      io.observe(b.trigger);
    }
  };
  if (root.dataset.opening === 'done') startWiggles();
  else document.addEventListener('opening:done', startWiggles, { once: true });

  async function fix(bug) {
    const { def, slot, trigger } = bug;
    found.add(def.id);
    store.write(serialize(found));
    trigger.dataset.fixing = '1';
    trigger.classList.remove('is-wiggle', 'is-hinted');
    try {
      await def.fix(slot, ctx);
    } catch (err) {
      console.error(err);
      await def.fix(slot, { ...ctx, motion: false });
    }
    delete trigger.dataset.fixing;
    markFixed(bug, true);
    render(def.note);
    document.dispatchEvent(new CustomEvent('bug:fixed', { detail: { id: def.id } }));
    if (found.size === bugs.size) {
      root.dataset.bugs = 'complete';
      document.dispatchEvent(new Event('bugs:complete'));
      flashNote(`All ${bugs.size} found. Your prize is below.`, 9000);
      // Make 7/7 a moment: after the stamp lands, glide down to the prize
      // stage, where the letters fall in.
      setTimeout(() => {
        const stage = document.querySelector('.reward__stage');
        if (!stage) return;
        if (ctx.lenis) {
          ctx.lenis.resize();
          ctx.lenis.scrollTo(stage, { offset: -window.innerHeight * 0.2, duration: 1.6 });
        } else stage.scrollIntoView({ block: 'center', behavior: ctx.motion ? 'smooth' : 'auto' });
      }, ctx.motion ? 900 : 0);
    }
  }

  function markFixed({ def, trigger }, animate) {
    trigger.dataset.fixed = '1';
    if (def.self) {
      trigger.removeAttribute('aria-describedby');
      document.getElementById(`bug-desc-${def.id}`)?.remove();
    } else {
      trigger.setAttribute('aria-label', `Fixed: ${def.label}`);
      trigger.setAttribute('aria-disabled', 'true');
    }
    const stamp = document.createElement('span');
    stamp.className = 'stamp';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = 'Fixed';
    (def.self ? trigger.parentElement : trigger).append(stamp);
    if (animate && ctx.motion) gsap.from(stamp, { scale: 1.6, rotation: -20, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.5)' });
  }

  function render(fixNote) {
    count.textContent = String(found.size);
    root.dataset.bugsFound = String(found.size);
    reset.hidden = found.size === 0;
    hint.textContent = found.size === bugs.size ? 'Prize' : 'Hint';
    pips.querySelectorAll('span').forEach((p, i) => p.classList.toggle('is-on', i < found.size));
    const left = bugs.size - found.size;
    if (lock) {
      lock.hidden = left === 0;
      lock.textContent = `${left} ${left === 1 ? 'bug' : 'bugs'} to go for the prize.`;
    }
    if (!fixNote) return;
    live.textContent = announceText(found.size, bugs.size, fixNote);
    // Phones: the bar sits over the page, so it tucks away sooner.
    flashNote(fixNote, touch ? 4000 : 7000);
    if (ctx.motion) gsap.fromTo(count, { yPercent: -70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' });
  }
}

function wrap(slot, def) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = def.buttonClass ? `bug ${def.buttonClass}` : 'bug';
  slot.replaceWith(b);
  b.append(slot);
  return b;
}

function describe({ def, trigger }) {
  const d = document.createElement('span');
  d.id = `bug-desc-${def.id}`;
  d.className = 'visually-hidden';
  d.textContent = `Bug: ${def.label}. Activate it to fix it.`;
  trigger.after(d);
  trigger.setAttribute('aria-describedby', d.id);
}
