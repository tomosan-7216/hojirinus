// 鼻ほじりシーン（ベースゾーン）
//
// メカニクスは「穴に指を入れて2.5秒待って離す」しかない。
// ゲージ速度はグリグリと無関係（企画の指定：慣れたプレイヤーのテンポを優先）。
// つまり面白さは抽選の引きと演出だけで支えている。だから演出に全部を賭ける。
//
// グリグリは損得ゼロだが、やった方が気持ちいいを担保する：
// グリグリ量が 鼻の歪み / 画面揺れ / 音の太さ / 飛び出す勢い に乗る。
// 報酬を付けると企画のテンポ判断を壊すので、快感側だけで解決する。

import { W, H, CFG } from '../config.js';
import { Input, buzz } from '../core/input.js';
import { clamp, lerp, easeOut, easeOutBack, TAU } from '../core/util.js';
import { drawBooger } from '../core/shape.js';
import {
  shake, hitstop, flash, popup, burst,
  irisOut, irisIn, irisOff, drawRays, drawStar,
} from '../core/juice.js';
import {
  sfxPon, sfxWhiff, grindStart, grindSet, grindStop,
  sfxFanfare, sfxStar, sfxCoin,
} from '../core/audio.js';
import { roll, gain, milestone, S } from '../state.js';
import { RARITY_COLOR, RARITY_STARS } from '../data/boogers.js';

const N = CFG.nose;
const SKIN = '#e8a882', SKIN_D = '#c2795a', SKIN_L = '#f6c9a8';

// 穴の中の暗さ。1.0 にすると指が完全に消える。
// 消し切る手前で止めてあるのは、輪郭がうっすら残ったほうが
// 「奥に入っている」ように見えて、ただの切り抜きに見えないため。
const HOLE_DARK = 0.94;

export const pickScene = {
  name: 'pick',
  locked: false,
  cv: null, ctx: null,
};

let state = 'idle';      // idle | picking | whiff | reveal
let t = 0;               // 状態内の経過時間
let gauge = 0;
let side = 0;            // -1 左の穴 / +1 右の穴
let grindV = 0, grindAcc = 0, grindAmt = 0;
let fx = 0, fy = 0;      // 描画上の指先
let hintT = 0;
let anim = 0;
let prevDown = false;

// リビール
let entry = null, isNew = false, gotCoin = 0;
let bx = 0, by = 0, bvx = 0, bvy = 0, bScale = 0, bRot = 0;
let starN = 0, starShown = 0;

pickScene.init = function () {
  pickScene.cv = document.querySelector('#cv-pick');
  pickScene.ctx = pickScene.cv.getContext('2d');
  fx = W / 2; fy = 420;
};

pickScene.enter = function () { state = 'idle'; gauge = 0; irisOff(); };
pickScene.exit  = function () { if (state === 'picking') abort(); };

function abort() {
  grindStop();
  state = 'idle'; gauge = 0; grindV = 0; grindAcc = 0;
  pickScene.locked = false;
}

/** 指先が鼻の穴に入っているか。判定は気持ち広めに取る（狙わせる遊びではないので） */
function nostrilAt(x, y) {
  for (const s of [-1, 1]) {
    const cx = N.cx + s * N.nostrilDX, cy = N.nostrilY;
    const dx = (x - cx) / (N.nostrilRX * 1.35);
    const dy = (y - cy) / (N.nostrilRY * 1.9);
    if (dx * dx + dy * dy <= 1) return s;
  }
  return 0;
}

const nostrilCX = () => N.cx + side * N.nostrilDX;

/** 穴に入っている深さ 0..1。開始条件と演出にだけ使い、抽選には影響させない */
function depth01() {
  return clamp((Input.y - (N.nostrilY - N.nostrilRY)) / N.depthMax, 0, 1);
}

