// Pointer Events に一本化して、マウスとタッチを 1 系統で扱う。
// 画面座標 → 論理座標(720x1280) の変換はここに閉じ込め、シーン側は論理座標だけ見る。

import { W, H } from '../config.js';

export const Input = {
  x: W / 2, y: H / 2,   // 論理座標
  px: W / 2, py: H / 2, // 1フレーム前
  dx: 0, dy: 0,
  down: false,
  inside: false,
  type: 'mouse',        // マウスはホバーで、タッチは触れている間だけエッジを見る
  _downCb: [], _upCb: [], _moveCb: [],
};

/** エッジ判定を見てよい状態か。タッチは触れていないと座標が古いまま残る */
export const pointerLive = () =>
  Input.inside && (Input.type === 'mouse' ? true : Input.down);

let stageEl = null, fitScale = 1;

export function setFitScale(s) { fitScale = s; }

function toLogical(e) {
  const r = stageEl.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / fitScale,
    y: (e.clientY - r.top) / fitScale,
  };
}

export function initInput(stage) {
  stageEl = stage;

  const move = e => {
    const p = toLogical(e);
    Input.type = e.pointerType || 'mouse';
    Input.x = p.x; Input.y = p.y;
    Input.inside = p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
    Input._moveCb.forEach(f => f(p.x, p.y, e));
  };

  // down は stage 限定。move/up は window で拾う。
  // ここで stage.setPointerCapture() を使うと、以降の pointerup が stage に retarget され、
  // 子孫にある DOM ボタン（ショップの連打購入など）が自分の pointerup を受け取れなくなる。
  // window で拾えば、画面外で離しても取り逃さないという目的は同じまま達成できる。
  stage.addEventListener('pointerdown', e => {
    const p = toLogical(e);
    Input.type = e.pointerType || 'mouse';
    Input.x = p.x; Input.y = p.y; Input.px = p.x; Input.py = p.y;
    Input.inside = p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
    Input.down = true;
    Input._downCb.forEach(f => f(p.x, p.y, e));
  });

  window.addEventListener('pointermove', move);

  const up = e => {
    if (!Input.down) return;
    Input.down = false;
    const p = toLogical(e);
    Input._upCb.forEach(f => f(p.x, p.y, e));
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', () => { Input.down = false; });

  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('dragstart', e => e.preventDefault());
}

/** 毎フレームの頭で呼ぶ。dx/dy を作る */
export function tickInput() {
  Input.dx = Input.x - Input.px;
  Input.dy = Input.y - Input.py;
  Input.px = Input.x; Input.py = Input.y;
}

export const onDown = f => Input._downCb.push(f);
export const onUp   = f => Input._upCb.push(f);
export const onMove = f => Input._moveCb.push(f);

/** 端末を震わせる（対応端末のみ。Vibration API） */
export function buzz(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch {} }
}
