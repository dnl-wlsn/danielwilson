// Pure geometry for the route line. No DOM here, so it runs under node --test.

const r = (n) => Math.round(n * 10) / 10;

// The route runs straight-ish down a rail (with a gentle wiggle), and only swaps
// sides in the last `cross` px above the next point, where sections have empty
// top padding. Control points keep y between segment ends, so y is monotonic.
// Returns segments ({ c: 'M'|'L'|'Q'|'C', p: [numbers] }) so the same geometry
// can be drawn (segmentsToD) and measured in JS (sampleSegments).
export function routeSegments(points, { cross = 140, wiggle = 10, step = 120, minX = 0, maxX = Infinity } = {}) {
  if (!points.length) return [];
  const clampX = (x) => Math.min(maxX, Math.max(minX, x));
  const segs = [{ c: 'M', p: [r(points[0].x), r(points[0].y)] }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = b.y - a.y;
    if (dy <= 0) { segs.push({ c: 'L', p: [r(b.x), r(b.y)] }); continue; }
    const sameRail = Math.abs(a.x - b.x) < 0.5;
    const c = sameRail ? 0 : Math.min(cross, dy);
    const runEnd = b.y - c;
    let y = a.y;
    let k = 0;
    while (runEnd - y > step * 0.5) {
      const ny = Math.min(y + step, runEnd);
      const side = k % 2 ? 1 : -1;
      segs.push({ c: 'Q', p: [r(clampX(a.x + side * wiggle * 2)), r((y + ny) / 2), r(a.x), r(ny)] });
      y = ny;
      k++;
    }
    if (y < runEnd) { segs.push({ c: 'L', p: [r(a.x), r(runEnd)] }); y = runEnd; }
    if (!sameRail) segs.push({ c: 'C', p: [r(a.x), r(runEnd + c / 2), r(b.x), r(b.y - c / 2), r(b.x), r(b.y)] });
  }
  return segs;
}

export function segmentsToD(segs) {
  return segs.map((s) => {
    const n = s.p;
    if (s.c === 'M' || s.c === 'L') return `${s.c}${n[0]} ${n[1]}`;
    return `${s.c}${n.map((v, i) => (i % 2 ? ` ${v}` : (i ? ` ${v}` : v))).join('')}`;
  }).join(' ');
}

export function buildRoutePath(points, opts) {
  return segmentsToD(routeSegments(points, opts));
}

// Flattens the segments into a dense polyline (pieces of about `piece` px) and
// returns the same { ls, xs, ys } table as sampleTable, without touching the DOM.
// getPointAtLength is O(path) per call, so sampling through the browser cost
// seconds of main-thread time on load and froze the intro animation.
export function sampleSegments(segs, piece = 4) {
  const ls = [], xs = [], ys = [];
  if (!segs.length) return { ls, xs, ys };
  let [x0, y0] = segs[0].p;
  let len = 0;
  ls.push(0); xs.push(x0); ys.push(y0);
  const push = (x, y) => {
    len += Math.hypot(x - x0, y - y0);
    ls.push(len); xs.push(x); ys.push(y);
    x0 = x; y0 = y;
  };
  for (const s of segs.slice(1)) {
    const p = s.p;
    if (s.c === 'L' || s.c === 'M') { push(p[0], p[1]); continue; }
    const sx = x0, sy = y0;
    const hull = s.c === 'Q'
      ? Math.hypot(p[0] - sx, p[1] - sy) + Math.hypot(p[2] - p[0], p[3] - p[1])
      : Math.hypot(p[0] - sx, p[1] - sy) + Math.hypot(p[2] - p[0], p[3] - p[1]) + Math.hypot(p[4] - p[2], p[5] - p[3]);
    const n = Math.max(8, Math.ceil(hull / piece));
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      if (s.c === 'Q') push(u * u * sx + 2 * u * t * p[0] + t * t * p[2], u * u * sy + 2 * u * t * p[1] + t * t * p[3]);
      else push(
        u * u * u * sx + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4],
        u * u * u * sy + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5],
      );
    }
  }
  return { ls, xs, ys };
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