pickScene.update = function (dt, isActive) {
  anim += dt;
  if (!isActive) { prevDown = Input.down; return; }
  hintT += dt;
  t += dt;

  // 押しっぱなしのまま穴に入ってきても始めない。押し直しを要求する。
  // これが無いと、タイトルをタップした指がそのまま穴の上にあった場合に
  // ほじりが暴発する
  const justDown = Input.down && !prevDown;
  prevDown = Input.down;

  if (state === 'idle') {
    fx = lerp(fx, Input.x, .45);
    fy = lerp(fy, Input.y, .45);

    if (justDown && nostrilAt(Input.x, Input.y)) {
      side = nostrilAt(Input.x, Input.y);
      state = 'picking';
      pickScene.locked = true;   // ほじり中はエッジ判定を止める（企画の要求）
      t = 0; gauge = 0; grindAcc = 0; grindV = 0;
      grindStart();
      buzz(12);
    }
  }

  else if (state === 'picking') {
    // ゲージはグリグリと無関係に一定速度で溜まる
    gauge = clamp(gauge + dt / CFG.gaugeTime, 0, 1);

    // グリグリ量を測る（演出にだけ使う）
    const mv = Math.hypot(Input.dx, Input.dy);
    grindV = lerp(grindV, clamp(mv / 14, 0, 1), .3);
    grindAcc += grindV * dt;
    grindAmt = clamp(grindAcc / (CFG.gaugeTime * .5), 0, 1);
    grindSet(grindV);

    // 勢いをつけてほじると画面が揺れる
    if (grindV > .28) shake(grindV * 8, .12);
    if (grindV > .75 && Math.random() < .25) buzz(8);

    // 指は穴に固定。ポインタとの差分ぶん、鼻のほうがゴムのように伸びる（企画の指定）。
    // 指を大きく動かすと穴から出てしまうので、追従は弱く・可動域は穴のサイズに収める。
    const ax = nostrilCX(), ay = N.nostrilY - 6 + depth01() * N.depthMax * .42;
    let tx = lerp(ax, Input.x, .16), ty = lerp(ay, Input.y, .1);
    const dx = tx - ax, dy = ty - ay;
    const lx = N.nostrilRX * .5, ly = N.nostrilRY * .7;
    const k = Math.hypot(dx / lx, dy / ly);
    if (k > 1) { tx = ax + dx / k; ty = ay + dy / k; }
    fx = lerp(fx, tx, .5); fy = lerp(fy, ty, .5);

    if (!Input.down) {
      grindStop();
      if (gauge >= 1) release();
      else { state = 'whiff'; t = 0; pickScene.locked = true; sfxWhiff(); }
    }
  }

  else if (state === 'whiff') {
    fx = lerp(fx, Input.x, .3); fy = lerp(fy, Input.y, .3);
    if (t > CFG.whiffTime) { state = 'idle'; gauge = 0; pickScene.locked = false; }
  }

  else if (state === 'reveal') {
    updateReveal(dt);
  }
};

/** 溜まりきってから離した。抽選して出す */
function release() {
  entry = roll();
  const r = gain(entry);
  isNew = r.isNew; gotCoin = r.coin;

  // グリグリしたぶんだけ、抜ける音が太くなり、飛び出す勢いが増す
  sfxPon(grindAmt);
  shake(10 + grindAmt * 22, .3);
  hitstop(.05 + grindAmt * .04);
  buzz([10, 30, 12]);

  bx = nostrilCX(); by = N.nostrilY;
  bvx = side * (40 + grindAmt * 90) + (Math.random() * 40 - 20);
  bvy = -(300 + grindAmt * 260);
  bScale = 0; bRot = 0;
  starN = RARITY_STARS[entry.rarity]; starShown = 0;

  burst(bx, by, entry.color, 10 + Math.round(grindAmt * 14), 200 + grindAmt * 200);
  state = 'reveal'; t = 0;
  pickScene.locked = true;

  if (isNew) {
    // 初登場：アイリスアウト → 後光 → レア度ぶんの星
    // アイリスの発火は updateReveal 側（ゲーム時間）で行う。
    // setTimeout にすると実時間で走ってしまい、ヒットストップやフレーム落ちとズレる。
    flash('#fff', .55, .16);
    sfxFanfare();
  } else {
    popup(bx, by - 40, `+${gotCoin}`, '#ffd97a', 36);
    sfxCoin();
  }
}

