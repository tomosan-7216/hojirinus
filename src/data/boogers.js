// 鼻くそマスタ
//
// 形状は seed から手続き生成する（core/shape.js）。画像を持たない。
// これによって「未所持でもシルエットは図鑑に出る」が自動的に満たされる。
// 形が seed から決まるので、シルエットと実物が必ず一致する。
//
// size と rarity は独立した軸。
// 「よく出るくせにバカでかい鼻くそ」や「激レアなのに極小の鼻くそ」がいる方が図鑑として面白い。
//
// spike   : とげとげ度
// stretch : 横長度
// w       : 同レア度内での相対重み

export const BOOGERS = [
  // ── N (9) ───────────────────────────────────────────
  { id:'n01', name:'ふつうの鼻くそ',   size:'小', rarity:'N', seed:10133, color:'#c8a552', w:1.4,
    desc:'これといって特徴がない。実家のような安心感がある。' },
  { id:'n02', name:'しめった鼻くそ',   size:'小', rarity:'N', seed:20441, color:'#9ab36a', w:1.2,
    desc:'まだ若い。もう少し待てばよかったかもしれない。' },
  { id:'n03', name:'かわいた鼻くそ',   size:'中', rarity:'N', seed:30877, color:'#b98c46', w:1.2,
    desc:'ほどよく乾燥。指離れが良い優等生。' },
  { id:'n04', name:'ちいさな鼻くそ',   size:'小', rarity:'N', seed:41233, color:'#d4b76e', w:1.0,
    desc:'小さすぎて達成感がない。だが数は正義である。' },
  { id:'n05', name:'ねばねば鼻くそ',   size:'中', rarity:'N', seed:52901, color:'#8fae52', w:1.0,
    desc:'指から離れない。飛ばしても付いてくる気がしてならない。' },
  { id:'n06', name:'ころころ鼻くそ',   size:'小', rarity:'N', seed:63117, color:'#c9a75e', w:1.0,
    desc:'丸めた。丸めてしまった。もう元には戻らない。' },
  { id:'n07', name:'ほこり鼻くそ',     size:'中', rarity:'N', seed:71559, color:'#8e8378', w:0.9,
    desc:'綿ぼこりが練り込まれている。部屋の掃除をしなさい。' },
  { id:'n08', name:'うすい鼻くそ',     size:'小', rarity:'N', seed:80233, color:'#e0cf9c', w:0.9, stretch:0.35,
    desc:'皮のような何か。これを鼻くそと呼んでいいのか審議したい。' },
  { id:'n09', name:'でかめの鼻くそ',   size:'大', rarity:'N', seed:90677, color:'#bb9440', w:0.7,
    desc:'Nのくせに態度がでかい。よく出るのにデカい、お得な一品。' },

  // ── R (7) ───────────────────────────────────────────
  { id:'r01', name:'かちこち鼻くそ',   size:'大',  rarity:'R', seed:110293, color:'#a8763a', w:1.2,
    desc:'乾燥しきって岩のようになった一品。ぶつけると痛い。' },
  { id:'r02', name:'ぐんかん鼻くそ',   size:'特大', rarity:'R', seed:120451, color:'#7d6a4e', w:0.8, stretch:0.4,
    desc:'威風堂々。鼻腔に停泊していた。抜錨の音が鳴った気がした。' },
  { id:'r03', name:'とげとげ鼻くそ',   size:'中',  rarity:'R', seed:130987, color:'#c4703a', w:1.1, spike:0.75,
    desc:'取り出す時に痛かった。たぶん血が出た。見なかったことにする。' },
  { id:'r04', name:'まっくろ鼻くそ',   size:'中',  rarity:'R', seed:141233, color:'#3f3a38', w:1.1,
    desc:'都会に住んでいる証。空気がわるい。あなたの肺もこうなっている。' },
  { id:'r05', name:'ふたご鼻くそ',     size:'中',  rarity:'R', seed:150761, color:'#cbaa5e', w:0.9, stretch:0.55,
    desc:'2つ同時に出てきた。仲良し。引き離すのは忍びない。' },
  { id:'r06', name:'ながい鼻くそ',     size:'大',  rarity:'R', seed:160339, color:'#b8a05a', w:0.9, stretch:0.75,
    desc:'どこまで続くのか不安になる長さ。というか、まだ出る。' },
  { id:'r07', name:'おおもの鼻くそ',   size:'特大', rarity:'R', seed:170887, color:'#a98632', w:0.7,
    desc:'本日の大物。鼻の穴が一回り広がった。代償は小さくない。' },

  // ── SR (5) ──────────────────────────────────────────
  { id:'s01', name:'こはく鼻くそ',     size:'大',  rarity:'SR', seed:210493, color:'#e8912a', w:1.1,
    desc:'透き通っている。中に太古の花粉が閉じ込められている。学術的価値、あり。' },
  { id:'s02', name:'ダイヤ鼻くそ',     size:'中',  rarity:'SR', seed:220717, color:'#7fd8e8', w:1.0, spike:0.5,
    desc:'硬度10。鼻の中でいったい何が起きた。地質学者を呼べ。' },
  { id:'s03', name:'ようがん鼻くそ',   size:'特大', rarity:'SR', seed:230181, color:'#e8452a', w:0.8,
    desc:'熱い。鼻の奥にマグマだまりがあったらしい。避難勧告を出す。' },
  { id:'s04', name:'くもり鼻くそ',     size:'大',  rarity:'SR', seed:240955, color:'#b8c4d8', w:0.9,
    desc:'握ると雨が降る。天気予報より当たると評判。気象庁が黙っていない。' },
  { id:'s05', name:'キノコ鼻くそ',     size:'大',  rarity:'SR', seed:250337, color:'#d86a8a', w:0.9, spike:0.4,
    desc:'生えていた。断じて育てていた覚えはない。食用かどうかは不明。' },

  // ── UR (3) ──────────────────────────────────────────
  { id:'u01', name:'おうごん鼻くそ',   size:'特大', rarity:'UR', seed:310661, color:'#ffc819', w:1.2,
    desc:'黄金。売れば一生遊んで暮らせる。ただし、鼻くそである。' },
  { id:'u02', name:'ぎんが鼻くそ',     size:'伝説', rarity:'UR', seed:320139, color:'#7a5ce0', w:0.9,
    desc:'内部に恒星系を確認。……これ、ほじってよかったのか？' },
  { id:'u03', name:'ごほんぞん鼻くそ', size:'伝説', rarity:'UR', seed:330827, color:'#ffe89a', w:0.9,
    desc:'拝むと御利益があるらしい。鼻から出てきたものを拝むのか、あなたは。' },

  // ── SECRET (2) ── 図鑑に存在自体を出さない ─────────────
  { id:'x01', name:'はなくそ大王',     size:'伝説', rarity:'SECRET', seed:410593, color:'#b03cd0', w:1, secret:true, spike:0.35,
    desc:'全ての鼻くその王。鼻の奥の玉座に座していた。統治は終わった。' },
  { id:'x02', name:'じぶん',           size:'特大', rarity:'SECRET', seed:420271, color:'#e8dcc8', w:1, secret:true,
    desc:'あなたによく似ている。よく見ると呼吸をしている。鏡を見るな。' },
];

export const BY_ID = Object.fromEntries(BOOGERS.map(b => [b.id, b]));

/** 図鑑の通常枠（シークレットを除いた総数）。カウント表示のぶんまで隠したくないので分ける。 */
export const NORMAL = BOOGERS.filter(b => !b.secret);
export const SECRETS = BOOGERS.filter(b => b.secret);

export const RARITY_COLOR = {
  N: '#9a8f86', R: '#5ec8e8', SR: '#c47ae8', UR: '#ffc819', SECRET: '#ff5ea8',
};
export const RARITY_STARS = { N: 1, R: 2, SR: 3, UR: 4, SECRET: 5 };
