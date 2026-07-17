export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp  = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
export const TAU = Math.PI * 2;

/** seed から決定的な乱数を作る。鼻くその形状がセッションをまたいで変わらないために必要。 */
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** [{...}, weight] の配列から重み付き抽選 */
export function weightedPick(items, weightOf, rng = Math.random) {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = rng() * total;
  for (const it of items) { r -= weightOf(it); if (r <= 0) return it; }
  return items[items.length - 1];
}

export const fmt = n => Math.floor(n).toLocaleString('ja-JP');

/** 飛距離の表示。1000m を超えたら km にする（宇宙まで飛ぶので） */
export function fmtDist(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + 'km';
  return m.toFixed(1) + 'm';
}