const revealDur = () => isNew ? 2.9 : .95;

function updateReveal(dt) {
  const sz = sizePx(entry.size);

  if (isNew) {
    // 中央へ吸い寄せて、でかく見せる
    const k = clamp(t / .55, 0, 1);
    bx = lerp(bx, W / 2, .12);
    by = lerp(by, 560, .12);
    bScale = easeOutBack(k) * 1;
    bRot += dt * .6;

    if (t > .32 && t - dt <= .32) irisOut(W / 2, 560, 330);

    // 星を1つずつ
    const want = clamp(Math.floor((t - .95) / .16), 0, starN);
    while (starShown < want) { sfxStar(starShown); starShown++; shake(5, .1); }

    if (t > revealDur() - .5 && t - dt <= revealDur() - .5) irisIn();
    if (t > revealDur()) {
      irisOff();
      popup(W / 2, 470, `+${gotCoin}`, '#ffd97a', 44);
      sfxCoin();
      state = 'idle'; gauge = 0; pickScene.locked = false;
    }
  } else {
    // 通常：ポンと飛び出して、ちょっと弧を描いて消える
    bvy += 900 * dt;
    bx += bvx * dt; by += bvy * dt;
    bRot += bvx * dt * .02;
    bScale = clamp(t / .12, 0, 1);
    if (t > revealDur()) { state = 'idle'; gauge = 0; pickScene.locked = false; }
  }
}

function sizePx(size) {
  return { 小: 26, 中: 38, 大: 52, 特大: 72, 伝説: 96 }[size];
}
/** 初登場のときの大きさ。ここは「見せ場」なので実サイズより大きく、でもサイズ差は残す */
function revealPx(size) {
  return { 小: 100, 中: 122, 大: 144, 特大: 168, 伝説: 196 }[size];
}

// ── 描画 ────────────────────────────────────────────

/** 穴のパス。指の位置から離れる向きに点を押して、穴が歪む。
    beginPath は呼ばない。呼び出し側で積み増せるようにしておく（クリップで要る）。 */
