// 鼻くそ飛ばしシーン
//
// 風・的・障害物は入れない。どれもRNGか正解タイミングを持ち込むので、
// 企画が明確に否定している「タイミングを計るものではない、思い切り溜める快感」と衝突する。
// 当てにいく対象を置いた瞬間、ゲージは"計るもの"に戻ってしまう。
// 代わりに距離の見せ方（背景の段階変化・距離マーカー・自己ベストの旗）に全部寄せる。

import { W, H, CFG, SIZES } from '../config.js';
import { Input, buzz } from '../core/input.js';
import { clamp, lerp, TAU, fmtDist, fmt, mulberry32 } from '../core/util.js';

/** 負の数でも正しく回る剰余。パララックスの巻き戻しに要る */
const mod = (n, m) => ((n % m) + m) % m;
import { drawBooger } from '../core/shape.js';
import { shake, hitstop, flash, popup, burst } from '../core/juice.js';
import {
  chargeStart, chargeSet, chargeStop, sfxLaunch, sfxSplat,
  sfxCoin, sfxFanfare, sfxThud,
} from '../core/audio.js';
import {
  S, stockOf, consume, addCoins, launchV, distanceOf,
  powerRatio, updateRecord, milestone, dexMul,
} from '../state.js';
import { BOOGERS, RARITY_COLOR, RARITY_LABEL } from '../data/boogers.js';

export const flyScene = { name: 'fly', locked: false, cv: null, ctx: null };

let state = 'select';   // select | angle | charge | flight | land
let t = 0, anim = 0;
let sel = null;
let angle = 45, angleLocked = false, lockedAngle = 45, waitRelease = false;
let gauge = 0, over = 0, charging = false, prevDown = false;
// 選択の押し始めが select の中だったか。着地画面を閉じた指での誤選択を防ぐ
let pressInSelect = false;
let stutter = 0;

// 飛行（メートル単位。y は上が正）
let bx = 0, by = 0, vx = 0, vy = 0, ppm = 22, camM = 0;
let dist = 0, landed = 0, wasBest = false, gotCoin = 0, prevBest = 0;
let stage = 0, stageT = 0;
const GROUND_Y = H - 190;

// 背景の段階。距離で切り替える。
// prop = 地面に並べるパララックスの中身。距離が伸びている実感はここが出す。
// propH / gap はメートル。ppm でスケールされるので、ズームアウトしても縮尺が破綻しない。
// ground は必ず sky の下端より暗くする。近い色にすると地平線が消えて、
// 距離が伸びている実感の土台がまるごと無くなる。
const STAGES = [
  { at: 0,    name: '部屋の中', sky: ['#c29a7c', '#9a7255'], ground: '#4a2f1c', prop: 'room', propH: 2.2, gap: 5   },
  { at: 30,   name: '窓の外',   sky: ['#7aa8d8', '#cfe2f2'], ground: '#3f7a2e', prop: 'tree', propH: 7,   gap: 13  },
  { at: 90,   name: '街',       sky: ['#6a98d0', '#bcd8ee'], ground: '#44444e', prop: 'city', propH: 28,  gap: 30  },
  { at: 250,  name: '雲の上',   sky: ['#4a78c8', '#aacae8'], ground: '#54607a', prop: 'city', propH: 28,  gap: 44  },
  { at: 800,  name: '成層圏',   sky: ['#16225a', '#4a6ab0'], ground: '#2e3a64', prop: 'none', propH: 0,   gap: 999 },
  { at: 2500, name: '宇宙',     sky: ['#03040f', '#0a1030'], ground: '#15152a', prop: 'none', propH: 0,   gap: 999 },
];
const stageAt = d => { let i = 0; for (let k = 0; k < STAGES.length; k++) if (d >= STAGES[k].at) i = k; return i; };

// 雲の配置は決め打ち。規則的に散らすと必ず模様が見える
const CLOUDS = [
  { x: 60,  y: 128, s: 1.0 }, { x: 300, y: 402, s: .75 }, { x: 520, y: 196, s: 1.2 },
  { x: 760, y: 486, s: .85 }, { x: 940, y: 96,  s: .95 }, { x: 180, y: 300, s: .7  },
  { x: 640, y: 340, s: 1.1 }, { x: 420, y: 92,  s: .8  }, { x: 860, y: 250, s: 1.0 },
];

// 星も同じ理由で事前生成。i*137.5 のような等差で撒くと斜めの縞になる
const STARS = (() => {
  const r = mulberry32(20260717), a = [];
  for (let i = 0; i < 80; i++) a.push({ x: r() * W, y: r() * H * .8, r: .5 + r() * 1.4 });
  return a;
})();

// 空を通過する連中。段階ごとに住人が変わる
const CRITTER = ['none', 'bird', 'bird', 'plane', 'balloon', 'ufo'];
let critters = [];

