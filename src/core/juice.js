// 手応え。このゲームの本体。
//
// ほじりのメカニクスは「穴に指を入れて2.5秒待って離す」しかなく、
// ゲージ速度はグリグリと無関係（企画の指定）。つまり面白さを支えているのは
// 抽選の引きと、ここにある演出だけ。仕上げの磨きではなく機能。

import { W, H, CFG } from '../config.js';
import { clamp, easeOut, TAU } from './util.js';

export const juice = {
  timeScale: 1,   // ヒットストップ中は 0
  sx: 0, sy: 0,   // 画面揺れのオフセット（#world の transform に混ぜる）
};

let shakePow = 0, shakeT = 0, shakeDur = 0;
let stopT = 0;
let flashA = 0, flashCol = '#fff', flashDur = .12;
let popups = [];
let parts = [];

// アイリスアウト
let iris = { on: false, x: W / 2, y: H / 2, r: 900, target: 900, speed: 6, hold: 0 };

export function shake(power, dur = .3) {
  shakePow = Math.max(shakePow, power);
  shakeDur = Math.max(shakeDur, dur);
  shakeT = shakeDur;
}

/** 時間を止める。ゲームの dt にだけ効き、演出の更新は実時間で回り続ける */
export function hitstop(dur = .08) { stopT = Math.max(stopT, dur); }

export function flash(col = '#fff', a = .7, dur = .12) {
  flashCol = col; flashA = a; flashDur = dur;
}

export function popup(x, y, text, col = '#ffd97a', size = 34) {
  popups.push({ x, y, text, col, size, t: 0, life: 1.1, vy: -70 });
}

export function burst(x, y, col, n = 14, spd = 240) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = spd * (.35 + Math.random() * .8);
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      r: 3 + Math.random() * 7, col, t: 0, life: .5 + Math.random() * .5,
    });
  }
}

export function irisOut(x, y, r = 150) {
  iris.on = true; iris.x = x; iris.y = y; iris.r = 1100; iris.target = r; iris.speed = 7;
}
export function irisIn() { iris.target = 1100; iris.speed = 5; }
export function irisOff() { iris.on = false; iris.r = 1100; iris.target = 1100; }
export const irisRadius = () => iris.r;
export const irisDone = () => Math.abs(iris.r - iris.target) < 6;

/** dt は実時間（ヒットストップの影響を受けない） */
export function updateJuice(dt) {
  // ヒットストップ
  if (stopT > 0) { stopT -= dt; juice.timeScale = 0; }
  else juice.timeScale = 1;

  // 画面揺れ
  if (shakeT > 0) {
    shakeT -= dt;
    const k = clamp(shakeT / shakeDur, 0, 1);
    const p = shakePow * k * k;
    juice.sx = (Math.random() * 2 - 1) * p;
    juice.sy = (Math.random() * 2 - 1) * p;
    if (shakeT <= 0) { shakePow = 0; juice.sx = juice.sy = 0; }
  } else { juice.sx = juice.sy = 0; }

  if (flashA > 0) flashA = Math.max(0, flashA - dt / flashDur);

  if (iris.on) iris.r += (iris.target - iris.r) * Math.min(1, dt * iris.speed);

  for (const p of popups) { p.t += dt; p.y += p.vy * dt; p.vy += 90 * dt; }
  popups = popups.filter(p => p.t < p.life);

  for (const p of parts) {
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 900 * dt; p.vx *= .99;
  }
  parts = parts.filter(p => p.t < p.life);
}

/** 最前面の fx キャンバスに描く。#world の外なので画面揺れの影響を受けない */
export function renderFx(ctx) {
  ctx.clearRect(0, 0, W, H);

  // パーティクル
  for (const p of parts) {
    const k = 1 - p.t / p.life;
    ctx.globalAlpha = clamp(k * 1.6, 0, 1);
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (.4 + k * .6), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // アイリス（黒地に穴）
  if (iris.on && iris.r < 1099) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(iris.x, iris.y, Math.max(0, iris.r), 0, TAU, true);
    ctx.fillStyle = 'rgba(4,2,3,.93)';
    ctx.fill('evenodd');
    ctx.restore();
  }

  // フラッシュ
  if (flashA > 0) {
    ctx.globalAlpha = flashA;
    ctx.fillStyle = flashCol;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // ポップアップ
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif';
  for (const p of popups) {
    const k = p.t / p.life;
    ctx.globalAlpha = k < .1 ? k / .1 : clamp((1 - k) * 2.4, 0, 1);
    ctx.font = `900 ${p.size}px system-ui, sans-serif`;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.col;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

/** 後光。初登場の鼻くその後ろで回る */
export function drawRays(ctx, x, y, t, r = 700, col = 'rgba(255,220,120,') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * .5);
  const n = 16;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    const a0 = i / n * TAU, a1 = a0 + TAU / n * .5;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0, a1);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, col + '0)');
    g.addColorStop(.35, col + '.5)');
    g.addColorStop(1, col + '0)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

/** レア度ぶんの星 */
export function drawStar(ctx, x, y, r, col, rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * .44 : r;
    const a = i / 10 * TAU - Math.PI / 2;
    i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.stroke();
  ctx.restore();
}
