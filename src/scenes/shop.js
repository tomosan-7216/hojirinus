// ショップ
//
// +0.5% は単体では絶対に体感できない。そこを直接どうにかしようとせず、4方向から埋める。
//  1. 長押し連打購入：SEのピッチが1段ずつ上がる。ほじり/飛ばしと同じ「長押しで溜める快感」を横断させる
//  2. 10%ごとのマイルストーン：指のビジュアルが変わる。0.5%は見えないが10%は見える
//  3. 購入直後のその場デモ（カードが光ってバーが伸びる）
//  4. 想定飛距離の常時表示：パワー不足のサイズが赤字で、強化すると やがて赤字が解ける

import { CFG, SIZES } from '../config.js';
import { fmt, fmtDist } from '../core/util.js';
import { sfxBuy, sfxMilestone } from '../core/audio.js';
import { flash, popup } from '../core/juice.js';
import { buzz } from '../core/input.js';
import {
  S, costOf, canBuy, buy, upRate, upLevel, milestone,
  simDist, powerRatio,
} from '../state.js';

export const shopScene = { name: 'shop', locked: false };

const KEYS = ['pick', 'power', 'speed'];
let cards = {};

shopScene.init = function () {
  const list = document.querySelector('#shop-list');
  for (const k of KEYS) {
    const c = CFG.ups[k];
    const el = document.createElement('div');
    el.className = 'up';
    el.innerHTML = `
      <div class="up-head"><span class="up-name">${c.name}</span><span class="up-val" data-val>+0.0%</span></div>
      <div class="up-desc">${c.desc}</div>
      <div class="up-bar"><i data-bar></i></div>
      <div class="up-milestone" data-ms></div>
      <button class="buy" data-buy>◉ <span data-cost>0</span></button>`;
    list.appendChild(el);
    cards[k] = {
      el,
      val: el.querySelector('[data-val]'),
      bar: el.querySelector('[data-bar]'),
      ms:  el.querySelector('[data-ms]'),
      btn: el.querySelector('[data-buy]'),
      cost: el.querySelector('[data-cost]'),
    };
    bindBuy(k, cards[k]);
  }

  const sim = document.querySelector('#sim-list');
  for (const s of SIZES) {
    const row = document.createElement('div');
    row.className = 'sim-row';
    row.innerHTML = `<span class="s-name">${s}</span><span class="s-d" data-d>—</span>`;
    sim.appendChild(row);
    cards['sim_' + s] = { row, d: row.querySelector('[data-d]') };
  }
  refresh();
};

shopScene.enter = function () { refresh(); };
shopScene.exit  = function () { stopRepeat(); };

// ── 長押し連打購入 ───────────────────────────────────
let timer = null, streak = 0;

function bindBuy(k, c) {
  c.btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!doBuy(k, c)) return;
    streak = 0;
    const tick = () => {
      if (!doBuy(k, c)) { stopRepeat(); return; }
      streak++;
      timer = setTimeout(tick, Math.max(45, 260 - streak * 16));
    };
    timer = setTimeout(tick, 360);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    c.btn.addEventListener(ev, stopRepeat);
  }
}
function stopRepeat() { clearTimeout(timer); timer = null; streak = 0; }

// 指がボタンの外で離れても必ず止める。ここが抜けると連打が止まらず、
// コインが尽きるまで買い続けてしまう
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, stopRepeat);
window.addEventListener('blur', stopRepeat);

function doBuy(k, c) {
  const r = buy(k);
  if (!r) { return false; }
  sfxBuy(streak);            // 押し続けるとピッチが上がっていく
  buzz(6);
  c.el.classList.remove('flash'); void c.el.offsetWidth; c.el.classList.add('flash');
  if (r.milestoneUp) {
    sfxMilestone();
    flash('#ffd97a', .25, .14);
    buzz([12, 30, 12]);
    popup(360, 300, `${CFG.ups[k].name} ${milestone(k) * 10}%`, '#ffd97a', 36);
  }
  refresh();
  return true;
}

// ── 表示 ────────────────────────────────────────────
function refresh() {
  for (const k of KEYS) {
    const c = cards[k];
    const rate = upRate(k), ms = milestone(k);
    c.val.textContent = `+${(rate * 100).toFixed(1)}%`;
    // バーは 10% きざみで一周する。0.5%でも「バーは動く」
    c.bar.style.width = `${((rate % CFG.milestoneStep) / CFG.milestoneStep) * 100}%`;
    c.ms.textContent = ms > 0 ? `★ ${ms * 10}% 到達（Lv.${upLevel(k)}）` : `Lv.${upLevel(k)}`;
    const cost = costOf(k);
    c.cost.textContent = fmt(cost);
    const ok = canBuy(k);
    c.btn.disabled = !ok;
    c.el.classList.toggle('poor', !ok);
  }

  for (const s of SIZES) {
    const c = cards['sim_' + s];
    const pr = powerRatio(s);
    if (pr >= 1) {
      c.row.classList.remove('locked');
      c.d.textContent = `${fmtDist(simDist(s))}　本気`;
    } else {
      // パワー不足のサイズは赤字。強化すると やがて解ける。
      // 「パワー不足 94%」だと94%足りないのか94%満たしているのか読めないので、
      // 充足率そのものを「本気度」として出す
      c.row.classList.add('locked');
      c.d.textContent = `${fmtDist(simDist(s))}　本気度 ${Math.round(pr * 100)}%`;
    }
  }

  document.querySelector('#shop-coins').textContent = fmt(S.coins);
}

shopScene.update = function () {};
shopScene.render = function () {};
