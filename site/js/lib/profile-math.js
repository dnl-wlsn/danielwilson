// Pure maths for the running scene. points: [km, ele_m, t_s|null, climb_m][]

const r = (n) => Math.round(n * 10) / 10;

export function makeScale(points, W, H, pad) {
  const maxKm = points.at(-1)[0] || 1;
  let lo = Infinity, hi = -Infinity;
  for (const p of points) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  const span = Math.max(hi - lo, 1);
  return {
    x: (km) => pad + (km / maxKm) * (W - 2 * pad),
    y: (ele) => H - pad - ((ele - lo) / span) * (H - 2 * pad),
  };
}

export function profileD(points, scale, H, closed) {
  let d = points.map((p, i) => `${i ? 'L' : 'M'}${r(scale.x(p[0]))} ${r(scale.y(p[1]))}`).join(' ');
  if (closed) d += ` L${r(scale.x(points.at(-1)[0]))} ${H} L${r(scale.x(points[0][0]))} ${H} Z`;
  return d;
}

export function sampleAt(points, km) {
  const first = points[0], last = points.at(-1);
  const pack = (p) => ({ km: p[0], ele: p[1], t: p[2], climb: p[3] });
  if (km <= first[0]) return pack(first);
  if (km >= last[0]) return pack(last);
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid][0] <= km) lo = mid; else hi = mid; }
  const a = points[lo], b = points[hi];
  const f = (km - a[0]) / (b[0] - a[0]);
  const lerp = (i) => a[i] + f * (b[i] - a[i]);
  return {
    km,
    ele: r(lerp(1)),
    t: a[2] == null || b[2] == null ? null : Math.round(lerp(2)),
    climb: Math.round(lerp(3)),
  };
}

export function gradientAt(points, km, span = 0.2) {
  const a = sampleAt(points, km);
  const b = sampleAt(points, km + span);
  const run = (b.km - a.km) * 1000;
  return run > 0 ? Math.round(((b.ele - a.ele) / run) * 1000) / 1000 : 0;
}

export function formatTime(s) {
  if (s == null) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// One decimal place, halves rounded up. (52.15).toFixed(1) gives "52.1" because
// 52.15 is stored as 52.1499..., which would undersell the distance.
export function formatKm(km) {
  return (Math.round((km + Number.EPSILON) * 10) / 10).toFixed(1);
}
