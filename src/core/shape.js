// 鼻くその形状を seed から手続き生成する。
//
// 円周上の半径を、ランダムな位相・周波数のサイン波を重ねてゆらす。
// これで「ぼこぼこした閉曲線」が seed ごとに一意に決まる。
// 画像アセットが要らないのと、未所持でもシルエットが描けるのが利点。

import { mulberry32, TAU, clamp } from './util.js';

const cache = new Map();

/** entry -> 正規化された頂点列（最大半径が 1 になるようスケール済み） */
export function boogerPoints(entry) {
  const key = entry.id;
  if (cache.has(key)) return cache.get(key);

  const rng = mulberry32(entry.seed);
  const spike = entry.spike ?? 0;
  const stretch = entry.stretch ?? 0;
  const N = 72;

  // 3本のサイン波を重ねる。
  // 振幅を欲張るとヒトデになるので、合計が半径の 3割を超えないように抑える。
  const layers = [];
  for (let i = 0; i < 3; i++) {
    layers.push({
      f: 2 + Math.floor(rng() * 3),   // 高い周波数を許すとローブが増えてヒトデになる
      a: 0.3 + rng() * 0.7,
      p: rng() * TAU,
    });
  }
  const norm = layers.reduce((s, L) => s + L.a, 0);
  const spikeF = 5 + Math.floor(rng() * 5);

  const pts = [];
  let max = 0;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    let r = 1;
    for (const L of layers) r += Math.sin(a * L.f + L.p) * (L.a / norm) * 0.22;
    if (spike > 0) r += Math.pow(Math.abs(Math.sin(a * spikeF * 0.5 + 0.7)), 3) * spike * 0.4;
    r = Math.max(0.35, r);
    const x = Math.cos(a) * r * (1 + stretch * 0.85);
    const y = Math.sin(a) * r * (1 - stretch * 0.3);
    max = Math.max(max, Math.hypot(x, y));
    pts.push([x, y]);
  }
  for (const p of pts) { p[0] /= max; p[1] /= max; }

  cache.set(key, pts);
  return pts;
}

/** 頂点列を滑らかな閉パスにして ctx に積む（中点を通る二次ベジェ） */
export function tracePath(ctx, pts, x, y, r, rot = 0, squash = 1) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = pts.map(([px, py]) => {
    const sx = px * r, sy = py * r * squash;
    return [x + sx * c - sy * s, y + sx * s + sy * c];
  });
  ctx.beginPath();
  const n = P.length;
  let mx = (P[n - 1][0] + P[0][0]) / 2, my = (P[n - 1][1] + P[0][1]) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const cur = P[i], nxt = P[(i + 1) % n];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
  }
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r|0},${g|0},${b|0})`;
}

/** 鼻くそ本体を描く */
export function drawBooger(ctx, entry, x, y, r, rot = 0, squash = 1) {
  // 半径が負だと createRadialGradient が IndexSizeError を投げてループごと止まる。
  // easeOutBack のような行き過ぎるイージングは開始直後に負を返すので、
  // 呼び出し側に注意を強いるより、ここで吸収する。
  if (!(r > 0)) return;
  const pts = boogerPoints(entry);
  ctx.save();

  tracePath(ctx, pts, x, y, r, rot, squash);

  const g = ctx.createRadialGradient(x - r * .32, y - r * .38, r * .06, x, y, r * 1.15);
  g.addColorStop(0, shade(entry.color, 62));
  g.addColorStop(.55, entry.color);
  g.addColorStop(1, shade(entry.color, -58));
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = r * .3;
  ctx.shadowOffsetY = r * .1;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1.2, r * .045);
  ctx.strokeStyle = shade(entry.color, -80);
  ctx.stroke();

  // てかり
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = .5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x - r * .34, y - r * .4, r * .22, r * .13, -0.7, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = .22;
  ctx.beginPath();
  ctx.ellipse(x + r * .2, y + r * .36, r * .3, r * .1, 0.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** 未所持のシルエット。形は同じ seed から出るので、実物と必ず一致する。 */
export function drawSilhouette(ctx, entry, x, y, r) {
  const pts = boogerPoints(entry);
  ctx.save();
  tracePath(ctx, pts, x, y, r);
  ctx.fillStyle = '#191013';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2e1e26';
  ctx.stroke();
  ctx.restore();
}
