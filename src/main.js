// エントリ。RAFループ、十字ナビ、エッジ遷移、フィット処理。

import { W, H, CFG } from './config.js';
import { Input, initInput, tickInput, setFitScale, pointerLive } from './core/input.js';
import { juice, updateJuice, renderFx } from './core/juice.js';
import { unlockAudio, sfxSwoosh } from './core/audio.js';
import { load, S } from './state.js';
import { fmt, clamp, easeOut } from './core/util.js';

import { pickScene } from './scenes/pick.js';
import { flyScene } from './scenes/fly.js';
import { shopScene } from './scenes/shop.js';
import { collectionScene } from './scenes/collection.js';
import { resultScene } from './scenes/result.js';

const $ = s => document.querySelector(s);
const stage = $('#stage'), world = $('#world'), fit = $('#fit');
const cvFx = $('#cv-fx'), ctxFx = cvFx.getContext('2d');

// ── 十字配置 ────────────────────────────────────────
//                (1,0) 飛ばし
//   (0,1) ショップ  (1,1) ほじり  (2,1) コレクション
//                (1,2) リザルト
const SCENES = {
  pick:       { s: pickScene,       cx: 1, cy: 1, up: 'fly', left: 'shop', right: 'collection', down: 'result' },
  fly:        { s: flyScene,        cx: 1, cy: 0, down: 'pick' },
  shop:       { s: shopScene,       cx: 0, cy: 1, right: 'pick' },
  collection: { s: collectionScene, cx: 2, cy: 1, left: 'pick' },
  result:     { s: resultScene,     cx: 1, cy: 2, up: 'pick' },
};

let active = 'pick';
let camX = 720, camY = 1280;          // 表示中セルの左上（ワールド座標）
let tgtX = 720, tgtY = 1280;
let peekX = 0, peekY = 0;
let slideT = 0, slideFrom = [720, 1280];
let started = false;

export function getActive() { return active; }
export const activeScene = () => SCENES[active].s;

export function go(name) {
  if (!SCENES[name] || name === active) return;
  const to = SCENES[name];
  SCENES[active].s.exit?.();
  active = name;
  slideFrom = [camX, camY];
  tgtX = to.cx * W; tgtY = to.cy * H;
  slideT = 0;
  dwell = 0; peekTarget = null; armed = false;
  SCENES[name].s.enter?.();
  sfxSwoosh();
}

// ── エッジ遷移 ──────────────────────────────────────
// 帯に入ると隣が最大12%覗き、奥まで押し込むか少し留まると確定する。
// この「覗き」が何があるかを教えるので、説明文を置かずに済む。
const EDGES = [
  { key: 'up',    depth: (x, y) => (CFG.edgeBand - y) / CFG.edgeBand,       ax: 'y', dir: -1 },
  { key: 'down',  depth: (x, y) => (y - (H - CFG.edgeBand)) / CFG.edgeBand, ax: 'y', dir: +1 },
  { key: 'left',  depth: (x, y) => (CFG.edgeBand - x) / CFG.edgeBand,       ax: 'x', dir: -1 },
  { key: 'right', depth: (x, y) => (x - (W - CFG.edgeBand)) / CFG.edgeBand, ax: 'x', dir: +1 },
];

let dwell = 0, peekTarget = null;
// 遷移が確定したら、いったん帯から出るまで次を受け付けない。
// これが無いと、ショップから右エッジで鼻に戻った指がそのまま右エッジに居るせいで、
// 着いた瞬間に図鑑まで飛ばされる（ピンポン遷移）。
let armed = true;

function relax(dt) {
  peekX += (0 - peekX) * Math.min(1, dt * 14);
  peekY += (0 - peekY) * Math.min(1, dt * 14);
  dwell = 0; peekTarget = null;
}

function updateEdges(dt) {
  const cur = SCENES[active];
  const sc = cur.s;

  // アクション中は帯に触れても判定を取らない（企画の要求）。
  // あわせて armed を落としておく。ここを落とさないと、グリグリで指が端まで流れたまま
  // ほじりが終わった瞬間に隣へ飛ばされ、「操作中の誤遷移を防ぐ」意図が結局果たせない。
  // アクション明けは、一度帯から出るまで反応しない。
  if (sc.locked || !started || slideT < 1) { relax(dt); armed = false; return; }
  if (!pointerLive()) { relax(dt); return; }

  let best = null, bestD = 0;
  for (const e of EDGES) {
    if (!cur[e.key]) continue;
    const d = clamp(e.depth(Input.x, Input.y), 0, 1);
    if (d > bestD) { bestD = d; best = e; }
  }

  if (!best || bestD <= 0.02) { relax(dt); armed = true; return; }
  if (!armed) { relax(dt); return; }

  peekTarget = cur[best.key];
  dwell += dt;

  const amt = easeOut(bestD) * CFG.edgePeek * best.dir;
  const tx = best.ax === 'x' ? amt : 0;
  const ty = best.ax === 'y' ? amt : 0;
  peekX += (tx - peekX) * Math.min(1, dt * 22);
  peekY += (ty - peekY) * Math.min(1, dt * 22);

  if (bestD >= CFG.edgeCommit || dwell >= CFG.edgeDwell) {
    peekX = peekY = 0;
    armed = false;
    go(cur[best.key]);
  }
}

