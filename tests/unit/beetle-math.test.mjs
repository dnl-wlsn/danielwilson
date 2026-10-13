import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beetleAt } from '../../site/js/lib/beetle-math.js';

test('the beetle stays inside its box', () => {
  for (let t = 0; t < 200; t += 0.1) {
    const p = beetleAt(t, 800, 300);
    assert.ok(p.x >= -0.001 && p.x <= 800.001, `x ${p.x} at ${t}`);
    assert.ok(p.y >= -0.001 && p.y <= 300.001, `y ${p.y} at ${t}`);
  }
});

test('the beetle is slow enough to catch (under 140 px/s on a wide screen)', () => {
  let worst = 0;
  for (let t = 0; t < 200; t += 0.05) {
    const a = beetleAt(t, 1200, 600), b = beetleAt(t + 0.05, 1200, 600);
    worst = Math.max(worst, Math.hypot(b.x - a.x, b.y - a.y) / 0.05);
  }
  assert.ok(worst < 140, `top speed ${worst.toFixed(1)} px/s`);
});

test('the beetle never stops dead (always faces where it is going)', () => {
  for (let t = 0; t < 200; t += 0.05) {
    const a = beetleAt(t, 800, 300), b = beetleAt(t + 0.05, 800, 300);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 0.01, `stalled at ${t}`);
  }
});