/**
 * 当たっても飛距離には一切影響しない。笑い要員としてだけ置く。
 * 減速させると罰になり、せっかく溜めた快感を台無しにする。
 * 高さは軌道の頂点を基準に撒くので、必ず何匹かは当たる位置に来る。
 */
function spawnCritters(d, apex) {
  critters = [];
  const r = mulberry32(Math.round(d * 977) + 7);
  for (let m = 30; m < d * 1.12; m += 50 + r() * 70) {
    const kind = CRITTER[stageAt(m)];
    if (kind === 'none') continue;
    critters.push({ m, y: apex * (.12 + r() * .95), kind, hit: 0, flip: r() < .5 });
  }
}

function drawCritter(ctx, c, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  if (c.hit) ctx.rotate(c.hit * 9);          // ぶつけられて回転しながら落ちていく
  ctx.scale(c.flip ? -s : s, s);
  ctx.lineWidth = 2.5 / s;
  switch (c.kind) {
    case 'bird': {
      // 浅いと棒にしか見えない。カモメの「M」がはっきり出るまで曲げる
      const flap = c.hit ? 20 : Math.sin(anim * 7 + c.m) * 14 - 36;
      ctx.strokeStyle = 'rgba(30,30,40,.85)';
      ctx.lineWidth = 4 / s;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.quadraticCurveTo(-15, flap, 0, 0);
      ctx.quadraticCurveTo(15, flap, 30, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(30,30,40,.85)';
      ctx.beginPath(); ctx.ellipse(0, 1, 5, 4, 0, 0, TAU); ctx.fill();
      break;
    }
    case 'plane':
      ctx.fillStyle = 'rgba(245,245,252,.95)';
      ctx.beginPath(); ctx.ellipse(0, 0, 42, 8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-12, -22); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-12, 22); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-44, -14); ctx.lineTo(-30, 0); ctx.closePath(); ctx.fill();
      break;
    case 'balloon':
      ctx.fillStyle = 'rgba(235,95,115,.9)';
      ctx.beginPath(); ctx.ellipse(0, -20, 24, 28, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,220,.6)'; ctx.lineWidth = 2.5 / s;
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, 8); ctx.stroke();
      ctx.fillStyle = 'rgba(90,60,40,.95)';
      ctx.fillRect(-9, 8, 18, 14);
      break;
    case 'ufo':
      ctx.fillStyle = 'rgba(150,240,190,.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(210,255,235,.95)';
      ctx.beginPath(); ctx.ellipse(0, -9, 17, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(90,220,160,.9)';
      for (const dx of [-24, 0, 24]) { ctx.beginPath(); ctx.arc(dx, 2, 3.5, 0, TAU); ctx.fill(); }
      break;
  }
  // ぶつけられた奴には鼻くそが貼り付いたまま残る
  if (c.hit && sel) {
    ctx.fillStyle = sel.color;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/**
 * 段階の切り替わり具合 0..1。
 * 素直に線形補間すると、茶色い部屋から青空へ向かう途中がずっと濁った灰色になる。
 * 手前75%は自分の色を保ち、境界の直前で一気に混ぜる。
 */
function stageMix(d, i) {
  const a = STAGES[i], b = STAGES[Math.min(i + 1, STAGES.length - 1)];
  const span = (b.at - a.at) || 1;
  return clamp((d - (b.at - span * .28)) / (span * .28), 0, 1);
}

flyScene.init = function () {
  flyScene.cv = document.querySelector('#cv-fly');
  flyScene.ctx = flyScene.cv.getContext('2d');
};

/** コンソールから中を覗くための読み取り専用アクセサ */
flyScene.debug = () => ({ state, angle, angleLocked, lockedAngle, gauge, over, dist, bx, by, ppm, sel: sel && sel.id });

flyScene.enter = function () { reset(); };
flyScene.exit = function () { chargeStop(); };

function reset() {
  state = 'select'; t = 0; sel = null;
  angleLocked = false; waitRelease = false; charging = false;
  gauge = 0; over = 0;
  // 指が触れたまま select に戻ることがある（着地画面をタップで閉じた直後）。
  // ここで落としておかないと、その指を離した瞬間に鼻くそが選ばれる
  pressInSelect = false;
  flyScene.locked = false;
  chargeStop();
}

const owned = () => BOOGERS.filter(b => stockOf(b.id) > 0);

// 在庫グリッド
const GC = 5, CW = 116, CH = 116, GAP = 9;
const GX = (W - (GC * CW + (GC - 1) * GAP)) / 2, GY = 420;
const gridRows = () => Math.max(1, Math.ceil(owned().length / GC));
function cellRect(i) {
  const c = i % GC, r = (i / GC) | 0;
  return [GX + c * (CW + GAP), GY + r * (CH + GAP), CW, CH];
}

flyScene.update = function (dt, isActive) {
  anim += dt;
  if (!isActive) return;
  t += dt;
  const down = Input.down, justDown = down && !prevDown, justUp = !down && prevDown;
  prevDown = down;

  if (state === 'select') {
    flyScene.locked = false;
    // 押し始めが select の中でなければ選ばない。
    // 着地画面をタップで閉じると、その指を離した瞬間に真下のセルが
    // 選ばれてしまい、望んでいない鼻くそが飛んでいく事故が起きていた。
    if (justDown) pressInSelect = true;
    if (justUp && pressInSelect) {
      pressInSelect = false;
      const list = owned();
      for (let i = 0; i < list.length; i++) {
        const [x, y, w, h] = cellRect(i);
        if (Input.x >= x && Input.x <= x + w && Input.y >= y && Input.y <= y + h) {
          sel = list[i];
          state = 'angle'; t = 0; angleLocked = false;
          flyScene.locked = true;   // ここから先はアクション中：エッジ判定を止める
          sfxThud(); buzz(10);
          break;
        }
      }
    }
  }

  else if (state === 'angle') {
    if (!angleLocked) {
      // メトロノームのように 0〜90° を往復
      angle = 45 + 45 * Math.sin(t * TAU / CFG.angleCycle);
      if (justDown) {
        angleLocked = true; lockedAngle = angle; waitRelease = true;
        const good = lockedAngle >= CFG.hitstopLo && lockedAngle <= CFG.hitstopHi;
        sfxThud(); shake(good ? 8 : 3, .12); buzz(good ? 24 : 8);
        if (good) flash('#ffd97a', .3, .1);
      }
    } else if (waitRelease && justUp) {
      waitRelease = false; state = 'charge'; gauge = 0; over = 0; charging = false;
    }
  }

  else if (state === 'charge') {
    if (justDown && !charging) { charging = true; gauge = 0; over = 0; chargeStart(); }
    if (charging) {
      if (gauge < 1) gauge = clamp(gauge + dt / CFG.chargeTime, 0, 1);
      else over += dt;                 // 満タン後も押し続けられる。溜める快感が本体
      chargeSet(gauge, over);

      // 押している間ずっと画面が振動する
      shake(2 + gauge * 9 + Math.min(over, 2.5) * 5, .08);
      if (Math.random() < gauge * .4) buzz(6);

      // 満タン かつ 40〜45° ならヒットストップが混じり、機械が軋むような手応えになる
      const good = lockedAngle >= CFG.hitstopLo && lockedAngle <= CFG.hitstopHi;
      if (gauge >= 1 && good) {
        stutter += dt;
        if (stutter > .22) { stutter = 0; hitstop(.05); flash('#fff', .12, .06); buzz(30); }
      }
      if (justUp) launch();
    }
  }

  else if (state === 'flight') {
    // 実際の放物線。45°が最適なのは物理からタダで出る
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      const h = dt / sub;
      bx += vx * h; by += vy * h; vy -= CFG.gravity * h;
      if (by <= 0) { by = 0; land(); break; }
    }
    dist = bx;

    const st = stageAt(dist);
    if (st !== stage) { stage = st; stageT = 0; sfxCoin(); }
    stageT += dt;

    // 通過オブジェクトへの命中。速度には一切触らない
    for (const c of critters) {
      if (c.hit) { c.hit += dt; continue; }
      if (Math.abs(bx - c.m) < 2.6 && Math.abs(by - c.y) < 2.6) {
        c.hit = 0.001;
        sfxSplat(); shake(6, .16); buzz(14);
        popup(W * .32, GROUND_Y - by * ppm - 40, 'ベチャッ', '#fff', 30);
      }
    }

    // 自己ベストの旗を越えた瞬間
    if (!wasBest && prevBest > 0 && bx >= prevBest) {
      wasBest = true;
      hitstop(.12); flash('#ffd97a', .5, .18); shake(18, .4); sfxFanfare(); buzz([20, 40, 20]);
      popup(W / 2, 300, '自己ベスト更新！', '#ffd97a', 46);
    }

    // カメラ：鼻くそを追従しつつ、高く上がったらズームアウト
    const want = clamp(300 / Math.max(14, by), .55, 22);
    ppm = lerp(ppm, want, .06);
    camM = bx - (W * .32) / ppm;
  }

  else if (state === 'land') {
    // 結果を眺める一拍は置くが、待たせ切らない。タップで飛ばせる。
    // ゲージ速度を一定にしたのと同じ理由（慣れたプレイヤーのテンポを殺さない）。
    if (t > 2.6 || (justDown && t > .45)) reset();
  }
};

