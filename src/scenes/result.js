// セッションリザルト（画面下）
//
// Web にプロセス終了はないので「やめる」を締めの画面にした。
// 企画の「気が済むまでほじって飛ばして辞める、セッション型の遊び」に、
// 終わりの一拍を与える。誤爆したときの被害が唯一大きいセルなので、
// ここだけは確定後にもう一段の確認を挟む（エッジ即遷移では終わらせない）。

import { S, session, seenNormal, seenSecrets, totalStock } from '../state.js';
import { NORMAL } from '../data/boogers.js';
import { SIZES } from '../config.js';
import { fmt, fmtDist } from '../core/util.js';

export const resultScene = { name: 'result', locked: false };

resultScene.init = function () {
  document.querySelector('#btn-back').addEventListener('click', () => {
    import('../main.js').then(m => m.go('pick'));
  });
  document.querySelector('#btn-quit').addEventListener('click', () => {
    import('../main.js').then(m => m.backToTitle());
  });
};

resultScene.enter = function () {
  const best = SIZES.reduce((a, s) => Math.max(a, S.records[s] || 0), 0);
  const rows = [
    ['ほじった数', `${session.picks}コ`],
    ['飛ばした数', `${session.flies}コ`],
    ['稼いだコイン', fmt(session.coins)],
    ['図鑑', `${seenNormal()} / ${NORMAL.length}${seenSecrets() ? `　＋シークレット ${seenSecrets()}` : ''}`],
    ['自己ベスト', best > 0 ? fmtDist(best) : 'まだ飛ばしていない'],
    ['在庫', `${fmt(totalStock())}コ`],
  ];
  document.querySelector('#result-body').innerHTML =
    `<div class="r-lead">今回のセッション</div>` +
    rows.map(([k, v]) => `<div class="r-row">${k}　<b>${v}</b></div>`).join('');
};

resultScene.update = function () {};
resultScene.render = function () {};
