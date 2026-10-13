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
        if (!def.self) e.preventDefault();
        return; // a fixed link works normally again
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
  bar.hidden = false;
  render();
  if (found.size === bugs.size) root.dataset.bugs = 'complete';
  const intro = found.size === bugs.size ? `All ${bugs.size} found. Your prize is at the bottom of the page.` : note.textContent;
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
  reset.addEventListener('click', () => { store.clear(); location.reload(); });

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
    hint.textContent = found.size === bugs.size ? 'See prize' : 'Hint';
    if (!fixNote) return;
    live.textContent = announceText(found.size, bugs.size, fixNote);
    flashNote(fixNote);
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