function launch() {
  charging = false;
  chargeStop();
  if (!consume(sel.id)) { reset(); return; }

  const v = launchV(sel.size, gauge);
  const rad = lockedAngle * Math.PI / 180;
  bx = 0; by = 0.6; vx = Math.cos(rad) * v; vy = Math.sin(rad) * v;
  ppm = 22; camM = -(W * .32) / ppm;
  dist = 0; stage = 0; stageT = 0;
  prevBest = S.records[sel.size] || 0;
  wasBest = false;
  state = 'flight'; t = 0;

  // 着地予測と頂点は物理から出る。これで通過オブジェクトを軌道上に撒ける
  const predict = v * v * Math.sin(2 * rad) / CFG.gravity;
  spawnCritters(predict, v * v * Math.sin(rad) ** 2 / (2 * CFG.gravity));

  sfxLaunch(gauge);
  shake(16 + Math.min(over, 2) * 8, .3);
  hitstop(.07);
  flash('#fff', .4, .1);
  buzz(40);
}

function land() {
  state = 'land'; t = 0; landed = bx;
  dist = bx;
  sfxSplat(); shake(10, .3); buzz(24);
  burst(W * .32, GROUND_Y, sel.color, 18, 260);

  gotCoin = Math.floor(dist * CFG.coinPerM * dexMul());
  const best = updateRecord(sel.size, dist);
  if (best) gotCoin *= CFG.bestMul;
  addCoins(gotCoin);
  sfxCoin();
  popup(W / 2, 686, `+${fmt(gotCoin)}`, '#ffd97a', 52);   // リザルト帯(380〜620)の下に出す
  if (best) sfxFanfare();
}

