// Pure geometry for the route line. No DOM here, so it runs under node --test.

const r = (n) => Math.round(n * 10) / 10;

// The route runs straight-ish down a rail (with a gentle wiggle), and only swaps
// sides in the last `cross` px above the next point, where sections have empty
// top padding. Control points keep y between segment ends, so y is monotonic.
export function buildRoutePath(points, { cross = 140, wiggle = 10, step = 120, minX = 0, maxX = Infinity } = {}) {
  if (!points.length) return '';
  const clampX = (x) => Math.min(maxX, Math.max(minX, x));
  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = b.y - a.y;
    if (dy <= 0) { d += ` L${r(b.x)} ${r(b.y)}`; continue; }
    const sameRail = Math.abs(a.x - b.x) < 0.5;
    const c = sameRail ? 0 : Math.min(cross, dy);
    const runEnd = b.y - c;
    let y = a.y;
    let k = 0;
    while (runEnd - y > step * 0.5) {
      const ny = Math.min(y + step, runEnd);
      const side = k % 2 ? 1 : -1;
      d += ` Q${r(clampX(a.x + side * wiggle * 2))} ${r((y + ny) / 2)} ${r(a.x)} ${r(ny)}`;
      y = ny;
      k++;
    }
    if (y < runEnd) { d += ` L${r(a.x)} ${r(runEnd)}`; y = runEnd; }
    if (!sameRail) d += ` C${r(a.x)} ${r(runEnd + c / 2)} ${r(b.x)} ${r(b.y - c / 2)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}

export function sampleTable(getPoint, total, step = 6) {
  const ls = [], xs = [], ys = [];
  for (let l = 0; ; l = Math.min(l + step, total)) {
    const p = getPoint(l);
    ls.push(l); xs.push(p.x); ys.push(p.y);
    if (l >= total) break;
  }
  return { ls, xs, ys };
}

function search(arr, v) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arr[mid] <= v) lo = mid; else hi = mid - 1;
  }
  return lo;
}

export function lengthAtY({ ls, ys }, y) {
  if (y <= ys[0]) return 0;
  if (y >= ys.at(-1)) return ls.at(-1);
  const i = search(ys, y);
  const span = ys[i + 1] - ys[i];
  const t = span > 0 ? (y - ys[i]) / span : 0;
  return ls[i] + t * (ls[i + 1] - ls[i]);
}

export function pointAtLength({ ls, xs, ys }, len) {
  if (len <= 0) return { x: xs[0], y: ys[0] };
  if (len >= ls.at(-1)) return { x: xs.at(-1), y: ys.at(-1) };
  const i = search(ls, len);
  const t = (len - ls[i]) / (ls[i + 1] - ls[i]);
  return { x: xs[i] + t * (xs[i + 1] - xs[i]), y: ys[i] + t * (ys[i + 1] - ys[i]) };
}
