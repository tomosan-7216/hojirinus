// 鼻くそ図鑑
//
// seen（見た記録）は永久。stock（在庫）は飛ばすと減る。ここは seen を見て描く。
// 未所持でもシルエットが出るのは、形が seed から計算できるから（core/shape.js）。
// シークレットは存在自体を出さない。獲得すると末尾に枠が増える。
// カウントは通常枠だけで数え、シークレットは別枠 ── 総数でネタバレしないため。

import { BOOGERS, NORMAL, SECRETS, GODS, RARITY_COLOR, RARITY_LABEL } from '../data/boogers.js';
import { drawBooger, drawSilhouette } from '../core/shape.js';
import { S, hasSeen, stockOf, seenNormal, seenSecrets, dexMul } from '../state.js';
import { sfxThud } from '../core/audio.js';

export const collectionScene = { name: 'collection', locked: false };

const grid = () => document.querySelector('#col-grid');
let built = '';
let detail = null;

collectionScene.enter = function () { build(); };
collectionScene.exit = function () { closeDetail(); };

/** 表示対象。シークレットは獲得済みのものだけが末尾に増える */
const visible = () => [...NORMAL, ...SECRETS.filter(b => hasSeen(b.id))];

function key() {
  return visible().map(b => `${b.id}:${hasSeen(b.id) ? 1 : 0}:${stockOf(b.id)}`).join(',');
}

function build() {
  const k = key();
  if (k === built) return;   // 変化がなければ作り直さない
  built = k;

  const g = grid();
  g.innerHTML = '';
  for (const b of visible()) {
    const got = hasSeen(b.id);
    const cell = document.createElement('div');
    cell.className = 'col-cell' + (got ? ' got' : '') + (b.secret ? ' secret' : '');

    const cv = document.createElement('canvas');
    cv.width = 200; cv.height = 200;
    const ctx = cv.getContext('2d');
    if (got) drawBooger(ctx, b, 100, 100, 74);
    else drawSilhouette(ctx, b, 100, 100, 74);
    cell.appendChild(cv);

    if (got) {
      const r = document.createElement('div');
      r.className = 'col-rar';
      r.style.color = RARITY_COLOR[b.rarity];
      r.textContent = RARITY_LABEL[b.rarity];
      cell.appendChild(r);

      const st = document.createElement('div');
      st.className = 'col-stock';
      const n = stockOf(b.id);
      st.textContent = n > 0 ? `×${n}` : '在庫0';
      if (n === 0) st.style.color = '#7a6a62';
      cell.appendChild(st);
    }

    cell.addEventListener('click', () => openDetail(b, got));
    g.appendChild(cell);
  }

  document.querySelector('#col-count').textContent = `${seenNormal()} / ${NORMAL.length}`;

  // 四神は「あと何体」が見えていないとセットとして機能しない。
  // 揃ったら祝う。ここがこの図鑑で唯一のゴールらしいゴールになる。
  const gn = GODS.filter(b => hasSeen(b.id)).length;
  const sc = seenSecrets();
  const bits = [];
  bits.push(gn >= GODS.length ? `四神 ${gn}/${GODS.length} 制覇！` : `四神 ${gn}/${GODS.length}`);
  if (sc > 0) bits.push(`シークレット ${sc}`);
  const el = document.querySelector('#col-secret');
  el.textContent = bits.join('　');
  el.style.color = gn >= GODS.length ? '#ff7a1e' : '';

  // 集めた種類がそのままコイン倍率になる。見えないと集める理由にならない
  const dx = document.querySelector('#col-bonus');
  if (dx) dx.innerHTML = `集めるほど稼げる　コイン <b>×${dexMul().toFixed(2)}</b>`;
}

function openDetail(b, got) {
  closeDetail();
  sfxThud();
  const d = document.createElement('div');
  d.id = 'col-detail';

  const cv = document.createElement('canvas');
  cv.width = 420; cv.height = 420;
  const ctx = cv.getContext('2d');
  if (got) drawBooger(ctx, b, 210, 210, 160);
  else drawSilhouette(ctx, b, 210, 210, 160);
  d.appendChild(cv);

  const name = document.createElement('div');
  name.className = 'd-name';
  name.textContent = got ? b.name : '？？？';
  d.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'd-meta';
  if (got) {
    meta.innerHTML = `<span style="color:${RARITY_COLOR[b.rarity]}">${RARITY_LABEL[b.rarity]}</span>　大きさ ${b.size}`;
  } else {
    meta.textContent = 'まだ ほじり出していない';
  }
  d.appendChild(meta);

  const desc = document.createElement('div');
  desc.className = 'd-desc';
  desc.textContent = got ? b.desc : 'この形の鼻くそが、どこかに埋まっている。';
  d.appendChild(desc);

  if (got) {
    const st = document.createElement('div');
    st.className = 'd-stock';
    const n = stockOf(b.id);
    st.textContent = n > 0 ? `在庫 ${n}コ` : '在庫 0コ（図鑑の記録は消えない）';
    d.appendChild(st);
  }

  const cl = document.createElement('div');
  cl.className = 'd-close'; cl.textContent = 'タップで閉じる';
  d.appendChild(cl);

  d.addEventListener('click', closeDetail);
  document.querySelector('#cell-collection').appendChild(d);
  detail = d;
}

function closeDetail() {
  if (detail) { detail.remove(); detail = null; }
}

collectionScene.update = function (dt, isActive) {
  if (isActive) build();   // ほじって帰ってきたら反映する
};
collectionScene.render = function () {};
