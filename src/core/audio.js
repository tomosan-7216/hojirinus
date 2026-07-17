// Web Audio API で SE を手続き生成する。音声ファイルを一切持たない。
// 「ポン！」= 急降下するサイン波 + バンドパスを通したノイズのクリック、で作れる。

let ac = null, master = null, noiseBuf = null;

export function initAudio() {
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
export function unlockAudio() {
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
export function sfxPon(fat = 0) {
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
export function sfxWhiff() {
  if (!ac) return;
  const t = now();
  noise(t, .3, 900, .6, .12, 'lowpass');
  tone('sine', 300, 170, t, .02, .22, .1);
}

/** 鼻の中をグリグリしている間ずっと鳴る */
let grindNode = null;
export function grindStart() {
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
export function grindSet(speed) {
  if (!grindNode) return;
  const t = now();
  grindNode.g.gain.setTargetAtTime(0.0001 + speed * 0.16, t, .05);
  grindNode.bp.frequency.setTargetAtTime(280 + speed * 900, t, .06);
}
export function grindStop() {
  if (!grindNode) return;
  const { s, g } = grindNode;
  g.gain.setTargetAtTime(0.0001, now(), .03);
  s.stop(now() + .2);
  grindNode = null;
}

/** 飛ばしのゲージ溜め。押している間ずっと上がり続ける（満タン後も止めない） */
let chargeNode = null;
export function chargeStart() {
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
export function chargeSet(t01, over = 0) {
  if (!chargeNode) return;
  const t = now();
  const wob = over > 0 ? Math.sin(t * 44) * 26 : 0;
  chargeNode.o.frequency.setTargetAtTime(90 + t01 * 260 + Math.min(over, 3) * 40 + wob, t, .04);
  chargeNode.lp.frequency.setTargetAtTime(400 + t01 * 2200, t, .05);
  chargeNode.g.gain.setTargetAtTime(0.02 + t01 * 0.13, t, .05);
}
export function chargeStop() {
  if (!chargeNode) return;
  const { o, g } = chargeNode;
  g.gain.setTargetAtTime(0.0001, now(), .02);
  o.stop(now() + .15);
  chargeNode = null;
}

/** デコピン発射 */
export function sfxLaunch(power = 1) {
  if (!ac) return;
  const t = now();
  tone('square', 220, 1400, t, .004, .07, .16);
  noise(t, .14, 3000, .7, .3 * power, 'highpass');
  tone('sine', 160, 40, t, .005, .3, .3 * power);
}

/** 着地。鼻くそは粘着質なので跳ねない。ベチャッで終わる */
export function sfxSplat() {
  if (!ac) return;
  const t = now();
  noise(t, .18, 520, .8, .34, 'lowpass');
  tone('sine', 180, 42, t, .006, .16, .26);
}

export function sfxCoin(i = 0) {
  if (!ac) return;
  const t = now() + i * .045;
  tone('square', 1180, 1180, t, .004, .05, .07);
  tone('square', 1760, 1760, t + .04, .004, .1, .06);
}

/** ショップの連打購入。押し続けるとピッチが上がっていく。溜める快感のショップ版 */
export function sfxBuy(streak = 0) {
  if (!ac) return;
  const t = now();
  const semi = Math.min(streak, 24);
  const f = 330 * Math.pow(2, semi / 12);
  tone('triangle', f, f, t, .004, .08, .16);
  tone('sine', f * 2, f * 2, t, .004, .05, .05);
}

export function sfxStar(i = 0) {
  if (!ac) return;
  const t = now() + i * .11;
  const f = 900 * Math.pow(2, i / 12);
  tone('sine', f, f * 1.5, t, .01, .22, .16);
  tone('sine', f * 2, f * 3, t, .01, .18, .08);
}

/** 初登場・自己ベスト更新 */
export function sfxFanfare() {
  if (!ac) return;
  const t = now();
  [0, 4, 7, 12].forEach((s, i) => {
    const f = 523.25 * Math.pow(2, s / 12);
    tone('triangle', f, f, t + i * .085, .01, .3, .14);
    tone('sine', f * 2, f * 2, t + i * .085, .01, .2, .05);
  });
}

export function sfxMilestone() {
  if (!ac) return;
  const t = now();
  [0, 7, 12].forEach((s, i) => {
    const f = 392 * Math.pow(2, s / 12);
    tone('square', f, f, t + i * .06, .005, .16, .1);
  });
}

/** シーン遷移のスライド */
export function sfxSwoosh() {
  if (!ac) return;
  noise(now(), .16, 1100, .5, .07, 'bandpass');
}

export function sfxThud() {
  if (!ac) return;
  tone('sine', 120, 50, now(), .005, .12, .18);
}
