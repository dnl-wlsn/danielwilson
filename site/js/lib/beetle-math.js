// The beetle's walk: a slow figure-of-eight (a 3:2 Lissajous curve) filling a
// w × h box. One full loop takes P seconds. The curve's speed is never zero,
// so the beetle always faces where it's going.
const P = 90;

export function beetleAt(t, w, h) {
  const k = (2 * Math.PI) / P;
  const x = (w / 2) * (1 + Math.sin(3 * k * t + Math.PI / 2));
  const y = (h / 2) * (1 + Math.sin(2 * k * t));
  const dx = (w / 2) * 3 * k * Math.cos(3 * k * t + Math.PI / 2);
  const dy = (h / 2) * 2 * k * Math.cos(2 * k * t);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90 };
}
