// ホジリヌス - file:// 用の結合版。build.ps1 が生成する。直接編集しない。
// 中身は src/ の各モジュールをそのまま順に並べ、import/export だけを差し替えたもの。
(function () {
  var __M = {};
  function __req(k) { return __M[k]; }
  function __def(k, f) { __M[k] = f(); }

  // ---------- src/config.js ----------
  __def('config', function () {
    // ホジリヌス チューニング定数
    // 触りたい数字は全部ここ。他のファイルに数字を散らさない。
    
    // 1文1名で書く。file:// 用のバンドル生成が export 名を拾えるようにするため
    const W = 720;
    const H = 1280;
    
    const SIZES  = ['小', '中', '大', '特大', '伝説'];
    // GOD = 四神。UR の上に置く。シークレットと違って図鑑に枠が見えるのが肝で、
    // 「あと2体」が見えているからこそ揃えたくなる。隠したらセットの意味がない。
    const RARITY = ['N', 'R', 'SR', 'UR', 'GOD', 'SECRET'];
    
    const CFG = {
    
      // ── ほじり ───────────────────────────────
      // 動かした量でゲージが溜まる（NIKKE のぬいぐるみ方式）。止めると進まない。
      // 当初は「グリグリしてもしなくても同じ速度」だったが、それだと
      // プレイヤーの入力が結果に一切影響せず、ほじる手応えが演出だけで支えられていた。
      // 動かした量で溜めるようにして、グリグリそのものを行為として意味づける。
      digDist: 3600,          // ゲージ満タンに必要な移動量（論理px）。ほじりスピードで減る
      digCapPerSec: 2600,     // 1秒あたりに稼げる移動量の上限。速く振り回すだけの攻略を潰す
      // 動かしてさえいれば最低これだけは進む（ゲージ/秒）。
      // 移動量だけだと、ちまちま動かす人と振り回す人で7倍以上の差がついて、
      // 控えめな人が20秒経っても溜まらない。止めればゼロなのは変わらない。
      digAssist: 0.12,
      digMoveMin: 1.5,        // これ未満の移動は「止まっている」とみなす（論理px/フレーム）
      whiffTime: 0.75,        // 溜まりきる前に離した時の「スカ」
    
      nose: {
        cx: 360, cy: 620,
        nostrilY: 762,
        nostrilDX: 74,        // 中心から左右へ
        nostrilRX: 46, nostrilRY: 32,
        depthMax: 62,         // 穴の中に入れる深さ
      },
    
      // ── 抽選 ─────────────────────────────────
      // N の重みは据え置き、上位の重みだけ ほじり力 p で増やす。
      // 正規化の結果として N が相対的に減る。1ステータスでレア度もサイズも賄える。
      // GOD は4体で枠を分け合うので、枠の重みは薄めでも1体あたりはさらに薄くなる。
      // そのぶん rarityBias を高くして、ほじり力の強化がはっきり効くようにする
      // （＝「揃えたいなら鼻ほじり力を上げろ」という導線になる）。
      baseW:      { N: 60, R: 25,  SR: 11,  UR: 3.5, GOD: 0.8, SECRET: 0.5 },
      rarityBias: { N: 0,  R: 1,   SR: 2.5, UR: 5,   GOD: 7,   SECRET: 8   },
      sizeBias:   { 小: 0, 中: 0.5, 大: 1.5, 特大: 3, 伝説: 5    },
    
      // ── 飛ばし ───────────────────────────────
      sizeBonus: { 小: 1.0, 中: 1.3, 大: 1.7, 特大: 2.2, 伝説: 3.0 },
    
      // reqPower の幅は basePower の 3倍以内に収める。
      // 強化は +0.5% の加算なので、現実的な購入回数(〜400回)で playerPower はせいぜい3倍にしかならない。
      // ここを開きすぎると伝説の「パワー不足」が永久に解けず、
      // ショップの「やがて赤字が解ける」という約束が嘘になる。
      reqPower:  { 小: 20,  中: 28,  大: 38,  特大: 48,  伝説: 60 },
      basePower: 20,          // 小 は最初から充足率1.0（＝いつでも本気を出せる）
      baseV:     18,
      gravity:   9.8,
    
      angleCycle:   2.2,      // メトロノーム往復の周期(秒)。速すぎると45°が運になる
      chargeTime:   1.2,      // ゲージが満タンになるまで。満タン後も押し続けられる
      hitstopLo:    40,       // この角度帯 かつ 満タンでヒットストップ
      hitstopHi:    45,
    
      // ── コイン ───────────────────────────────
      // ほじり収入は伸びない。飛ばし収入は強化とともに伸びる。
      // 序盤はほじりが生活費を稼ぎ、強化が進むと飛ばしが主収入になる。
      coinPick:  { N: 2,  R: 6,  SR: 20,  UR: 70,  GOD: 150,  SECRET: 200  },
      coinFirst: { N: 30, R: 80, SR: 250, UR: 800, GOD: 1500, SECRET: 2000 },
      // ゴールも競争相手も無いゲームなので、渋くする理由がない。
      // 面白いのはほじりと飛ばしであって、貯金ではない。
      coinPerM:  2.5,
      bestMul:   2,           // 自己ベスト更新で飛ばし分が倍
    
      // ── 強化 ─────────────────────────────────
      // 伝説の充足率1.0には power を約400回。1.045 だと400回目が10億コインになって到達不能なので、
      // 伸びを緩くして「買い続けられる」曲線にする。
      upStep:   0.005,        // 1回で +0.5%
      upGrowth: 1.012,
      ups: {
        pick:  { base: 50, name: '鼻ほじり力',     desc: 'レア鼻くそ・デカい鼻くそが出やすくなる' },
        dig:   { base: 45, name: 'ほじりスピード',   desc: '少ないグリグリでゲージが溜まる。指が疲れなくなる' },
        power: { base: 40, name: '鼻くそ飛ばしパワー', desc: '重い鼻くそを飛ばす力。デカいやつの本気が出る' },
        speed: { base: 60, name: '鼻くそ飛ばし速度',   desc: '鼻くそを遠くに飛ばす力' },
      },
      milestoneStep: 0.10,    // 10%ごとに指が変化する（0.5%は見えないが10%は見える）
    
      // ── エッジ遷移 ───────────────────────────
      edgeBand:   62,         // 端からこの距離が反応帯
      edgePeek:   86,         // 隣シーンが覗く最大量
      edgeCommit: 0.62,       // 帯の奥 62% まで押し込んだら確定
      // または帯内にこの秒数とどまったら確定。
      // スマホでは画面の物理端まで指を運ぶ動作が Android の戻るジェスチャーとぶつかるので、
      // 「端まで行かなくても確定できる」逃げ道として要る。
      // ただし短いと事故るので、インジケータで見えるようになったぶん伸ばした（0.28→0.45）。
      edgeDwell:  0.45,
      slideTime:  0.30,
    };
    
    // 強化コスト
    const upCost = (key, n) => Math.floor(CFG.ups[key].base * Math.pow(CFG.upGrowth, n));
    
    return { CFG, H, RARITY, SIZES, upCost, W };
  });

  // ---------- src/core/util.js ----------
  __def('util', function () {
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    const lerp  = (a, b, t) => a + (b - a) * t;
    const smooth = t => t * t * (3 - 2 * t);
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
    const TAU = Math.PI * 2;
    
    /** seed から決定的な乱数を作る。鼻くその形状がセッションをまたいで変わらないために必要。 */
    function mulberry32(a) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    
    /** [{...}, weight] の配列から重み付き抽選 */
    function weightedPick(items, weightOf, rng = Math.random) {
      let total = 0;
      for (const it of items) total += weightOf(it);
      let r = rng() * total;
      for (const it of items) { r -= weightOf(it); if (r <= 0) return it; }
      return items[items.length - 1];
    }
    
    const fmt = n => Math.floor(n).toLocaleString('ja-JP');
    
    /** 飛距離の表示。1000m を超えたら km にする（宇宙まで飛ぶので） */
    function fmtDist(m) {
      if (m >= 1000) return (m / 1000).toFixed(2) + 'km';
      return m.toFixed(1) + 'm';
    }
    
    return { clamp, easeOut, easeOutBack, fmt, fmtDist, lerp, mulberry32, smooth, TAU, weightedPick };
  });

  // ---------- src/data/boogers.js ----------
  __def('boogers', function () {
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
    
    const BOOGERS = [
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
    
      // ── SR (10) ─────────────────────────────────────────
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
      { id:'s06', name:'オーロラ鼻くそ',   size:'中',  rarity:'SR', seed:260713, color:'#4de0b0', w:0.9,
        desc:'見る角度で色が変わる。極夜の空をそのまま閉じ込めたらしい。鼻の中は極寒だったのか。' },
      { id:'s07', name:'ハチミツ鼻くそ',   size:'大',  rarity:'SR', seed:270259, color:'#f0a81c', w:1.0,
        desc:'甘い匂いがする。指から糸を引く。舐めるな。絶対に舐めるな。' },
      { id:'s08', name:'ばくだん鼻くそ',   size:'特大', rarity:'SR', seed:280631, color:'#3a3f4a', w:0.8, spike:0.3,
        desc:'導火線が付いている。誰が火をつけた。飛ばすなら早めに飛ばしたほうがいい。' },
      { id:'s09', name:'メカ鼻くそ',       size:'大',  rarity:'SR', seed:290187, color:'#8e9aa8', w:0.9, spike:0.55,
        desc:'関節が可動する。自律行動の痕跡あり。あなたの鼻で何が製造されていたのか。' },
      { id:'s10', name:'こけむし鼻くそ',   size:'特大', rarity:'SR', seed:300941, color:'#6a9440', w:0.8,
        desc:'苔むしている。数百年は放置されていた計算になる。あなたは何歳だ。' },
    
      // ── UR (7) ──────────────────────────────────────────
      { id:'u01', name:'おうごん鼻くそ',   size:'特大', rarity:'UR', seed:310661, color:'#ffc819', w:1.2,
        desc:'黄金。売れば一生遊んで暮らせる。ただし、鼻くそである。' },
      { id:'u02', name:'ぎんが鼻くそ',     size:'伝説', rarity:'UR', seed:320139, color:'#7a5ce0', w:0.9,
        desc:'内部に恒星系を確認。……これ、ほじってよかったのか？' },
      { id:'u03', name:'ごほんぞん鼻くそ', size:'伝説', rarity:'UR', seed:330827, color:'#ffe89a', w:0.9,
        desc:'拝むと御利益があるらしい。鼻から出てきたものを拝むのか、あなたは。' },
      { id:'u04', name:'ブラックホール鼻くそ', size:'伝説', rarity:'UR', seed:340193, color:'#1a1424', w:0.8,
        desc:'光を吸う。近づけた指の先が微妙に短い気がする。気のせいだと思いたい。' },
      { id:'u05', name:'げんしろ鼻くそ',   size:'特大', rarity:'UR', seed:350471, color:'#7ff03a', w:0.9, spike:0.35,
        desc:'自ら発光し、発熱している。臨界に達する前に飛ばすことを強く推奨する。' },
      { id:'u06', name:'マグマ鼻くそ',     size:'伝説', rarity:'UR', seed:360929, color:'#ff5a1e', w:0.85,
        desc:'地殻の底から来た。鼻とマントルが繋がっているという説の、動かぬ証拠。' },
      { id:'u07', name:'こだいのカケラ',   size:'特大', rarity:'UR', seed:370317, color:'#c8b088', w:0.95, spike:0.3,
        desc:'碑文が刻まれている。解読したところ「かえせ」と書いてあった。' },
    
      // ── GOD (4) ── 四神。UR の上。揃えたくなる「セット」 ────
      // 全部 伝説 サイズで統一してある。飛ばすには最大級のパワーが要るので、
      // 「引く」だけでなく「飛ばせるようにする」まで含めて終盤の目標になる。
      { id:'g01', name:'青龍鼻くそ',       size:'伝説', rarity:'GOD', seed:410233, color:'#22b6c8', w:1, stretch:0.8,
        desc:'東を守護する蒼き龍。長い。まだ出る。まだ出る。鼻腔の東側に棲んでいたらしい。' },
      { id:'g02', name:'朱雀鼻くそ',       size:'伝説', rarity:'GOD', seed:420617, color:'#f2452a', w:1, spike:0.7,
        desc:'南を守護する朱き霊鳥。指先で燃えている。熱いが、離すと逃げるので我慢しろ。' },
      { id:'g03', name:'白虎鼻くそ',       size:'伝説', rarity:'GOD', seed:430859, color:'#eaf0f4', w:1, spike:0.45,
        desc:'西を守護する白き虎。取り出す際に指を引っ掻かれた。鼻の中で飼っていた覚えはない。' },
      { id:'g04', name:'玄武鼻くそ',       size:'伝説', rarity:'GOD', seed:440371, color:'#2e3352', w:1,
        desc:'北を守護する黒き亀。硬い。びくともしない。数千年ぶりに首を出したのがあなたの鼻とは。' },
    
      // ── SECRET (2) ── 図鑑に存在自体を出さない ─────────────
      { id:'x01', name:'はなくそ大王',     size:'伝説', rarity:'SECRET', seed:410593, color:'#b03cd0', w:1, secret:true, spike:0.35,
        desc:'全ての鼻くその王。鼻の奥の玉座に座していた。統治は終わった。' },
      { id:'x02', name:'じぶん',           size:'特大', rarity:'SECRET', seed:420271, color:'#e8dcc8', w:1, secret:true,
        desc:'あなたによく似ている。よく見ると呼吸をしている。鏡を見るな。' },
    ];
    
    const BY_ID = Object.fromEntries(BOOGERS.map(b => [b.id, b]));
    
    /** 図鑑の通常枠（シークレットを除いた総数）。カウント表示のぶんまで隠したくないので分ける。 */
    const NORMAL = BOOGERS.filter(b => !b.secret);
    const SECRETS = BOOGERS.filter(b => b.secret);
    
    const RARITY_COLOR = {
      N: '#9a8f86', R: '#5ec8e8', SR: '#c47ae8', UR: '#ffc819', GOD: '#ff7a1e', SECRET: '#ff5ea8',
    };
    const RARITY_STARS = { N: 1, R: 2, SR: 3, UR: 4, GOD: 5, SECRET: 5 };
    /** 図鑑やリビールで「UR」ではなく漢字で見せる */
    const RARITY_LABEL = { N: 'N', R: 'R', SR: 'SR', UR: 'UR', GOD: '神', SECRET: 'SECRET' };
    
    /** 四神。セットとして進捗を出すために切り出す */
    const GODS = BOOGERS.filter(b => b.rarity === 'GOD');
    
    return { BOOGERS, BY_ID, GODS, NORMAL, RARITY_COLOR, RARITY_LABEL, RARITY_STARS, SECRETS };
  });

  // ---------- src/core/shape.js ----------
  __def('shape', function () {
    // 鼻くその形状を seed から手続き生成する。
    //
    // 円周上の半径を、ランダムな位相・周波数のサイン波を重ねてゆらす。
    // これで「ぼこぼこした閉曲線」が seed ごとに一意に決まる。
    // 画像アセットが要らないのと、未所持でもシルエットが描けるのが利点。
    
    var { mulberry32, TAU, clamp } = __req('util');
    
    const cache = new Map();
    
    /** entry -> 正規化された頂点列（最大半径が 1 になるようスケール済み） */
    function boogerPoints(entry) {
      const key = entry.id;
      if (cache.has(key)) return cache.get(key);
    
      const rng = mulberry32(entry.seed);
      const spike = entry.spike ?? 0;
      const stretch = entry.stretch ?? 0;
      const N = 72;
    
      // 3本のサイン波を重ねる。
      // 振幅を欲張るとヒトデになるので、合計が半径の 3割を超えないように抑える。
      const layers = [];
      for (let i = 0; i < 3; i++) {
        layers.push({
          f: 2 + Math.floor(rng() * 3),   // 高い周波数を許すとローブが増えてヒトデになる
          a: 0.3 + rng() * 0.7,
          p: rng() * TAU,
        });
      }
      const norm = layers.reduce((s, L) => s + L.a, 0);
      const spikeF = 5 + Math.floor(rng() * 5);
    
      const pts = [];
      let max = 0;
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU;
        let r = 1;
        for (const L of layers) r += Math.sin(a * L.f + L.p) * (L.a / norm) * 0.22;
        if (spike > 0) r += Math.pow(Math.abs(Math.sin(a * spikeF * 0.5 + 0.7)), 3) * spike * 0.4;
        r = Math.max(0.35, r);
        const x = Math.cos(a) * r * (1 + stretch * 0.85);
        const y = Math.sin(a) * r * (1 - stretch * 0.3);
        max = Math.max(max, Math.hypot(x, y));
        pts.push([x, y]);
      }
      for (const p of pts) { p[0] /= max; p[1] /= max; }
    
      cache.set(key, pts);
      return pts;
    }
    
    /** 頂点列を滑らかな閉パスにして ctx に積む（中点を通る二次ベジェ） */
    function tracePath(ctx, pts, x, y, r, rot = 0, squash = 1) {
      const c = Math.cos(rot), s = Math.sin(rot);
      const P = pts.map(([px, py]) => {
        const sx = px * r, sy = py * r * squash;
        return [x + sx * c - sy * s, y + sx * s + sy * c];
      });
      ctx.beginPath();
      const n = P.length;
      let mx = (P[n - 1][0] + P[0][0]) / 2, my = (P[n - 1][1] + P[0][1]) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < n; i++) {
        const cur = P[i], nxt = P[(i + 1) % n];
        ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
      }
      ctx.closePath();
    }
    
    function shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      const r = clamp(((n >> 16) & 255) + amt, 0, 255);
      const g = clamp(((n >> 8) & 255) + amt, 0, 255);
      const b = clamp((n & 255) + amt, 0, 255);
      return `rgb(${r|0},${g|0},${b|0})`;
    }
    
    /** 鼻くそ本体を描く */
    function drawBooger(ctx, entry, x, y, r, rot = 0, squash = 1) {
      const pts = boogerPoints(entry);
      ctx.save();
    
      tracePath(ctx, pts, x, y, r, rot, squash);
    
      const g = ctx.createRadialGradient(x - r * .32, y - r * .38, r * .06, x, y, r * 1.15);
      g.addColorStop(0, shade(entry.color, 62));
      g.addColorStop(.55, entry.color);
      g.addColorStop(1, shade(entry.color, -58));
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = r * .3;
      ctx.shadowOffsetY = r * .1;
      ctx.fill();
    
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = Math.max(1.2, r * .045);
      ctx.strokeStyle = shade(entry.color, -80);
      ctx.stroke();
    
      // てかり
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = .5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(x - r * .34, y - r * .4, r * .22, r * .13, -0.7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = .22;
      ctx.beginPath();
      ctx.ellipse(x + r * .2, y + r * .36, r * .3, r * .1, 0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    
      ctx.restore();
    }
    
    /** 未所持のシルエット。形は同じ seed から出るので、実物と必ず一致する。 */
    function drawSilhouette(ctx, entry, x, y, r) {
      const pts = boogerPoints(entry);
      ctx.save();
      tracePath(ctx, pts, x, y, r);
      ctx.fillStyle = '#191013';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2e1e26';
      ctx.stroke();
      ctx.restore();
    }
    
    return { boogerPoints, drawBooger, drawSilhouette, tracePath };
  });

  // ---------- src/core/audio.js ----------
  __def('audio', function () {
    // Web Audio API で SE を手続き生成する。音声ファイルを一切持たない。
    // 「ポン！」= 急降下するサイン波 + バンドパスを通したノイズのクリック、で作れる。
    
    let ac = null, master = null, noiseBuf = null;
    
    function initAudio() {
      if (ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
    
      // ホワイトノイズを 2 秒ぶん焼いて使い回す
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    
    /** ブラウザの自動再生ポリシー対策。最初のタップで必ず呼ぶ。 */
    function unlockAudio() {
      initAudio();
      if (ac && ac.state === 'suspended') ac.resume();
    }
    
    const now = () => ac.currentTime;
    
    function env(node, t0, a, d, peak = 1) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      node.connect(g);
      return g;
    }
    
    function tone(type, f0, f1, t0, a, d, peak, dest = master) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + a + d);
      const g = env(o, t0, a, d, peak);
      g.connect(dest);
      o.start(t0); o.stop(t0 + a + d + .05);
      return o;
    }
    
    function noise(t0, dur, f, q, peak, type = 'bandpass', dest = master) {
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = type; bp.frequency.value = f; bp.Q.value = q;
      s.connect(bp);
      const g = env(bp, t0, dur * .12, dur * .88, peak);
      g.connect(dest);
      s.start(t0); s.stop(t0 + dur + .05);
      return { src: s, filter: bp, gain: g };
    }
    
    // ─── SE ────────────────────────────────────────────────
    
    /** 鼻くそが出る瞬間。スッポンが外れるあの音。fat = グリグリ量(0..1) で太さが変わる */
    function sfxPon(fat = 0) {
      if (!ac) return;
      const t = now();
      // 急降下するサイン波が「ポン」の正体
      tone('sine', 780 + fat * 220, 110 - fat * 30, t, .006, .16 + fat * .06, .55 + fat * .25);
      tone('triangle', 400, 90, t, .004, .1, .18);
      noise(t, .05, 1800, 1.2, .3 + fat * .2);
      // グリグリが効いていると、抜けた後に低い余韻が付く
      if (fat > .35) tone('sine', 70, 46, t + .02, .02, .34, .22 * fat);
    }
    
    /** 溜まりきる前に離した時。気の抜けた音 */
    function sfxWhiff() {
      if (!ac) return;
      const t = now();
      noise(t, .3, 900, .6, .12, 'lowpass');
      tone('sine', 300, 170, t, .02, .22, .1);
    }
    
    /** 鼻の中をグリグリしている間ずっと鳴る */
    let grindNode = null;
    function grindStart() {
      if (!ac || grindNode) return;
      const s = ac.createBufferSource();
      s.buffer = noiseBuf; s.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 1.4;
      const g = ac.createGain(); g.gain.value = 0.0001;
      s.connect(bp); bp.connect(g); g.connect(master);
      s.start();
      grindNode = { s, bp, g };
    }
    /** speed: 0..1 のグリグリ強度 */
    function grindSet(speed) {
      if (!grindNode) return;
      const t = now();
      grindNode.g.gain.setTargetAtTime(0.0001 + speed * 0.16, t, .05);
      grindNode.bp.frequency.setTargetAtTime(280 + speed * 900, t, .06);
    }
    function grindStop() {
      if (!grindNode) return;
      const { s, g } = grindNode;
      g.gain.setTargetAtTime(0.0001, now(), .03);
      s.stop(now() + .2);
      grindNode = null;
    }
    
    /** 飛ばしのゲージ溜め。押している間ずっと上がり続ける（満タン後も止めない） */
    let chargeNode = null;
    function chargeStart() {
      if (!ac || chargeNode) return;
      const o = ac.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = 90;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 6;
      const g = ac.createGain(); g.gain.value = 0.0001;
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start();
      chargeNode = { o, lp, g };
    }
    /** t: 0..1 ゲージ、over: 満タン後に押し続けている秒数 */
    function chargeSet(t01, over = 0) {
      if (!chargeNode) return;
      const t = now();
      const wob = over > 0 ? Math.sin(t * 44) * 26 : 0;
      chargeNode.o.frequency.setTargetAtTime(90 + t01 * 260 + Math.min(over, 3) * 40 + wob, t, .04);
      chargeNode.lp.frequency.setTargetAtTime(400 + t01 * 2200, t, .05);
      chargeNode.g.gain.setTargetAtTime(0.02 + t01 * 0.13, t, .05);
    }
    function chargeStop() {
      if (!chargeNode) return;
      const { o, g } = chargeNode;
      g.gain.setTargetAtTime(0.0001, now(), .02);
      o.stop(now() + .15);
      chargeNode = null;
    }
    
    /** デコピン発射 */
    function sfxLaunch(power = 1) {
      if (!ac) return;
      const t = now();
      tone('square', 220, 1400, t, .004, .07, .16);
      noise(t, .14, 3000, .7, .3 * power, 'highpass');
      tone('sine', 160, 40, t, .005, .3, .3 * power);
    }
    
    /** 着地。鼻くそは粘着質なので跳ねない。ベチャッで終わる */
    function sfxSplat() {
      if (!ac) return;
      const t = now();
      noise(t, .18, 520, .8, .34, 'lowpass');
      tone('sine', 180, 42, t, .006, .16, .26);
    }
    
    function sfxCoin(i = 0) {
      if (!ac) return;
      const t = now() + i * .045;
      tone('square', 1180, 1180, t, .004, .05, .07);
      tone('square', 1760, 1760, t + .04, .004, .1, .06);
    }
    
    /** ショップの連打購入。押し続けるとピッチが上がっていく。溜める快感のショップ版 */
    function sfxBuy(streak = 0) {
      if (!ac) return;
      const t = now();
      const semi = Math.min(streak, 24);
      const f = 330 * Math.pow(2, semi / 12);
      tone('triangle', f, f, t, .004, .08, .16);
      tone('sine', f * 2, f * 2, t, .004, .05, .05);
    }
    
    function sfxStar(i = 0) {
      if (!ac) return;
      const t = now() + i * .11;
      const f = 900 * Math.pow(2, i / 12);
      tone('sine', f, f * 1.5, t, .01, .22, .16);
      tone('sine', f * 2, f * 3, t, .01, .18, .08);
    }
    
    /** 初登場・自己ベスト更新 */
    function sfxFanfare() {
      if (!ac) return;
      const t = now();
      [0, 4, 7, 12].forEach((s, i) => {
        const f = 523.25 * Math.pow(2, s / 12);
        tone('triangle', f, f, t + i * .085, .01, .3, .14);
        tone('sine', f * 2, f * 2, t + i * .085, .01, .2, .05);
      });
    }
    
    function sfxMilestone() {
      if (!ac) return;
      const t = now();
      [0, 7, 12].forEach((s, i) => {
        const f = 392 * Math.pow(2, s / 12);
        tone('square', f, f, t + i * .06, .005, .16, .1);
      });
    }
    
    /** シーン遷移のスライド */
    function sfxSwoosh() {
      if (!ac) return;
      noise(now(), .16, 1100, .5, .07, 'bandpass');
    }
    
    function sfxThud() {
      if (!ac) return;
      tone('sine', 120, 50, now(), .005, .12, .18);
    }
    
    return { chargeSet, chargeStart, chargeStop, grindSet, grindStart, grindStop, initAudio, sfxBuy, sfxCoin, sfxFanfare, sfxLaunch, sfxMilestone, sfxPon, sfxSplat, sfxStar, sfxSwoosh, sfxThud, sfxWhiff, unlockAudio };
  });

  // ---------- src/core/juice.js ----------
  __def('juice', function () {
    // 手応え。このゲームの本体。
    //
    // ほじりのメカニクスは「穴に指を入れて2.5秒待って離す」しかなく、
    // ゲージ速度はグリグリと無関係（企画の指定）。つまり面白さを支えているのは
    // 抽選の引きと、ここにある演出だけ。仕上げの磨きではなく機能。
    
    var { W, H, CFG } = __req('config');
    var { clamp, easeOut, TAU } = __req('util');
    
    const juice = {
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
    
    function shake(power, dur = .3) {
      shakePow = Math.max(shakePow, power);
      shakeDur = Math.max(shakeDur, dur);
      shakeT = shakeDur;
    }
    
    /** 時間を止める。ゲームの dt にだけ効き、演出の更新は実時間で回り続ける */
    function hitstop(dur = .08) { stopT = Math.max(stopT, dur); }
    
    function flash(col = '#fff', a = .7, dur = .12) {
      flashCol = col; flashA = a; flashDur = dur;
    }
    
    function popup(x, y, text, col = '#ffd97a', size = 34) {
      popups.push({ x, y, text, col, size, t: 0, life: 1.1, vy: -70 });
    }
    
    function burst(x, y, col, n = 14, spd = 240) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = spd * (.35 + Math.random() * .8);
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
          r: 3 + Math.random() * 7, col, t: 0, life: .5 + Math.random() * .5,
        });
      }
    }
    
    function irisOut(x, y, r = 150) {
      iris.on = true; iris.x = x; iris.y = y; iris.r = 1100; iris.target = r; iris.speed = 7;
    }
    function irisIn() { iris.target = 1100; iris.speed = 5; }
    function irisOff() { iris.on = false; iris.r = 1100; iris.target = 1100; }
    const irisRadius = () => iris.r;
    const irisDone = () => Math.abs(iris.r - iris.target) < 6;
    
    /** dt は実時間（ヒットストップの影響を受けない） */
    function updateJuice(dt) {
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
    function renderFx(ctx) {
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
    function drawRays(ctx, x, y, t, r = 700, col = 'rgba(255,220,120,') {
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
    function drawStar(ctx, x, y, r, col, rot = 0) {
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
    
    return { burst, drawRays, drawStar, flash, hitstop, irisDone, irisIn, irisOff, irisOut, irisRadius, juice, popup, renderFx, shake, updateJuice };
  });

  // ---------- src/core/input.js ----------
  __def('input', function () {
    // Pointer Events に一本化して、マウスとタッチを 1 系統で扱う。
    // 画面座標 → 論理座標(720x1280) の変換はここに閉じ込め、シーン側は論理座標だけ見る。
    
    var { W, H } = __req('config');
    
    const Input = {
      x: W / 2, y: H / 2,   // 論理座標
      px: W / 2, py: H / 2, // 1フレーム前
      dx: 0, dy: 0,
      down: false,
      inside: false,
      type: 'mouse',        // マウスはホバーで、タッチは触れている間だけエッジを見る
      _downCb: [], _upCb: [], _moveCb: [],
    };
    
    /** エッジ判定を見てよい状態か。タッチは触れていないと座標が古いまま残る */
    const pointerLive = () =>
      Input.inside && (Input.type === 'mouse' ? true : Input.down);
    
    let stageEl = null, fitScale = 1;
    
    function setFitScale(s) { fitScale = s; }
    
    function toLogical(e) {
      const r = stageEl.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / fitScale,
        y: (e.clientY - r.top) / fitScale,
      };
    }
    
    function initInput(stage) {
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
    function tickInput() {
      Input.dx = Input.x - Input.px;
      Input.dy = Input.y - Input.py;
      Input.px = Input.x; Input.py = Input.y;
    }
    
    const onDown = f => Input._downCb.push(f);
    const onUp   = f => Input._upCb.push(f);
    const onMove = f => Input._moveCb.push(f);
    
    /** 端末を震わせる（対応端末のみ。Vibration API） */
    function buzz(ms) {
      if (navigator.vibrate) { try { navigator.vibrate(ms); } catch {} }
    }
    
    return { buzz, initInput, Input, onDown, onMove, onUp, pointerLive, setFitScale, tickInput };
  });

  // ---------- src/state.js ----------
  __def('state', function () {
    // セーブデータ。Web Storage API (LocalStorage)。
    //
    // 設計の要： seen（図鑑＝見た記録・永久）と stock（在庫＝実体・消費される）を別テーブルにする。
    // 飛ばすと stock だけが減り、seen は絶対に触らない。
    
    var { CFG, SIZES, upCost } = __req('config');
    var { BOOGERS, BY_ID, NORMAL, SECRETS } = __req('boogers');
    var { clamp, weightedPick } = __req('util');
    
    const KEY = 'hojirinus.save.v1';
    
    const fresh = () => ({
      version: 1,
      seen: [],                                   // 図鑑：永久に消えない
      stock: {},                                  // 在庫：飛ばすと減る
      coins: 0,
      ups: { pick: 0, dig: 0, power: 0, speed: 0 },
      records: Object.fromEntries(SIZES.map(s => [s, 0])),   // サイズ別の自己ベスト
      stats: { picks: 0, flies: 0 },
    });
    
    const S = fresh();
    
    // セッション（今回の起動ぶん）の記録。リザルト画面用。保存しない。
    const session = { picks: 0, flies: 0, best: 0, news: [], coins: 0 };
    
    function load() {
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
        // 強化キーが後から増えても壊れないようにする。
        // Object.assign は S.ups ごと古い値で置き換えるので、新キーが欠けたまま残り、
        // buy() の S.ups[k]++ が NaN になって強化が二度と買えなくなる
        for (const k of Object.keys(CFG.ups)) {
          if (typeof S.ups[k] !== 'number' || !isFinite(S.ups[k])) S.ups[k] = 0;
        }
      } catch (e) { console.warn('save load failed', e); }
    }
    
    let saveTimer = 0;
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); }
      }, 500);
    }
    
    function wipe() {
      try { localStorage.removeItem(KEY); } catch {}
      Object.assign(S, fresh());
    }
    
    // ── 図鑑 / 在庫 ─────────────────────────────────────
    
    const hasSeen = id => S.seen.includes(id);
    const stockOf = id => S.stock[id] || 0;
    const totalStock = () => Object.values(S.stock).reduce((a, b) => a + b, 0);
    
    const seenNormal  = () => NORMAL.filter(b => hasSeen(b.id)).length;
    const seenSecrets = () => SECRETS.filter(b => hasSeen(b.id)).length;
    
    /** ほじり出した。戻り値の isNew が初登場かどうか */
    function gain(entry) {
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
    function consume(id) {
      if (stockOf(id) <= 0) return false;
      S.stock[id]--;
      if (S.stock[id] <= 0) delete S.stock[id];
      S.stats.flies++; session.flies++;
      save();
      return true;
    }
    
    function addCoins(n) {
      S.coins += n;
      session.coins += n;
      save();
    }
    
    // ── 強化 ────────────────────────────────────────────
    
    const upLevel = k => S.ups[k] || 0;
    const upRate  = k => upLevel(k) * CFG.upStep;         // +0.5% / 回
    const costOf  = k => upCost(k, upLevel(k));
    const canBuy  = k => S.coins >= costOf(k);
    /** 10%ごとのマイルストーン段数。0.5%は見えないが、10%は見える */
    const milestone = k => Math.floor(upRate(k) / CFG.milestoneStep);
    
    function buy(k) {
      const c = costOf(k);
      if (S.coins < c) return null;
      const before = milestone(k);
      S.coins -= c;
      S.ups[k]++;
      save();
      return { cost: c, milestoneUp: milestone(k) > before, level: upLevel(k) };
    }
    
    // ── 派生ステータス ───────────────────────────────────
    
    const pickPower  = () => upRate('pick');
    
    /** ゲージ満タンに必要な、指を動かす総量（論理px）。ほじりスピードで減る */
    const digNeed = () => CFG.digDist / (1 + upRate('dig'));
    const playerPower = () => CFG.basePower * (1 + upRate('power'));
    const speedMul   = () => 1 + upRate('speed');
    
    /** パワー充足率。デカい鼻くそが本気を出せているか */
    const powerRatio = size => clamp(playerPower() / CFG.reqPower[size], 0, 1);
    
    /**
     * サイズボーナスはパワー充足率ぶんしか効かない。
     * これが「序盤はデカい鼻くそが本来の飛距離を出せず、強化して初めて活きる」の実装。
     * 下限は 1.0 ＝ パワー不足でも小より下回らせない。
     * 下回らせると「デカいの引いたのに損」になり、企画の芯にある
     * 『デカい鼻くそをひり出す快感』と正面から衝突するため。
     */
    function effBonus(size) {
      return 1 + (CFG.sizeBonus[size] - 1) * powerRatio(size);
    }
    
    /** 初速。gauge は 0..1 */
    function launchV(size, gauge) {
      return CFG.baseV * speedMul() * gauge * effBonus(size);
    }
    
    /** 飛距離。d = v^2 sin(2θ)/g ── 45°が最適なのは物理からタダで出る */
    function distanceOf(size, gauge, angleDeg) {
      const v = launchV(size, gauge);
      return v * v * Math.sin(2 * angleDeg * Math.PI / 180) / CFG.gravity;
    }
    
    /** ショップ用：45°・満タンの想定飛距離 */
    const simDist = size => distanceOf(size, 1, 45);
    
    function updateRecord(size, d) {
      if (d > (S.records[size] || 0)) { S.records[size] = d; save(); return true; }
      return false;
    }
    
    // ── 抽選 ────────────────────────────────────────────
    
    /**
     * レア度 → エントリ の2段抽選。ほじり力 p が両段に効く。
     * N の重みは据え置き、上位の重みだけ増やす。正規化の結果として N が相対的に減る。
     * これで「レア鼻くそ及びデカい鼻くその取れる確率アップ」を1ステータスで賄える。
     */
    function roll() {
      const p = pickPower();
      const rarities = Object.keys(CFG.baseW);
      const r = weightedPick(rarities, k => CFG.baseW[k] * (1 + p * CFG.rarityBias[k]));
      const pool = BOOGERS.filter(b => b.rarity === r);
      return weightedPick(pool, b => (b.w ?? 1) * (1 + p * CFG.sizeBias[b.size]));
    }
    
    return { addCoins, buy, canBuy, consume, costOf, digNeed, distanceOf, effBonus, gain, hasSeen, launchV, load, milestone, pickPower, playerPower, powerRatio, roll, S, save, seenNormal, seenSecrets, session, simDist, speedMul, stockOf, totalStock, updateRecord, upLevel, upRate, wipe };
  });

  // ---------- src/scenes/pick.js ----------
  __def('pick', function () {
    // 鼻ほじりシーン（ベースゾーン）
    //
    // メカニクスは「穴に指を入れて2.5秒待って離す」しかない。
    // ゲージ速度はグリグリと無関係（企画の指定：慣れたプレイヤーのテンポを優先）。
    // つまり面白さは抽選の引きと演出だけで支えている。だから演出に全部を賭ける。
    //
    // グリグリは損得ゼロだが、やった方が気持ちいいを担保する：
    // グリグリ量が 鼻の歪み / 画面揺れ / 音の太さ / 飛び出す勢い に乗る。
    // 報酬を付けると企画のテンポ判断を壊すので、快感側だけで解決する。
    
    var { W, H, CFG } = __req('config');
    var { Input, buzz } = __req('input');
    var { clamp, lerp, easeOut, easeOutBack, TAU } = __req('util');
    var { drawBooger } = __req('shape');
    var { shake, hitstop, flash, popup, burst, irisOut, irisIn, irisOff, drawRays, drawStar, } = __req('juice');
    var { sfxPon, sfxWhiff, grindStart, grindSet, grindStop, sfxFanfare, sfxStar, sfxCoin, } = __req('audio');
    var { roll, gain, milestone, digNeed, upRate, S } = __req('state');
    var { RARITY_COLOR, RARITY_STARS, RARITY_LABEL } = __req('boogers');
    
    const N = CFG.nose;
    const SKIN = '#e8a882', SKIN_D = '#c2795a', SKIN_L = '#f6c9a8';
    
    // 穴の中の暗さ。1.0 にすると指が完全に消える。
    // 消し切る手前で止めてあるのは、輪郭がうっすら残ったほうが
    // 「奥に入っている」ように見えて、ただの切り抜きに見えないため。
    const HOLE_DARK = 0.94;
    
    // 初登場の後光の色。四神とシークレットだけ、ふつうの金色から変えて格を上げる
    const RAY_COLOR = {
      GOD:    'rgba(255,150,40,',
      SECRET: 'rgba(255,120,220,',
    };
    
    const pickScene = {
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
    
    /** コンソールから中を覗くための読み取り専用アクセサ */
    pickScene.debug = () => ({ state, gauge, grindV, grindAmt, need: digNeed() });
    
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
        // 動かした量でゲージが溜まる。止めれば進まない。
        // 1フレームあたりの上限を設けているのは、フレーム落ちで一気に稼げてしまうのと、
        // 画面外まで指を振り回すだけの攻略を潰すため。
        const mv = Math.min(Math.hypot(Input.dx, Input.dy), CFG.digCapPerSec * dt);
        const moving = mv >= CFG.digMoveMin;
        const assist = moving ? CFG.digAssist * (1 + upRate('dig')) * dt : 0;
        gauge = clamp(gauge + mv / digNeed() + assist, 0, 1);
    
        // グリグリの勢い（演出用）。ゲージそのものではなく「今どれだけ激しいか」
        grindV = lerp(grindV, clamp(mv / 14, 0, 1), .3);
        grindAcc += grindV * dt;
        grindAmt = clamp(grindAcc / 1.25, 0, 1);
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
      // 穴に入れる前は、指を鼻より手前にそのまま描く。
      // 常に沈めていると、狙っている最中に指先が穴に吸い込まれて消え、
      // どこを指しているのか分からなくなる。沈めるのは実際にほじり始めてから。
      if (state !== 'picking') { drawFinger(ctx, x, y); return; }
    
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
      } else if (state === 'picking') {
        // 動かさないと溜まらないので、何をすればいいかを毎回言い切る。
        // 手を止めているときほど強く跳ねさせて、「動かせ」を体で分からせる。
        ctx.save();
        ctx.textAlign = 'center';
        const idle = 1 - grindV;                       // 止まっているほど 1 に近い
        const beat = 1 + Math.sin(anim * (9 + idle * 9)) * (.05 + idle * .09);
        ctx.translate(cx, 990); ctx.scale(beat, beat);
        ctx.font = '900 46px system-ui, sans-serif';
        ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000';
        ctx.strokeText('ほじれ！', 0, 0);
        ctx.fillStyle = grindV > .25 ? '#ffe45e' : '#ff7a4a';   // 止まると赤く警告
        ctx.fillText('ほじれ！', 0, 0);
        ctx.restore();
    
        if (grindV < .12) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.globalAlpha = .5 + Math.sin(anim * 5) * .35;
          ctx.font = '700 24px system-ui, sans-serif';
          ctx.fillStyle = '#ff7a4a';
          ctx.fillText('指を動かさないと溜まらない', cx, 1032);
          ctx.restore();
        }
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
        drawRays(ctx, W / 2, 560, anim, 760, RAY_COLOR[entry.rarity] || 'rgba(255,220,120,');
        ctx.restore();
      }
    
      // 鼻くそ
      if (state === 'reveal' && bScale > 0) {
        const r = (isNew ? revealPx(entry.size) : sizePx(entry.size)) * bScale;
        drawBooger(ctx, entry, bx, by, r, bRot);
    
        if (isNew) {
          // 星（レア度ぶん）。
          // 星の数が増えても弧の全長が変わらないよう、間隔を星数で割る。
          // 固定間隔だと5個で扇が広がりすぎて、端の星がアイリスの穴からはみ出す。
          for (let i = 0; i < starShown; i++) {
            const spread = Math.min(1.5, starN * .34);              // 弧の全角（rad）
            const step = starN > 1 ? spread / (starN - 1) : 0;
            const a = -Math.PI / 2 + (i - (starN - 1) / 2) * step;
            const rr = 250;
            const k = clamp((t - .95 - i * .16) / .3, 0, 1);
            drawStar(ctx, W / 2 + Math.cos(a) * rr, 560 + Math.sin(a) * rr * .8,
              28 * easeOutBack(k), RARITY_COLOR[entry.rarity], anim * .8 + i);
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
            const head =
              entry.rarity === 'SECRET' ? 'シークレット！' :
              entry.rarity === 'GOD'    ? '四神　降臨！' :
              `${RARITY_LABEL[entry.rarity]}　はじめて！`;
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
        ctx.fillText('鼻の穴に指を入れて、押したまま', W / 2, 1000);
        ctx.font = '600 21px system-ui, sans-serif';
        ctx.fillStyle = '#4e7d8f';
        ctx.fillText('グリグリ動かすとゲージが溜まる', W / 2, 1036);
        ctx.globalAlpha = .35;
        ctx.fillText('画面のふちに寄ると となりへ', W / 2, 1090);
        ctx.restore();
      }
    };
    
    return { pickScene };
  });

  // ---------- src/scenes/fly.js ----------
  __def('fly', function () {
    // 鼻くそ飛ばしシーン
    //
    // 風・的・障害物は入れない。どれもRNGか正解タイミングを持ち込むので、
    // 企画が明確に否定している「タイミングを計るものではない、思い切り溜める快感」と衝突する。
    // 当てにいく対象を置いた瞬間、ゲージは"計るもの"に戻ってしまう。
    // 代わりに距離の見せ方（背景の段階変化・距離マーカー・自己ベストの旗）に全部寄せる。
    
    var { W, H, CFG, SIZES } = __req('config');
    var { Input, buzz } = __req('input');
    var { clamp, lerp, TAU, fmtDist, fmt, mulberry32 } = __req('util');
    
    /** 負の数でも正しく回る剰余。パララックスの巻き戻しに要る */
    const mod = (n, m) => ((n % m) + m) % m;
    var { drawBooger } = __req('shape');
    var { shake, hitstop, flash, popup, burst } = __req('juice');
    var { chargeStart, chargeSet, chargeStop, sfxLaunch, sfxSplat, sfxCoin, sfxFanfare, sfxThud, } = __req('audio');
    var { S, stockOf, consume, addCoins, launchV, distanceOf, powerRatio, updateRecord, milestone, } = __req('state');
    var { BOOGERS, RARITY_COLOR, RARITY_LABEL } = __req('boogers');
    
    const flyScene = { name: 'fly', locked: false, cv: null, ctx: null };
    
    let state = 'select';   // select | angle | charge | flight | land
    let t = 0, anim = 0;
    let sel = null;
    let angle = 45, angleLocked = false, lockedAngle = 45, waitRelease = false;
    let gauge = 0, over = 0, charging = false, prevDown = false;
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
        if (justUp) {
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
    
      gotCoin = Math.floor(dist * CFG.coinPerM);
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
    
    return { flyScene };
  });

  // ---------- src/scenes/shop.js ----------
  __def('shop', function () {
    // ショップ
    //
    // +0.5% は単体では絶対に体感できない。そこを直接どうにかしようとせず、4方向から埋める。
    //  1. 長押し連打購入：SEのピッチが1段ずつ上がる。ほじり/飛ばしと同じ「長押しで溜める快感」を横断させる
    //  2. 10%ごとのマイルストーン：指のビジュアルが変わる。0.5%は見えないが10%は見える
    //  3. 購入直後のその場デモ（カードが光ってバーが伸びる）
    //  4. 想定飛距離の常時表示：パワー不足のサイズが赤字で、強化すると やがて赤字が解ける
    
    var { CFG, SIZES } = __req('config');
    var { fmt, fmtDist } = __req('util');
    var { sfxBuy, sfxMilestone } = __req('audio');
    var { flash, popup } = __req('juice');
    var { buzz } = __req('input');
    var { S, costOf, canBuy, buy, upRate, upLevel, milestone, simDist, powerRatio, digNeed, } = __req('state');
    
    const shopScene = { name: 'shop', locked: false };
    
    // CFG.ups の定義順をそのまま使う。ここに書き忘れて新ステータスが
    // ショップに出ない（＝買えない）のを防ぐ
    const KEYS = Object.keys(CFG.ups);
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
        // ほじりスピードだけは％では効きが分からないので、実際に要るグリグリ量を出す。
        // 数字が減っていくのが見えれば「指が楽になった」と分かる
        if (k === 'dig') {
          c.ms.textContent += `　必要グリグリ量 ${Math.round(digNeed())}`;
        }
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
    
    return { shopScene };
  });

  // ---------- src/scenes/collection.js ----------
  __def('collection', function () {
    // 鼻くそ図鑑
    //
    // seen（見た記録）は永久。stock（在庫）は飛ばすと減る。ここは seen を見て描く。
    // 未所持でもシルエットが出るのは、形が seed から計算できるから（core/shape.js）。
    // シークレットは存在自体を出さない。獲得すると末尾に枠が増える。
    // カウントは通常枠だけで数え、シークレットは別枠 ── 総数でネタバレしないため。
    
    var { BOOGERS, NORMAL, SECRETS, GODS, RARITY_COLOR, RARITY_LABEL } = __req('boogers');
    var { drawBooger, drawSilhouette } = __req('shape');
    var { S, hasSeen, stockOf, seenNormal, seenSecrets } = __req('state');
    var { sfxThud } = __req('audio');
    
    const collectionScene = { name: 'collection', locked: false };
    
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
    
    return { collectionScene };
  });

  // ---------- src/scenes/result.js ----------
  __def('result', function () {
    // セッションリザルト（画面下）
    //
    // Web にプロセス終了はないので「やめる」を締めの画面にした。
    // 企画の「気が済むまでほじって飛ばして辞める、セッション型の遊び」に、
    // 終わりの一拍を与える。誤爆したときの被害が唯一大きいセルなので、
    // ここだけは確定後にもう一段の確認を挟む（エッジ即遷移では終わらせない）。
    
    var { S, session, seenNormal, seenSecrets, totalStock } = __req('state');
    var { NORMAL } = __req('boogers');
    var { SIZES } = __req('config');
    var { fmt, fmtDist } = __req('util');
    
    // ボタンの行き先は main.js が差し込む。
    // ここから main.js を import し返すと循環参照になり、それを避けるための
    // 動的 import はバンドル（file:// 用）を作るときに解決できなくなる。
    const resultScene = {
      name: 'result', locked: false,
      onBack: () => {}, onQuit: () => {},
    };
    
    resultScene.init = function () {
      document.querySelector('#btn-back').addEventListener('click', () => resultScene.onBack());
      document.querySelector('#btn-quit').addEventListener('click', () => resultScene.onQuit());
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
    
    return { resultScene };
  });

  // ---------- src/main.js ----------
  __def('main', function () {
    // エントリ。RAFループ、十字ナビ、エッジ遷移、フィット処理。
    
    var { W, H, CFG } = __req('config');
    var { Input, initInput, tickInput, setFitScale, pointerLive } = __req('input');
    var { juice, updateJuice, renderFx } = __req('juice');
    var { unlockAudio, sfxSwoosh } = __req('audio');
    var { load, S } = __req('state');
    var { fmt, clamp, easeOut } = __req('util');
    
    var { pickScene } = __req('pick');
    var { flyScene } = __req('fly');
    var { shopScene } = __req('shop');
    var { collectionScene } = __req('collection');
    var { resultScene } = __req('result');
    
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
    
    function getActive() { return active; }
    const activeScene = () => SCENES[active].s;
    
    function go(name) {
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
      { key: 'up',    depth: (x, y) => (CFG.edgeBand - y) / CFG.edgeBand,       ax: 'y', dir: -1, arrow: '▲' },
      { key: 'down',  depth: (x, y) => (y - (H - CFG.edgeBand)) / CFG.edgeBand, ax: 'y', dir: +1, arrow: '▼' },
      { key: 'left',  depth: (x, y) => (CFG.edgeBand - x) / CFG.edgeBand,       ax: 'x', dir: -1, arrow: '◀' },
      { key: 'right', depth: (x, y) => (x - (W - CFG.edgeBand)) / CFG.edgeBand, ax: 'x', dir: +1, arrow: '▶' },
    ];
    
    // エッジタブ。どっちに何があるかを常時見せ、押し込み量をバーで返す。
    // バーが満タンになった瞬間＝遷移が確定する、が守られるように出す（下の progressOf）。
    const LABEL = { pick: 'はな', fly: 'とばす', collection: 'ずかん', shop: 'ショップ', result: 'やめる' };
    const tabs = {};
    
    function buildEdgeUI() {
      const root = $('#edge-ui');
      for (const e of EDGES) {
        const el = document.createElement('div');
        el.className = 'edge-tab';
        el.dataset.dir = e.key;
        el.innerHTML = `<i class="et-fill"></i><span class="et-in"><span class="et-arrow">${e.arrow}</span><span class="et-label"></span></span>`;
        root.appendChild(el);
        tabs[e.key] = { el, label: el.querySelector('.et-label') };
    
        // タブそのものを押しても飛べるようにする。
        // 端まで指を運ぶ／留まる、を待たずに済むので、行き先が分かっている人には速い。
        // pointerdown で拾うのは、タップの手応えを即返すため。
        el.addEventListener('pointerdown', ev => {
          const cur = SCENES[active];
          const to = cur[e.key];
          if (!to || cur.s.locked || !started || slideT < 1) return;
          // #stage まで伝えない。伝えるとシーン側が「画面を押した」と受け取り、
          // 飛ばしシーンの角度決めなどを巻き込んで発火してしまう
          ev.stopPropagation();
          ev.preventDefault();
          el.classList.add('press');
          peekX = peekY = 0;
          go(to);              // go() の中で armed=false になるので、滞在判定と二重に発火しない
        });
        for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
          el.addEventListener(evt, () => el.classList.remove('press'));
        }
      }
    }
    
    /** 確定条件は「押し込み62%」と「帯内に280ms滞在」のOR。表示は両者の大きい方を出す */
    const progressOf = (d, dw) => clamp(Math.max(d / CFG.edgeCommit, dw / CFG.edgeDwell), 0, 1);
    
    function syncEdgeUI(cur, hidden, bestKey, bestD) {
      for (const e of EDGES) {
        const t = tabs[e.key], to = cur[e.key];
        if (!to || hidden) { t.el.classList.remove('show', 'hot'); t.el.style.setProperty('--p', 0); continue; }
        t.el.classList.add('show');
        t.label.textContent = LABEL[to];
        const on = bestKey === e.key;
        t.el.classList.toggle('hot', on);
        t.el.style.setProperty('--p', on ? progressOf(bestD, dwell) : 0);
      }
    }
    
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
      if (sc.locked || !started || slideT < 1) { relax(dt); armed = false; syncEdgeUI(cur, true); return; }
      if (!pointerLive()) { relax(dt); syncEdgeUI(cur, false, null, 0); return; }
    
      let best = null, bestD = 0;
      for (const e of EDGES) {
        if (!cur[e.key]) continue;
        const d = clamp(e.depth(Input.x, Input.y), 0, 1);
        if (d > bestD) { bestD = d; best = e; }
      }
    
      if (!best || bestD <= 0.02) { relax(dt); armed = true; syncEdgeUI(cur, false, null, 0); return; }
      if (!armed) { relax(dt); syncEdgeUI(cur, false, null, 0); return; }
    
      peekTarget = cur[best.key];
      dwell += dt;
      syncEdgeUI(cur, false, best.key, bestD);
    
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
    
    function backToTitle() {
      started = false;
      titleLayer.style.display = '';
      titleLayer.classList.remove('hide');
      go('pick');
      camX = tgtX = 720; camY = tgtY = 1280; slideT = 1;
    }
    
    // ── 起動 ────────────────────────────────────────────
    load();
    initInput(stage);
    buildEdgeUI();
    // リザルトのボタンの行き先はここで差し込む（result.js から main.js を import し返さない）
    resultScene.onBack = () => go('pick');
    resultScene.onQuit = () => backToTitle();
    for (const k in SCENES) SCENES[k].s.init?.();
    // ResizeObserver は初期レイアウト確定を拾ってくれるが、これ一本には頼れない。
    // RO のコールバックはレンダリング処理の一部として配信されるので、
    // 一度も描画されていないタブ（バックグラウンドで開かれた等）では発火しない。
    // その状態で初回 doFit() がレイアウト前に走ると、フィットしないまま固まる。
    // resize と load も張って、どれか1つでも通れば復帰するようにしておく。
    new ResizeObserver(doFit).observe(fit);
    window.addEventListener('resize', doFit);
    window.addEventListener('load', doFit);
    window.addEventListener('orientationchange', () => setTimeout(doFit, 120));
    doFit();
    slideT = 1;
    syncHud();
    requestAnimationFrame(frame);
    
    // ブラウザのコンソールから触れるフック。
    // タブが hidden だと RAF が止まるので、そのときは step() で手で進められる。
    window.__hojiri = {
      go, S, step: (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); },
      scene: n => SCENES[n].s,
      start: startGame,
      fit: doFit,
    };
    
    return { activeScene, backToTitle, getActive, go };
  });
})();
