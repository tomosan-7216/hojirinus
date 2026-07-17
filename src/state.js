// セーブデータ。Web Storage API (LocalStorage)。
//
// 設計の要： seen（図鑑＝見た記録・永久）と stock（在庫＝実体・消費される）を別テーブルにする。
// 飛ばすと stock だけが減り、seen は絶対に触らない。

import { CFG, SIZES, upCost } from './config.js';
import { BOOGERS, BY_ID, NORMAL, SECRETS } from './data/boogers.js';
import { clamp, weightedPick } from './core/util.js';

const KEY = 'hojirinus.save.v1';

const fresh = () => ({
  version: 1,
  seen: [],                                   // 図鑑：永久に消えない
  stock: {},                                  // 在庫：飛ばすと減る
  coins: 0,
  ups: { pick: 0, power: 0, speed: 0 },
  records: Object.fromEntries(SIZES.map(s => [s, 0])),   // サイズ別の自己ベスト
  stats: { picks: 0, flies: 0 },
});

export const S = fresh();

// セッション（今回の起動ぶん）の記録。リザルト画面用。保存しない。
export const session = { picks: 0, flies: 0, best: 0, news: [], coins: 0 };

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || d.version !== 1) return;
    Object.assign(S, fresh(), d);
    // マスタが増減しても在庫が壊れないようにする
    S.seen = (S.seen || []).filter(id => BY_ID[id]);
    for (const k of Object.keys(S.stock)) if (!BY_ID[k]) delete S.stock[k];
    for (const s of SIZES) if (typeof S.records[s] !== 'number') S.records[s] = 0;
  } catch (e) { console.warn('save load failed', e); }
}

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
  }, 500);
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch {}
  Object.assign(S, fresh());
}

// ── 図鑑 / 在庫 ─────────────────────────────────────

export const hasSeen = id => S.seen.includes(id);
export const stockOf = id => S.stock[id] || 0;
export const totalStock = () => Object.values(S.stock).reduce((a, b) => a + b, 0);

export const seenNormal  = () => NORMAL.filter(b => hasSeen(b.id)).length;
export const seenSecrets = () => SECRETS.filter(b => hasSeen(b.id)).length;

/** ほじり出した。戻り値の isNew が初登場かどうか */
export function gain(entry) {
  const isNew = !hasSeen(entry.id);
  if (isNew) S.seen.push(entry.id);          // 図鑑：一度登録したら永久
  S.stock[entry.id] = stockOf(entry.id) + 1; // 在庫：実体が1つ増える
  S.stats.picks++; session.picks++;

  let coin = CFG.coinPick[entry.rarity];
  if (isNew) coin += CFG.coinFirst[entry.rarity];
  addCoins(coin);
  save();
  return { isNew, coin };
}

/** 飛ばした。在庫だけ減る。図鑑は消えない */
export function consume(id) {
  if (stockOf(id) <= 0) return false;
  S.stock[id]--;
  if (S.stock[id] <= 0) delete S.stock[id];
  S.stats.flies++; session.flies++;
  save();
  return true;
}

export function addCoins(n) {
  S.coins += n;
  session.coins += n;
  save();
}

// ── 強化 ────────────────────────────────────────────

export const upLevel = k => S.ups[k] || 0;
export const upRate  = k => upLevel(k) * CFG.upStep;         // +0.5% / 回
export const costOf  = k => upCost(k, upLevel(k));
export const canBuy  = k => S.coins >= costOf(k);
/** 10%ごとのマイルストーン段数。0.5%は見えないが、10%は見える */
export const milestone = k => Math.floor(upRate(k) / CFG.milestoneStep);

export function buy(k) {
  const c = costOf(k);
  if (S.coins < c) return null;
  const before = milestone(k);
  S.coins -= c;
  S.ups[k]++;
  save();
  return { cost: c, milestoneUp: milestone(k) > before, level: upLevel(k) };
}

// ── 派生ステータス ───────────────────────────────────

export const pickPower  = () => upRate('pick');
export const playerPower = () => CFG.basePower * (1 + upRate('power'));
export const speedMul   = () => 1 + upRate('speed');

/** パワー充足率。デカい鼻くそが本気を出せているか */
export const powerRatio = size => clamp(playerPower() / CFG.reqPower[size], 0, 1);

/**
 * サイズボーナスはパワー充足率ぶんしか効かない。
 * これが「序盤はデカい鼻くそが本来の飛距離を出せず、強化して初めて活きる」の実装。
 * 下限は 1.0 ＝ パワー不足でも小より下回らせない。
 * 下回らせると「デカいの引いたのに損」になり、企画の芯にある
 * 『デカい鼻くそをひり出す快感』と正面から衝突するため。
 */
export function effBonus(size) {
  return 1 + (CFG.sizeBonus[size] - 1) * powerRatio(size);
}

/** 初速。gauge は 0..1 */
export function launchV(size, gauge) {
  return CFG.baseV * speedMul() * gauge * effBonus(size);
}

/** 飛距離。d = v^2 sin(2θ)/g ── 45°が最適なのは物理からタダで出る */
export function distanceOf(size, gauge, angleDeg) {
  const v = launchV(size, gauge);
  return v * v * Math.sin(2 * angleDeg * Math.PI / 180) / CFG.gravity;
}

/** ショップ用：45°・満タンの想定飛距離 */
export const simDist = size => distanceOf(size, 1, 45);

export function updateRecord(size, d) {
  if (d > (S.records[size] || 0)) { S.records[size] = d; save(); return true; }
  return false;
}

// ── 抽選 ────────────────────────────────────────────

/**
 * レア度 → エントリ の2段抽選。ほじり力 p が両段に効く。
 * N の重みは据え置き、上位の重みだけ増やす。正規化の結果として N が相対的に減る。
 * これで「レア鼻くそ及びデカい鼻くその取れる確率アップ」を1ステータスで賄える。
 */
export function roll() {
  const p = pickPower();
  const rarities = Object.keys(CFG.baseW);
  const r = weightedPick(rarities, k => CFG.baseW[k] * (1 + p * CFG.rarityBias[k]));
  const pool = BOOGERS.filter(b => b.rarity === r);
  return weightedPick(pool, b => (b.w ?? 1) * (1 + p * CFG.sizeBias[b.size]));
}
