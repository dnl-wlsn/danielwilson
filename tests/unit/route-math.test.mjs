import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutePath, sampleTable, lengthAtY, pointAtLength } from '../../site/js/lib/route-math.js';

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