// ── 描画 ────────────────────────────────────────────

const sizePx = s => ({ 小: 22, 中: 30, 大: 40, 特大: 54, 伝説: 72 }[s]);

function drawSky(ctx, d) {
  const i = stageAt(d), a = STAGES[i], b = STAGES[Math.min(i + 1, STAGES.length - 1)];
  const k = stageMix(d, i);
  const mix = (c1, c2) => {
    const p = h => [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16));
    const A = p(c1), B = p(c2);
    return `rgb(${A.map((v, j) => Math.round(lerp(v, B[j], k))).join(',')})`;
  };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(a.sky[0], b.sky[0]));
  g.addColorStop(1, mix(a.sky[1], b.sky[1]));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return { i, k, a, b, ground: mix(a.ground, b.ground) };
}

/** 地面に並ぶパララックスの中身。距離ごとに世界が変わっていく */
function drawProp(ctx, kind, x, gy, h, seed) {
  const r = mulberry32(seed);
  ctx.save();
  switch (kind) {
    case 'desk': {   // 消しゴム・鉛筆・マグカップ
      const t = (seed % 3);
      ctx.fillStyle = ['#e8e0d0', '#d8b040', '#e0e8ee'][t];
      if (t === 1) { ctx.fillRect(x, gy - h * 1.6, 7, h * 1.6); ctx.fillStyle = '#3a2a20'; ctx.fillRect(x, gy - h * 1.6, 7, 9); }
      else ctx.fillRect(x, gy - h, h * (t === 2 ? 1 : 1.8), h);
      break;
    }
    case 'room': {   // 椅子・棚・スタンドライト
      ctx.fillStyle = 'rgba(38,22,14,.72)';
      const t = seed % 3;
      if (t === 0) {           // 椅子
        ctx.fillRect(x, gy - h * .5, h * .7, h * .12);
        ctx.fillRect(x, gy - h, h * .12, h);
        ctx.fillRect(x + h * .58, gy - h * .5, h * .12, h * .5);
      } else if (t === 1) {    // 棚
        ctx.fillRect(x, gy - h, h * .95, h);
        ctx.fillStyle = 'rgba(180,140,90,.35)';
        for (let yy = 1; yy < 3; yy++) ctx.fillRect(x + 2, gy - h * (yy / 3), h * .9, Math.max(1, h * .05));
      } else {                 // スタンドライト
        ctx.fillRect(x + h * .22, gy - h * .9, h * .07, h * .9);
        ctx.beginPath();
        ctx.moveTo(x, gy - h * .9); ctx.lineTo(x + h * .5, gy - h * .9); ctx.lineTo(x + h * .38, gy - h * 1.2);
        ctx.lineTo(x + h * .12, gy - h * 1.2); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'tree': {   // 木
      ctx.fillStyle = 'rgba(28,50,22,.7)';
      ctx.fillRect(x + h * .22, gy - h * .4, h * .1, h * .4);
      ctx.beginPath();
      ctx.moveTo(x + h * .27, gy - h * 1.15);
      ctx.lineTo(x + h * .58, gy - h * .32);
      ctx.lineTo(x - h * .04, gy - h * .32);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'city': {   // ビル。窓が付くと一気にそれらしくなる
      ctx.fillStyle = 'rgba(34,36,58,.6)';
      const w = h * .42;
      ctx.fillRect(x, gy - h, w, h);
      ctx.fillStyle = 'rgba(255,225,150,.35)';
      for (let yy = gy - h + 10; yy < gy - 14; yy += 18) {
        for (let xx = x + 6; xx < x + w - 8; xx += 14) if (r() > .45) ctx.fillRect(xx, yy, 6, 9);
      }
      break;
    }
  }
  ctx.restore();
}

function drawWorld(ctx) {
  const sky = drawSky(ctx, dist);
  const gy = GROUND_Y;

  // 星（高いところ）
  if (sky.i >= 4) {
    ctx.save();
    ctx.globalAlpha = clamp((sky.i - 4 + sky.k) / 1.6, 0, 1);
    ctx.fillStyle = '#fff';
    for (const s of STARS) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // 雲（一番奥。ゆっくり流れる）
  // 高さを等差数列で出すと、雲がきれいな斜め一直線に並んでしまう
  if (sky.i >= 1 && sky.i <= 4) {
    ctx.save();
    ctx.globalAlpha = sky.i === 4 ? clamp(1 - sky.k, 0, 1) * .55 : .55;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < CLOUDS.length; i++) {
      const c = CLOUDS[i];
      const wx = mod(c.x - camM * ppm * .18, W + 460) - 230;
      ctx.beginPath(); ctx.ellipse(wx, c.y, 86 * c.s, 28 * c.s, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(wx + 50 * c.s, c.y + 10 * c.s, 60 * c.s, 21 * c.s, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(wx - 44 * c.s, c.y + 8 * c.s, 44 * c.s, 17 * c.s, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 地面
  ctx.fillStyle = sky.ground;
  ctx.fillRect(0, gy, W, H - gy);

  // パララックスの中身。ワールド座標(m)に並べるので、ちゃんと後ろへ流れる
  const st = STAGES[sky.i];
  if (st.prop !== 'none' && ppm > 0.35) {
    const g0 = Math.floor(camM / st.gap) * st.gap;
    for (let m = g0; m < camM + W / ppm + st.gap; m += st.gap) {
      const seed = Math.abs(Math.round(m * 13.7)) + sky.i * 7919;
      const h = st.propH * ppm * (0.7 + (seed % 60) / 100);
      if (h < 2) continue;
      drawProp(ctx, st.prop, (m - camM) * ppm, gy, h, seed);
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(0, gy, W, 5);

  // 距離マーカー：一定間隔で線、10本ごとに看板。
  // 縞にすると、ズームアウトしても速度が目で分かる
  const step = ppm > 8 ? 5 : ppm > 2.5 ? 25 : ppm > 0.9 ? 100 : 500;
  const from = Math.floor(camM / step) * step;
  ctx.save();
  ctx.font = '700 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let m = from; m < camM + W / ppm + step; m += step) {
    if (m < 0) continue;
    const sx = (m - camM) * ppm;
    const big = Math.round(m / step) % 10 === 0;
    // 縞。強くすると床が縞そのものになるので、薄く敷いて速度だけ伝える
    ctx.fillStyle = 'rgba(0,0,0,.07)';
    if (Math.round(m / step) % 2 === 0) ctx.fillRect(sx, gy + 5, step * ppm, H - gy);
    ctx.fillStyle = big ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.28)';
    ctx.fillRect(sx, gy, big ? 3 : 1.5, big ? 30 : 13);
    if (big && m > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(`${fmt(m)}m`, sx, gy + 52);
    }
  }
  ctx.restore();

  // 通過オブジェクト
  for (const c of critters) {
    const sx = (c.m - camM) * ppm;
    if (sx < -60 || sx > W + 60) continue;
    const sy = gy - c.y * ppm + (c.hit ? c.hit * c.hit * 900 : 0);   // 当たった奴は落ちる
    if (sy < -60 || sy > H + 60) continue;
    drawCritter(ctx, c, sx, sy, clamp(ppm / 22, .35, 1.15));
  }

  // 自己ベストの旗
  if (prevBest > 0) {
    const sx = (prevBest - camM) * ppm;
    if (sx > -60 && sx < W + 60) {
      const fall = wasBest ? clamp((bx - prevBest) / 8, 0, 1) : 0;
      ctx.save();
      ctx.translate(sx, gy);
      ctx.rotate(fall * 1.4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
      ctx.fillStyle = wasBest ? '#8a8a8a' : '#ff5e6a';
      ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(46, -58); ctx.lineTo(0, -46); ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (!wasBest) {
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = '700 16px system-ui, sans-serif';
        ctx.fillText('自己ベスト', sx, gy - 82);
      }
    }
  }

  // 鼻くそ
  const sx = (bx - camM) * ppm;
  const sy = gy - by * ppm;
  const r = Math.max(4, sizePx(sel.size) * clamp(ppm / 22, .28, 1));
  if (state === 'land') {
    // 粘着質なので跳ねない。着地でベチャッと潰れて終わる
    const k = clamp(t / .12, 0, 1);
    drawBooger(ctx, sel, sx, gy - r * .35 * (1 - k * .5), r * (1 + k * .35), 0, 1 - k * .55);
  } else {
    drawBooger(ctx, sel, sx, sy, r, bx * .35);
    // 尾を引く
    ctx.globalAlpha = .3; ctx.fillStyle = sel.color;
    for (let i = 1; i <= 5; i++) {
      const px = sx - vx * ppm * i * .012, py = sy + vy * ppm * i * .012;
      ctx.globalAlpha = .25 - i * .04;
      ctx.beginPath(); ctx.arc(px, py, r * (1 - i * .13), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 段階のテロップ
  if (stageT < 1.6 && stage > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(stageT / .2, 0, 1) * clamp((1.6 - stageT) / .5, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(STAGES[stage].name, W / 2, 220);
    ctx.fillStyle = '#fff';
    ctx.fillText(STAGES[stage].name, W / 2, 220);
    ctx.restore();
  }

  // 距離
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '900 76px system-ui, sans-serif';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.strokeText(fmtDist(dist), W / 2, 130);
  ctx.fillStyle = '#fff';
  ctx.fillText(fmtDist(dist), W / 2, 130);
  ctx.restore();
}

/** 角度フェーズ：指を横から見る */
function drawAngleView(ctx) {
  const px = 210, py = 980, R = 380;
  const a = (angleLocked ? lockedAngle : angle);
  const good = a >= CFG.hitstopLo && a <= CFG.hitstopHi;
  const rad = -a * Math.PI / 180;

  ctx.save();
  ctx.translate(px, py);

  ctx.strokeStyle = 'rgba(30,110,140,.28)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, 0); ctx.stroke();

  // 40〜45°のおいしい帯。細いと見えないので太く敷く
  ctx.beginPath();
  ctx.arc(0, 0, R, -CFG.hitstopHi * Math.PI / 180, -CFG.hitstopLo * Math.PI / 180);
  ctx.strokeStyle = 'rgba(255,217,122,.8)'; ctx.lineWidth = 24; ctx.stroke();

  for (let d = 0; d <= 90; d += 15) {
    ctx.save(); ctx.rotate(-d * Math.PI / 180);
    ctx.strokeStyle = d === 45 ? '#ffb31f' : 'rgba(30,110,140,.45)';
    ctx.lineWidth = d === 45 ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(R + 16, 0); ctx.lineTo(R + (d % 45 === 0 ? 42 : 26), 0); ctx.stroke();
    ctx.restore();
  }
  // 45°のラベルだけ立てる
  ctx.save();
  ctx.rotate(-Math.PI / 4); ctx.translate(R + 76, 0); ctx.rotate(Math.PI / 4);
  ctx.textAlign = 'center'; ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillStyle = '#b06a00'; ctx.fillText('45°', 0, 9);
  ctx.restore();

  // 指
  ctx.save();
  ctx.rotate(rad);
  const g = ctx.createLinearGradient(0, -36, 0, 36);
  g.addColorStop(0, '#f6c9a8'); g.addColorStop(.55, '#e8a882'); g.addColorStop(1, '#c2795a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-40, -36, 310, 72, 36); ctx.fill();
  ctx.strokeStyle = '#b8724f'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(150,80,60,.32)'; ctx.lineWidth = 2;
  for (const xx of [96, 176]) {
    ctx.beginPath(); ctx.moveTo(xx, -30); ctx.quadraticCurveTo(xx + 9, 0, xx, 30); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(246, 0, 15, 25, 0, 0, TAU);
  ctx.fillStyle = '#ffeee4'; ctx.fill();
  ctx.strokeStyle = '#c2795a'; ctx.lineWidth = 2; ctx.stroke();
  drawBooger(ctx, sel, 292, 0, sizePx(sel.size) * .95, anim * .4);
  ctx.restore();

  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillStyle = '#123a4a';
  ctx.fillText(angleLocked ? '離すと、溜めに入る' : 'タップで角度を決める', W / 2, 150);

  ctx.font = '900 104px system-ui, sans-serif';
  ctx.lineWidth = 11; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3fb4dd';
  ctx.strokeText(`${a.toFixed(0)}°`, W / 2, 286);
  ctx.fillStyle = good ? '#c98000' : '#123a4a';
  ctx.fillText(`${a.toFixed(0)}°`, W / 2, 286);

  ctx.font = '600 23px system-ui, sans-serif';
  ctx.fillStyle = good ? '#c98000' : '#4e7d8f';
  ctx.fillText(good ? 'いい角度だ' : 'ベストは 45°', W / 2, 330);

  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = '#4e7d8f';
  ctx.fillText(`${sel.name}（${sel.size}）`, W / 2, 386);
  ctx.restore();
}

/** 溜めフェーズ：指を上から見る */
function drawChargeView(ctx) {
  const cx = W / 2, cy = 690;   // 手のひらがゲージ(y=1090)に乗らない高さ
  const bend = gauge * 46 + Math.min(over, 3) * 5;
  const quiv = charging ? (Math.random() - .5) * (gauge * 10 + Math.min(over, 3) * 8) : 0;

  ctx.save();
  ctx.translate(cx + quiv, cy + quiv * .5);

  // 手の甲（上から見ている）
  const pg = ctx.createRadialGradient(-30, 150, 20, 0, 200, 190);
  pg.addColorStop(0, '#eeb489'); pg.addColorStop(1, '#c2805c');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(0, 210, 158, 136, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a86547'; ctx.lineWidth = 3; ctx.stroke();
  // 他の指の付け根
  ctx.strokeStyle = 'rgba(150,80,60,.3)'; ctx.lineWidth = 3;
  for (const xx of [-78, -26, 26, 78]) {
    ctx.beginPath(); ctx.moveTo(xx, 120); ctx.lineTo(xx, 200); ctx.stroke();
  }

  // 人差し指（溜めるほど後ろに反る）
  ctx.save();
  ctx.rotate(bend * Math.PI / 180);
  const g = ctx.createLinearGradient(-56, 0, 56, 0);
  g.addColorStop(0, '#b8724f'); g.addColorStop(.42, '#f9d0b0'); g.addColorStop(1, '#dc9a76');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-56, -252, 112, 320, 56); ctx.fill();
  ctx.strokeStyle = '#a86547'; ctx.lineWidth = 3; ctx.stroke();
  // 関節。これが無いと指に見えない
  ctx.strokeStyle = 'rgba(150,80,60,.34)'; ctx.lineWidth = 2.5;
  for (const yy of [-116, -100, 4, 20]) {
    ctx.beginPath(); ctx.moveTo(-40, yy); ctx.quadraticCurveTo(0, yy + 12, 40, yy); ctx.stroke();
  }
  // 爪
  ctx.beginPath(); ctx.ellipse(0, -214, 30, 40, 0, 0, TAU);
  const ng = ctx.createLinearGradient(0, -250, 0, -176);
  ng.addColorStop(0, '#fff6f0'); ng.addColorStop(1, '#e8b49a');
  ctx.fillStyle = ng; ctx.fill();
  ctx.strokeStyle = '#b8724f'; ctx.lineWidth = 2; ctx.stroke();
  // 鼻くそ
  drawBooger(ctx, sel, 0, -286, sizePx(sel.size), anim);
  ctx.restore();

  // 親指（人差し指の上に被せて押さえている。指より後に描く）
  ctx.save();
  ctx.rotate(-.34);
  const tg = ctx.createLinearGradient(0, 30, 0, 130);
  tg.addColorStop(0, '#f6c9a8'); tg.addColorStop(1, '#c98058');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.roundRect(-186, 26, 240, 84, 42); ctx.fill();
  ctx.strokeStyle = '#a86547'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-160, 68, 26, 32, 0, 0, TAU);
  ctx.fillStyle = '#ffeee4'; ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.restore();

  // ゲージ
  const gw = 520, gx = (W - gw) / 2, gyy = 1090;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.roundRect(gx - 5, gyy - 5, gw + 10, 44, 22); ctx.fill();
  const full = gauge >= 1;
  const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  gg.addColorStop(0, '#5ec8e8'); gg.addColorStop(.6, '#ffd97a'); gg.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = full ? `hsl(${20 + Math.sin(anim * 22) * 18},100%,58%)` : gg;
  ctx.beginPath(); ctx.roundRect(gx, gyy, gw * gauge, 34, 17); ctx.fill();
  if (full) {
    ctx.shadowColor = '#ff8a3a'; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.roundRect(gx, gyy, gw, 34, 17); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillStyle = '#123a4a';
  ctx.fillText(charging ? '' : '長押しで溜める', W / 2, 200);
  // 満タンのあおり。押し続けるほど大きく速く跳ねて、離せと急かす
  if (charging && gauge >= 1) {
    const heat = Math.min(over, 2.5) / 2.5;
    const p = (1 + heat * .18) * (1 + Math.sin(anim * (20 + heat * 16)) * (.06 + heat * .05));
    ctx.save();
    ctx.translate(W / 2, 250); ctx.scale(p, p);
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3fb4dd';
    ctx.strokeText('今だ！', 0, 0);
    ctx.fillStyle = '#ff8a3a';
    ctx.fillText('今だ！', 0, 0);
    ctx.restore();
  }
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillStyle = '#c98000';
  ctx.fillText(`${lockedAngle.toFixed(0)}°`, W / 2, 150);
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = '#4e7d8f';
  ctx.fillText(`${sel.name}（${sel.size}）`, W / 2, 330);
  ctx.restore();
}

function drawSelect(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#8fe0f8'); bg.addColorStop(1, '#d6f4ff');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.lineWidth = 9; ctx.strokeStyle = '#3fb4dd';
  ctx.strokeText('鼻くそ飛ばし', W / 2, 150);
  ctx.fillStyle = '#fff';
  ctx.fillText('鼻くそ飛ばし', W / 2, 150);
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillStyle = '#4e7d8f';
  ctx.fillText('飛ばす鼻くそを選ぶ　※在庫から1つ減る', W / 2, 196);

  // サイズ別の自己ベスト。記録が5本あるので更新機会が枯れない
  const bw = W / 5;
  for (let i = 0; i < SIZES.length; i++) {
    const s = SIZES[i], x = bw * i + bw / 2;
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillStyle = '#4e7d8f'; ctx.fillText(s, x, 268);
    const r = S.records[s] || 0;
    ctx.fillStyle = r > 0 ? '#17a86a' : '#9dc4d4';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText(r > 0 ? fmtDist(r) : '—', x, 300);
  }
  ctx.fillStyle = '#79a6b8'; ctx.font = '700 19px system-ui, sans-serif';
  ctx.fillText('サイズ別 自己ベスト', W / 2, 340);

  const list = owned();
  if (!list.length) {
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillStyle = '#123a4a';
    ctx.fillText('在庫がない', W / 2, 680);
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillStyle = '#4e7d8f';
    ctx.fillText('下のふちから鼻に戻って、ほじってこい', W / 2, 730);
    ctx.restore();
    return;
  }
  ctx.restore();

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const [x, y, w, h] = cellRect(i);
    const hot = Input.x >= x && Input.x <= x + w && Input.y >= y && Input.y <= y + h;
    ctx.save();
    ctx.fillStyle = hot ? '#fff8e0' : '#f4fdff';
    ctx.strokeStyle = hot ? '#ffb31f' : RARITY_COLOR[b.rarity];
    ctx.lineWidth = hot ? 4 : 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill(); ctx.stroke();

    drawBooger(ctx, b, x + w / 2, y + h / 2 - 6, 30 * (hot ? 1.1 : 1), 0);

    ctx.textAlign = 'right';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.fillStyle = '#b06a00';
    ctx.fillText(`×${stockOf(b.id)}`, x + w - 7, y + h - 7);

    ctx.textAlign = 'left';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.fillStyle = RARITY_COLOR[b.rarity];
    ctx.fillText(RARITY_LABEL[b.rarity], x + 7, y + 20);

    // パワーが足りているか。足りないと本気が出ない
    const pr = powerRatio(b.size);
    ctx.textAlign = 'center';
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.fillStyle = pr >= 1 ? '#17a86a' : pr > .5 ? '#c98000' : '#e0364f';
    ctx.fillText(b.size + (pr >= 1 ? '' : ` ${Math.round(pr * 100)}%`), x + w / 2, y + h - 8);
    ctx.restore();
  }

  // 実際に使った行数の下に置く。固定行数で置くと画面外に落ちる
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 19px system-ui, sans-serif';
  ctx.fillStyle = '#79a6b8';
  ctx.fillText('％＝本気度。パワーが足りないと本来の飛距離が出ない',
    W / 2, Math.min(GY + gridRows() * (CH + GAP) + 34, H - 40));
  ctx.restore();
}

flyScene.render = function () {
  const ctx = flyScene.ctx;
  if (!ctx) return;

  if (state === 'select') { drawSelect(ctx); return; }

  if (state === 'flight' || state === 'land') { drawWorld(ctx); }
  else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#8fe0f8'); bg.addColorStop(1, '#d6f4ff');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (state === 'angle') drawAngleView(ctx);
    else if (state === 'charge') drawChargeView(ctx);
  }

  if (state === 'land') {
    ctx.save();
    ctx.globalAlpha = clamp(t / .3, 0, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 380, W, 240);
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillStyle = '#a08a80';
    ctx.fillText(`${sel.name}（${sel.size}）`, W / 2, 440);
    ctx.font = '900 86px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(fmtDist(dist), W / 2, 530);
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillStyle = '#6a5a54';
    ctx.fillText(t > .45 ? 'タップでもどる' : '', W / 2, 596);
    ctx.restore();
  }
};
