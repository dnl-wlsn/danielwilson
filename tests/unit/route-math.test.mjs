import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutePath, routeSegments, segmentsToD, sampleSegments, sampleTable, lengthAtY, pointAtLength } from '../../site/js/lib/route-math.js';

const parse = (d) => [...d.matchAll(/([MLQC])([^MLQC]*)/g)].map(([, c, args]) => ({ c, n: args.trim().split(/[\s,]+/).map(Number) }));

const pts = [{ x: 200, y: 50 }, { x: 200, y: 600 }, { x: 1000, y: 1400 }, { x: 1000, y: 1500 }, { x: 240, y: 2600 }];

test('starts at the first point and passes through every point', () => {
  const cmds = parse(buildRoutePath(pts, { minX: 8, maxX: 1272 }));
  assert.deepEqual(cmds[0], { c: 'M', n: [200, 50] });
  const ends = cmds.map(({ n }) => `${n.at(-2)},${n.at(-1)}`);
  for (const p of pts) assert.ok(ends.includes(`${p.x},${p.y}`), `missing ${p.x},${p.y}`);
});

test('all x coordinates stay inside the bounds', () => {
  for (const { n } of parse(buildRoutePath(pts, { minX: 8, maxX: 1272, wiggle: 40 }))) {
    for (let i = 0; i < n.length; i += 2) assert.ok(n[i] >= 8 && n[i] <= 1272, `x ${n[i]} out of bounds`);
  }
});

test('y never goes backwards, so lookups by y are valid', () => {
  let last = -Infinity;
  for (const { n } of parse(buildRoutePath(pts))) {
    for (let i = 1; i < n.length; i += 2) { assert.ok(n[i] >= last - 1e-9, `y ${n[i]} < ${last}`); last = Math.max(last, n[i]); }
  }
});

test('side changes only happen in the last `cross` px before a point', () => {
  const cmds = parse(buildRoutePath([{ x: 100, y: 0 }, { x: 900, y: 1000 }], { cross: 140, wiggle: 0 }));
  const c = cmds.find((k) => k.c === 'C');
  assert.equal(c.n[1], 930);
  assert.equal(cmds[cmds.indexOf(c) - 1].n.at(-1), 860);
});

test('phones: every point on one rail gives a gently wiggling vertical line', () => {
  const d = buildRoutePath([{ x: 24, y: 0 }, { x: 24, y: 900 }], { cross: 0, wiggle: 6, minX: 8, maxX: 367 });
  assert.ok(!d.includes('C'));
  for (const { n } of parse(d)) for (let i = 0; i < n.length; i += 2) assert.ok(n[i] >= 12 && n[i] <= 36);
});

test('no zero-length duplicate segments', () => {
  const cmds = parse(buildRoutePath([{ x: 24, y: 0 }, { x: 24, y: 900 }], { cross: 0, wiggle: 6 }));
  const ends = cmds.map(({ n }) => `${n.at(-2)},${n.at(-1)}`);
  for (let i = 1; i < ends.length; i++) assert.notEqual(ends[i], ends[i - 1]);
});

test('a single point gives just a move', () => {
  assert.equal(buildRoutePath([{ x: 5, y: 5 }]), 'M5 5');
});

const line = sampleTable((l) => ({ x: 10, y: l }), 100, 10);

test('sampleTable samples to the exact end', () => {
  assert.equal(line.ls.at(-1), 100);
  assert.equal(line.ys.at(-1), 100);
});

test('lengthAtY interpolates and clamps', () => {
  assert.equal(lengthAtY(line, -5), 0);
  assert.equal(lengthAtY(line, 35), 35);
  assert.equal(lengthAtY(line, 500), 100);
});

test('pointAtLength interpolates', () => {
  assert.deepEqual(pointAtLength(line, 42), { x: 10, y: 42 });
  assert.deepEqual(pointAtLength(line, 1e6), { x: 10, y: 100 });
});

// Sampling the route in JS (instead of thousands of getPointAtLength calls, which
// blocked the main thread for seconds on load) must match the real geometry.
test('segments render to the same path string as buildRoutePath', () => {
  const opts = { minX: 8, maxX: 1272 };
  assert.equal(segmentsToD(routeSegments(pts, opts)), buildRoutePath(pts, opts));
});

test('a straight segment samples to its exact length', () => {
  const t = sampleSegments(routeSegments([{ x: 10, y: 0 }, { x: 10, y: 50 }], { wiggle: 0, step: 1000 }));
  assert.equal(t.ls.at(-1), 50);
  assert.deepEqual(pointAtLength(t, 20), { x: 10, y: 20 });
});

test('curve lengths match a fine numeric reference to within 0.3%', () => {
  const segs = routeSegments(pts, { minX: 8, maxX: 1272 });
  const fine = (() => {
    let len = 0, prev = null;
    for (const s of segs) {
      const p = s.p;
      if (s.c === 'M') { prev = [p[0], p[1]]; continue; }
      for (let i = 1; i <= 20000; i++) {
        const t = i / 20000, u = 1 - t;
        let x, y;
        if (s.c === 'L') { x = prev[0] + (p[0] - prev[0]) * t; y = prev[1] + (p[1] - prev[1]) * t; }
        if (s.c === 'Q') { x = u * u * prev[0] + 2 * u * t * p[0] + t * t * p[2]; y = u * u * prev[1] + 2 * u * t * p[1] + t * t * p[3]; }
        if (s.c === 'C') { x = u ** 3 * prev[0] + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t ** 3 * p[4]; y = u ** 3 * prev[1] + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t ** 3 * p[5]; }
        const [px, py] = i === 1 ? prev : fine.last;
        len += Math.hypot(x - px, y - py);
        fine.last = [x, y];
      }
      prev = [p.at(-2), p.at(-1)];
    }
    return len;
  });
  fine.last = null;
  const ref = fine();
  const got = sampleSegments(segs).ls.at(-1);
  assert.ok(Math.abs(got - ref) / ref < 0.003, `got ${got}, ref ${ref}`);
});

test('the sampled table passes through every checkpoint and y never goes backwards', () => {
  const t = sampleSegments(routeSegments(pts, { minX: 8, maxX: 1272 }));
  for (const p of pts) {
    const at = pointAtLength(t, lengthAtY(t, p.y));
    assert.ok(Math.hypot(at.x - p.x, at.y - p.y) < 1, `missed ${p.x},${p.y}`);
  }
  for (let i = 1; i < t.ys.length; i++) assert.ok(t.ys[i] >= t.ys[i - 1] - 1e-9);
});

test('sampling a long route is fast (no DOM, no seconds-long tasks)', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ x: i % 2 ? 1000 : 200, y: i * 400 }));
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) sampleSegments(routeSegments(many, { minX: 8, maxX: 1272 }));
  assert.ok((performance.now() - t0) / 10 < 15, 'one sample pass should take well under 15 ms');
});