function addNostrilPath(ctx, cx, cy, rx, ry, push) {
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    let px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    if (push) {
      const dx = px - push.x, dy = py - push.y;
      const d = Math.hypot(dx, dy) || 1;
      const infl = Math.exp(-(d * d) / (2 * 52 * 52)) * push.p;
      px += dx / d * infl; py += dy / d * infl;
    }
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** 背景。肌色は鼻だけに使い、それ以外は水色で抜く。
    画面全部を肌色で埋めると、地味なうえに鼻がどこにあるのか分からなくなる。 */
function drawBg(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#8fe0f8'); bg.addColorStop(1, '#d6f4ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 鼻の後ろの光。視線を中央に寄せる
  const gl = ctx.createRadialGradient(N.cx, 640, 40, N.cx, 660, 520);
  gl.addColorStop(0, 'rgba(255,255,255,.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);

  // 集中線。ほじっている間だけ、グリグリの強さに応じて濃くなる
  const k = state === 'picking' ? .05 + grindV * .18 : .05;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = '#1d7fa5';
  ctx.lineWidth = 16;
  ctx.translate(N.cx, 660);
  for (let i = 0; i < 24; i++) {
    ctx.rotate(TAU / 24);
    ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(900, 0); ctx.stroke();
  }
  ctx.restore();
}

/** 鼻の変形。指はこれに乗らないので、穴のクリップを作るときも同じ変換をかける必要がある */
function noseTransform(ctx) {
  const wob = state === 'picking' ? Math.sin(anim * 26) * grindV * 2.5 : 0;
  ctx.translate(N.cx, N.cy);
  // グリグリすると鼻ごと引っぱられる
  if (state === 'picking') {
    ctx.translate((fx - nostrilCX()) * .22, (fy - N.nostrilY) * .12 + wob);
    ctx.rotate((fx - nostrilCX()) * .0004);
  }
  ctx.translate(-N.cx, -N.cy);
}

/** 両方の穴のパスを積む。指をクリップで抜くのにも使う */
function addHoles(ctx, grow = 0) {
  for (const s of [-1, 1]) {
    const cx = N.cx + s * N.nostrilDX;
    const active = state === 'picking' && s === side;
    const push = active ? { x: fx, y: fy, p: 16 + depth01() * 20 + grindV * 16 } : null;
    addNostrilPath(ctx, cx, N.nostrilY,
      N.nostrilRX * (active ? 1.08 : 1) + grow,
      N.nostrilRY * (active ? 1.12 : 1) + grow, push);
  }
}

function drawNose(ctx) {
  ctx.save();
  noseTransform(ctx);

  // 鼻すじ → 小鼻 → 鼻先
  const g = ctx.createLinearGradient(0, 320, 0, 820);
  g.addColorStop(0, SKIN_L); g.addColorStop(.6, SKIN); g.addColorStop(1, SKIN_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(N.cx - 46, 330);
  ctx.bezierCurveTo(N.cx - 66, 520, N.cx - 150, 590, N.cx - 168, 706);
  ctx.bezierCurveTo(N.cx - 186, 812, N.cx - 96, 838, N.cx, 838);
  ctx.bezierCurveTo(N.cx + 96, 838, N.cx + 186, 812, N.cx + 168, 706);
  ctx.bezierCurveTo(N.cx + 150, 590, N.cx + 66, 520, N.cx + 46, 330);
  ctx.closePath();
  ctx.fill();

  // 鼻先の球
  const tg = ctx.createRadialGradient(N.cx - 40, 640, 10, N.cx, 690, 150);
  tg.addColorStop(0, '#ffdcc0'); tg.addColorStop(.6, SKIN); tg.addColorStop(1, SKIN_D);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(N.cx, 692, 118, 104, 0, 0, TAU);
  ctx.fill();

  // 小鼻
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(N.cx + s * 118, 742, 62, 58, s * .3, 0, TAU);
    ctx.fillStyle = SKIN; ctx.fill();
    ctx.strokeStyle = 'rgba(150,80,60,.35)'; ctx.lineWidth = 3; ctx.stroke();
  }

  // 穴
  ctx.beginPath(); addHoles(ctx, 5);
  ctx.fillStyle = 'rgba(150,72,58,.55)'; ctx.fill();

  // 穴そのものも深くする。ここが明るいと、上から被せる暗幕がいくら濃くても
  // 指のシルエットが浮いてしまう
  ctx.beginPath(); addHoles(ctx, 0);
  const hg = ctx.createRadialGradient(N.cx, N.nostrilY - 8, 2, N.cx, N.nostrilY, 130);
  hg.addColorStop(0, '#0d0204'); hg.addColorStop(1, '#2e0a0e');
  ctx.fillStyle = hg; ctx.fill();

  // てかり
  ctx.globalAlpha = .5;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(N.cx - 44, 646, 26, 16, -.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = .22;
  ctx.beginPath(); ctx.ellipse(N.cx + 8, 400, 14, 62, .06, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * 指を穴に「入れる」。
 * 指をそのまま鼻の上に描くと、穴の手前に指が乗っているようにしか見えない。
 * 穴の内と外でクリップを分け、内側は暗く落とす。これで指先が穴に吸い込まれて見える。
 * クリップ用の穴のパスは、鼻と同じ変換をかけてから積む必要がある（指は鼻と一緒に動かないため）。
 */
function drawFingerInNose(ctx, x, y) {
  // 穴の外側：普通に描く
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.save(); noseTransform(ctx); addHoles(ctx, 0); ctx.restore();
  ctx.clip('evenodd');
  drawFinger(ctx, x, y);
  ctx.restore();

  // 穴の内側：同じ指を、鼻の中の暗がりに沈めて描く
  ctx.save();
  ctx.beginPath();
  ctx.save(); noseTransform(ctx); addHoles(ctx, 0); ctx.restore();
  ctx.clip();
  drawFinger(ctx, x, y);
  ctx.fillStyle = `rgba(8,1,3,${HOLE_DARK})`;
  ctx.fillRect(0, 0, W, H);

  // 穴の縁の内側だけに落ちる影。指が縁をくぐって奥へ続いているように見せる
  const eg = ctx.createRadialGradient(N.cx, N.nostrilY, 10, N.cx, N.nostrilY, 120);
  eg.addColorStop(0, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawFinger(ctx, x, y) {
  const ms = milestone('pick');   // 10%ごとに指が変わる。0.5%は見えないが10%は見える
  const ang = .22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  // 指
  const g = ctx.createLinearGradient(-40, 0, 40, 0);
  g.addColorStop(0, SKIN_D); g.addColorStop(.4, SKIN_L); g.addColorStop(1, SKIN);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-34, 8);
  ctx.quadraticCurveTo(-40, -30, 0, -34);
  ctx.quadraticCurveTo(40, -30, 34, 8);
  ctx.lineTo(44, 430); ctx.lineTo(-44, 430);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,70,50,.4)'; ctx.lineWidth = 2.5; ctx.stroke();

  // 関節のしわ
  ctx.strokeStyle = 'rgba(150,80,60,.3)'; ctx.lineWidth = 2;
  for (const yy of [96, 108, 210, 222]) {
    ctx.beginPath(); ctx.moveTo(-26, yy); ctx.quadraticCurveTo(0, yy + 8, 26, yy); ctx.stroke();
  }

  // 爪。ほじり力のマイルストーンで伸びて光る
  const nailLen = 22 + Math.min(ms, 8) * 2.2;
  ctx.beginPath();
  ctx.ellipse(0, -6, 19, nailLen, 0, 0, TAU);
  const ng = ctx.createLinearGradient(0, -30, 0, 16);
  ng.addColorStop(0, '#fff2ea'); ng.addColorStop(1, '#e8b49a');
  ctx.fillStyle = ng;
  if (ms > 0) { ctx.shadowColor = `hsl(${45 - ms * 4},100%,60%)`; ctx.shadowBlur = 6 + ms * 2.4; }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#c2795a'; ctx.lineWidth = 2; ctx.stroke();

  if (ms >= 4) {  // 十分に強化した指はキラッとする
    const k = (Math.sin(anim * 3) + 1) / 2;
    ctx.globalAlpha = .35 + k * .5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-6, -14, 4 + k * 3, 8 + k * 4, .4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawGauge(ctx) {
  if (state !== 'picking' && !(state === 'whiff' && t < .3)) return;
  const cx = N.cx, cy = 692, r = 232;
  ctx.save();
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 16; ctx.stroke();

  const full = gauge >= 1;
  const hue = lerp(190, 40, gauge);
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * gauge);
  ctx.strokeStyle = full ? `hsl(${45 + Math.sin(anim * 18) * 12},100%,62%)` : `hsl(${hue},85%,60%)`;
  ctx.lineWidth = full ? 20 : 14;
  ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = full ? 26 : 10;
  ctx.stroke();
  ctx.restore();

  if (full) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 40px system-ui, sans-serif';
    const p = 1 + Math.sin(anim * 16) * .05;
    ctx.translate(cx, 990); ctx.scale(p, p);
    ctx.lineWidth = 7; ctx.strokeStyle = '#000';
    ctx.strokeText('はなせ！', 0, 0);
    ctx.fillStyle = '#ffd54a';
    ctx.fillText('はなせ！', 0, 0);
    ctx.restore();
  }
}

pickScene.render = function () {
  const ctx = pickScene.ctx;
  if (!ctx) return;

  drawBg(ctx);
  drawNose(ctx);

  // 後光は鼻の上・鼻くその下。顔より奥に置くと鼻に隠れて見えなくなる
  if (state === 'reveal' && isNew && t > .3) {
    ctx.save();
    ctx.globalAlpha = clamp((t - .3) / .4, 0, 1) * clamp((revealDur() - t) / .5, 0, 1);
    drawRays(ctx, W / 2, 560, anim, 760,
      entry.rarity === 'SECRET' ? 'rgba(255,120,220,' : 'rgba(255,220,120,');
    ctx.restore();
  }

  // 鼻くそ
  if (state === 'reveal' && bScale > 0) {
    const r = (isNew ? revealPx(entry.size) : sizePx(entry.size)) * bScale;
    drawBooger(ctx, entry, bx, by, r, bRot);

    if (isNew) {
      // 星（レア度ぶん）
      for (let i = 0; i < starShown; i++) {
        const a = -Math.PI / 2 + (i - (starN - 1) / 2) * .38;
        const rr = 255;
        const k = clamp((t - .95 - i * .16) / .3, 0, 1);
        drawStar(ctx, W / 2 + Math.cos(a) * rr, 560 + Math.sin(a) * rr * .8,
          30 * easeOutBack(k), RARITY_COLOR[entry.rarity], anim * .8 + i);
      }
      // テキストは全部アイリスの穴（中心560 / 半径330）の内側に収める。
      // 後光の上に乗るので、縁取りが無いと沈む
      if (t > .7) {
        ctx.save();
        ctx.globalAlpha = clamp((t - .7) / .3, 0, 1) * clamp((revealDur() - t) / .5, 0, 1);
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';

        ctx.font = '900 30px system-ui, sans-serif';
        ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.9)';
        const head = entry.rarity === 'SECRET' ? 'シークレット！' : `${entry.rarity}　はじめて！`;
        ctx.strokeText(head, W / 2, 268);
        ctx.fillStyle = RARITY_COLOR[entry.rarity];
        ctx.fillText(head, W / 2, 268);

        ctx.font = '900 52px system-ui, sans-serif';
        ctx.lineWidth = 9;
        ctx.strokeText(entry.name, W / 2, 800);
        ctx.fillStyle = '#fff';
        ctx.fillText(entry.name, W / 2, 800);

        ctx.font = '700 24px system-ui, sans-serif';
        ctx.lineWidth = 6;
        ctx.strokeText(`大きさ ${entry.size}`, W / 2, 840);
        ctx.fillStyle = '#ffd97a';
        ctx.fillText(`大きさ ${entry.size}`, W / 2, 840);
        ctx.restore();
      }
    }
  }

  // 指（リビール中は引っ込める）
  if (state !== 'reveal' || !isNew) drawFingerInNose(ctx, fx, fy);

  // スカ
  if (state === 'whiff') {
    ctx.save();
    ctx.globalAlpha = clamp(1 - t / CFG.whiffTime, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000';
    ctx.strokeText('スカ……', W / 2, 990);
    ctx.fillStyle = '#fff';
    ctx.fillText('スカ……', W / 2, 990);
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillStyle = '#4e7d8f';
    ctx.fillText('溜まりきる前に離した', W / 2, 1026);
    ctx.restore();
  }

  drawGauge(ctx);

  // 最初の案内
  if (state === 'idle' && S.stats.picks < 3) {
    ctx.save();
    ctx.globalAlpha = .45 + Math.sin(hintT * 2.4) * .3;
    ctx.textAlign = 'center';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = '#123a4a';
    ctx.fillText('鼻の穴に指を入れて、長押し', W / 2, 1000);
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillStyle = '#4e7d8f';
    ctx.fillText('押したままグリグリすると気持ちがいい', W / 2, 1036);
    ctx.globalAlpha = .35;
    ctx.fillText('画面のふちに寄ると となりへ', W / 2, 1090);
    ctx.restore();
  }
};