// ── フィット ────────────────────────────────────────
let fitScale = 1;
function doFit() {
  const vw = fit.clientWidth, vh = fit.clientHeight;
  // レイアウト確定前に呼ばれると 0 になり、scale(0) で固まったまま復帰しない
  if (vw <= 0 || vh <= 0) return;
  fitScale = Math.min(vw / W, vh / H);
  stage.style.transform = `scale(${fitScale})`;
  setFitScale(fitScale);

  // バッキングストアを実表示サイズに合わせる（ぼやけ防止）
  const q = Math.min(2, window.devicePixelRatio || 1) * fitScale;
  for (const cv of [cvFx, pickScene.cv, flyScene.cv]) {
    if (!cv) continue;
    cv.width = Math.round(W * q);
    cv.height = Math.round(H * q);
    cv.getContext('2d').setTransform(q, 0, 0, q, 0, 0);
  }
}

// ── HUD ─────────────────────────────────────────────
const hudEl = $('#hud-coins'), hudB = hudEl.querySelector('b');
let shownCoins = -1;
function syncHud() {
  if (S.coins === shownCoins) return;
  const up = S.coins > shownCoins && shownCoins >= 0;
  shownCoins = S.coins;
  hudB.textContent = fmt(S.coins);
  if (up) { hudEl.classList.remove('pop'); void hudEl.offsetWidth; hudEl.classList.add('pop'); }
}

// ── ループ ──────────────────────────────────────────
let last = performance.now();

function tick(real) {
  real = Math.min(real, 1 / 30);   // タブ復帰で物理が吹っ飛ぶのを防ぐ

  tickInput();
  updateJuice(real);               // ヒットストップは実時間で解ける
  const dt = real * juice.timeScale;

  updateEdges(real);

  // カメラ
  if (slideT < 1) {
    slideT = Math.min(1, slideT + real / CFG.slideTime);
    const k = easeOut(slideT);
    camX = slideFrom[0] + (tgtX - slideFrom[0]) * k;
    camY = slideFrom[1] + (tgtY - slideFrom[1]) * k;
  } else { camX = tgtX; camY = tgtY; }

  // 画面揺れはワールドの transform に混ぜる。fx キャンバスは #world の外なので揺れない
  world.style.transform =
    `translate(${-(camX + peekX) + juice.sx}px, ${-(camY + peekY) + juice.sy}px)`;

  // 更新・描画は「見えているシーン」だけ。
  // スライド中の移動元は描かないが、キャンバスは最後のフレームを保持するので
  // 止まった絵のまま流れていくだけで破綻はしない
  const vis = new Set([active]);
  if (peekTarget) vis.add(peekTarget);

  for (const name of vis) {
    const sc = SCENES[name].s;
    sc.update?.(name === active ? dt : real * 0.999, name === active);
    sc.render?.();
  }

  renderFx(ctxFx);
  syncHud();
}

function frame(now) {
  tick((now - last) / 1000);
  last = now;
  requestAnimationFrame(frame);
}

// ── タイトル ────────────────────────────────────────
const titleLayer = $('#title-layer');
function startGame() {
  if (started) return;
  started = true;
  unlockAudio();                   // 自動再生ポリシー：最初のタップで解除
  titleLayer.classList.add('hide');
  setTimeout(() => { titleLayer.style.display = 'none'; }, 460);
  pickScene.enter?.();
}
titleLayer.addEventListener('pointerdown', startGame);

export function backToTitle() {
  started = false;
  titleLayer.style.display = '';
  titleLayer.classList.remove('hide');
  go('pick');
  camX = tgtX = 720; camY = tgtY = 1280; slideT = 1;
}

// ── 起動 ────────────────────────────────────────────
load();
initInput(stage);
for (const k in SCENES) SCENES[k].s.init?.();
// ResizeObserver なら、初期レイアウト確定・ウィンドウリサイズ・回転を1本で拾える
new ResizeObserver(doFit).observe(fit);
doFit();
window.addEventListener('orientationchange', () => setTimeout(doFit, 120));
slideT = 1;
syncHud();
requestAnimationFrame(frame);

// ブラウザのコンソールから触れるフック。
// タブが hidden だと RAF が止まるので、そのときは step() で手で進められる。
window.__hojiri = {
  go, S, step: (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); },
  scene: n => SCENES[n].s,
  start: startGame,
};
