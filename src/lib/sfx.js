// tiny synthesized sound effects (no audio files needed)
let ctx = null;
let enabled = true;

export const setSfxEnabled = (v) => (enabled = v);

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, at, dur, type = 'sine', vol = 0.16) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  tap() {
    if (enabled) tone(520, 0, 0.06, 'triangle', 0.07);
  },
  right() {
    if (!enabled) return;
    tone(660, 0, 0.14, 'triangle');
    tone(990, 0.11, 0.22, 'triangle');
  },
  wrong() {
    if (!enabled) return;
    tone(220, 0, 0.16, 'sawtooth', 0.07);
    tone(175, 0.13, 0.24, 'sawtooth', 0.07);
  },
  win() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.26, 'triangle'));
  },
};
