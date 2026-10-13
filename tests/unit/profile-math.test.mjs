import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale, profileD, sampleAt, gradientAt, formatTime, formatKm } from '../../site/js/lib/profile-math.js';

const pts = [[0, 100, 0, 0], [1, 200, 600, 100], [2, 150, 1200, 100], [4, 350, 2400, 300]];

test('scale maps the first and last km to the padded edges', () => {
  const s = makeScale(pts, 1000, 300, 20);
  assert.equal(s.x(0), 20);
  assert.equal(s.x(4), 980);
  assert.equal(s.y(100), 280);
  assert.equal(s.y(350), 20);
});

test('flat profiles do not divide by zero', () => {
  const s = makeScale([[0, 50, 0, 0], [1, 50, 60, 0]], 100, 100, 10);
  assert.ok(Number.isFinite(s.y(50)));
});

test('profileD draws an open line or a closed area', () => {
  const s = makeScale(pts, 1000, 300, 20);
  const open = profileD(pts, s, 300, false);
  assert.match(open, /^M20 280 L260 /);
  assert.ok(!open.includes('Z'));
  assert.match(profileD(pts, s, 300, true), / L980 300 L20 300 Z$/);
});

test('sampleAt interpolates every field and clamps', () => {
  assert.deepEqual(sampleAt(pts, 0.5), { km: 0.5, ele: 150, t: 300, climb: 50 });
  assert.deepEqual(sampleAt(pts, 3), { km: 3, ele: 250, t: 1800, climb: 200 });
  assert.deepEqual(sampleAt(pts, -1), { km: 0, ele: 100, t: 0, climb: 0 });
  assert.deepEqual(sampleAt(pts, 99), { km: 4, ele: 350, t: 2400, climb: 300 });
});

test('sampleAt keeps a missing time as null', () => {
  assert.equal(sampleAt([[0, 1, null, 0], [1, 2, null, 1]], 0.5).t, null);
});

test('gradientAt is rise over run in metres', () => {
  assert.equal(gradientAt(pts, 0, 0.5), 0.1);
  assert.equal(gradientAt(pts, 1, 0.5), -0.05);
  assert.equal(gradientAt(pts, 4, 0.5), 0);
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00:00');
  assert.equal(formatTime(27125), '7:32:05');
  assert.equal(formatTime(null), '');
});

test('formatKm rounds halves up, unlike toFixed on binary floats', () => {
  assert.equal(formatKm(52.15), '52.2');
  assert.equal(formatKm(0), '0.0');
  assert.equal(formatKm(10.04), '10.0');
});
