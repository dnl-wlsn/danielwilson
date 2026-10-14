// Bug hunt progress, as plain data. No DOM here, so it can be unit tested.
export const STORAGE_KEY = 'dw-bugs-v1';
// The hunt is opt-in: 'on' only after the visitor presses Play.
export const HUNT_KEY = 'dw-hunt-v1';

// Whatever is in storage, keep only known ids, once each, in saved order.
export function parseSaved(raw, ids) {
  if (!raw) return [];
  let list;
  try { list = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((x) => typeof x === 'string' && ids.includes(x)))];
}

export const serialize = (found) => JSON.stringify([...found]);

export const nextUnfound = (ordered, found) => ordered.find((id) => !found.has(id)) ?? null;

export function announceText(n, total, note) {
  const head = n === total
    ? `Bug fixed. That is all ${total}. Your prize is at the bottom of the page.`
    : `Bug fixed, ${n} of ${total}.`;
  return `${head} ${note}`;
}
