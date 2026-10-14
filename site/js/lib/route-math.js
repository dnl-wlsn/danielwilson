// Pure geometry for the route line. No DOM here, so it runs under node --test.

const r = (n) => Math.round(n * 10) / 10;

// The route runs down a rail with a gentle wiggle, and only swaps sides in the
// last `cross` px above the next point, where sections have empty top padding.
// It's drawn as ONE smooth curve: a monotone cubic spline of x as a function
// of y (Fritsch-Carlson) through the waypoints, so there are no corners at the
// joins, x never overshoots between waypoints, and y only ever increases.
// Returns segments ({ c: 'M'|'C', p: [numbers] }) so the same geometry can be
// drawn (segmentsToD) and measured in JS (sampleSegments).
export function routeSegments(points, { cross = 140, wiggle = 10, step = 120, minX = 0, maxX = Infinity } = {}) {
  if (!points.length) return [];
  const clampX = (x) => Math.min(maxX, Math.max(minX, x));

  // 1. Waypoints: every checkpoint, wiggle crests along each rail, and the
  //    point where the line leaves its rail to cross to the next one.
  const way = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = { x: points[i].x, y: Math.max(points[i].y, way.at(-1).y + 1) };
    const sameRail = Math.abs(a.x - b.x) < 0.5;
    const c = sameRail ? 0 : Math.min(cross, b.y - a.y);
    const runEnd = b.y - c;
    let y = a.y;
    let k = 0;
    // Wiggle only on runs that stay on one rail. Before a crossing the last
    // wiggle would swing the wrong way and put a hook right before the swoop.
    while (sameRail && runEnd - y > step * 0.5) {
      const ny = Math.min(y + step, runEnd);
      way.push({ x: clampX(a.x + (k % 2 ? 1 : -1) * wiggle), y: (y + ny) / 2 });
      y = ny;
      k++;
    }
    if (!sameRail && runEnd - way.at(-1).y > 20) way.push({ x: a.x, y: runEnd, leave: true });
    way.push(sameRail ? b : { ...b, arrive: true });
  }

  // 2. Fritsch-Carlson slopes (dx/dy). Zero at the ends and at every turning
  //    point, so the line leaves and meets each rail running straight down.
  const n = way.length;
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(way[i + 1].y - way[i].y);
    d.push((way[i + 1].x - way[i].x) / h[i]);
  }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }

  // 3. Each span as a cubic Bezier: the control points sit a third of the way
  //    along the span in y, so y is monotonic and tangents match at joins.
  //    A crossing (rail to rail, vertical at both ends) uses half-height
  //    handles, which rounds the swoop into an even S instead of two elbows.
  const segs = [{ c: 'M', p: [r(way[0].x), r(way[0].y)] }];
  for (let i = 0; i < n - 1; i++) {
    const p0 = way[i], p1 = way[i + 1];
    const t = p0.leave && p1.arrive ? h[i] / 2 : h[i] / 3;
    segs.push({ c: 'C', p: [r(p0.x + m[i] * t), r(p0.y + t), r(p1.x - m[i + 1] * t), r(p1.y - t), r(p1.x), r(p1.y)] });
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

// Bug 3 (v3): a glitch in the route. Replaces the curve between two
// checkpoints (both are segment ends) with a zigzag of straight legs that
// follows the curve, swinging `size * amp` px either side of it. At amp 0 the
// legs lie on the curve, so tweening amp to 0 and then swapping the real
// curve back in is seamless.
export function glitchSegments(segs, from, to, amp, { size = 16, step = 25 } = {}) {
  const at = (s, p) => s.c !== 'M' && Math.abs(s.p.at(-2) - p.x) < 0.5 && Math.abs(s.p.at(-1) - p.y) < 0.5;
  const i = segs.findIndex((s) => at(s, from));
  const j = segs.findIndex((s, k) => k > i && at(s, to));
  if (i < 0 || j < 0) return segs;
  const a = { x: segs[i].p.at(-2), y: segs[i].p.at(-1) };
  const b = { x: segs[j].p.at(-2), y: segs[j].p.at(-1) };
  const curve = sampleSegments([{ c: 'M', p: [a.x, a.y] }, ...segs.slice(i + 1, j + 1)]);
  const n = Math.max(2, Math.round((b.y - a.y) / step));
  const legs = [];
  for (let k = 1; k <= n; k++) {
    const y = a.y + ((b.y - a.y) * k) / n;
    const x = k === n ? b.x : pointAtLength(curve, lengthAtY(curve, y)).x + (k % 2 ? 1 : -1) * size * amp;
    legs.push({ c: 'L', p: [r(x), r(y)] });
  }
  return [...segs.slice(0, i + 1), ...legs, ...segs.slice(j + 1)];
}
