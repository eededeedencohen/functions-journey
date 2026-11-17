// Boti's voice.
// 1. ElevenLabs recordings (natural Hebrew): the app asks for  tts/<voice>/<hash>.mp3 .
//    Lessons and booklet pages are recorded ahead of time; other sentences are recorded by
//    the course server the first time they are needed (the API key stays on the computer).
// 2. If a recording is not available, the device's own Hebrew voice is used.
// 3. If there is no voice at all, the caption stays on screen for reading time.
// narrate(text, {onEnd}) calls onEnd when the sentence is finished, which keeps the
// animations on screen in step with the voice.

import { VOICES, cleanText, ttsFile } from './tts.shared.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let voices = [];
let gen = 0; // every narrate()/stop() bumps this, which silences callbacks of older speech
let timer = null;
let talking = false;
let loading = false;
let keepAlive = []; // Chrome drops "end" events when utterances get garbage-collected
const subs = new Set();

const emit = () => subs.forEach((f) => f());
function setTalking(v) {
  if (talking !== v) {
    talking = v;
    emit();
  }
}
function setLoading(v) {
  if (loading !== v) {
    loading = v;
    emit();
  }
}
function refresh() {
  voices = synth ? synth.getVoices() : [];
  emit();
}
if (synth) {
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
}

export const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const isTalking = () => talking;
export const isLoading = () => loading;
export const hebrewVoices = () => voices.filter((v) => /^(he|iw)/i.test(v.lang));

/** state of the device's own voice: 'ok' | 'no-hebrew' | 'unsupported' */
export function voiceStatus() {
  if (!synth) return 'unsupported';
  if (voices.length && !hebrewVoices().length) return 'no-hebrew';
  return 'ok';
}

const pickDeviceVoice = () => {
  const hv = hebrewVoices();
  return hv.find((v) => /natural|online|google|enhanced|premium/i.test(v.name)) || hv[0] || null;
};

export const readTime = (text) => 1300 + text.length * 60;

// ------------------------------------------------------------------ recordings (ElevenLabs)
let audio = null;
const clips = new Map(); // file -> Promise<object url>

function player() {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
  }
  return audio;
}

function silentWav() {
  const n = 800;
  const b = new Uint8Array(44 + n).fill(128);
  const dv = new DataView(b.buffer);
  const str = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true);
  dv.setUint32(28, 8000, true);
  dv.setUint16(32, 1, true);
  dv.setUint16(34, 8, true);
  str(36, 'data');
  dv.setUint32(40, n, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

const useRecording = (voice) => VOICES.some((v) => v.key === voice);

// Each sentence is judged on its own: a sentence without a recording (hosting without an
// ElevenLabs key) falls back to the device voice, while recorded sentences keep playing.
function loadClip(voice, clean) {
  const file = ttsFile(voice, clean);
  if (!clips.has(file)) {
    let missing = false; // "there is no such recording" (as opposed to a passing network error)
    const p = fetch(`${file}?t=${encodeURIComponent(clean)}`)
      .then((r) => {
        missing = r.status === 404 || r.status === 400;
        if (!r.ok) throw new Error('tts ' + r.status);
        return r.blob();
      })
      .then((blob) => {
        if (blob.size < 400 || !/audio/.test(blob.type)) {
          missing = true;
          throw new Error('tts: not audio');
        }
        return URL.createObjectURL(blob);
      });
    p.catch(() => {
      if (!missing) setTimeout(() => clips.delete(file), 30000); // passing error: try again later
    });
    clips.set(file, p);
  }
  return clips.get(file);
}

/** warm up the next sentences so they start without a pause */
const queue = [];
let running = 0;
function pump() {
  while (running < 2 && queue.length) {
    const [voice, clean] = queue.shift();
    running++;
    loadClip(voice, clean)
      .catch(() => {})
      .finally(() => {
        running--;
        pump();
      });
  }
}
export function prefetch(texts, voice) {
  if (!useRecording(voice)) return;
  for (const t of texts) {
    const clean = cleanText(t);
    if (clean && !clips.has(ttsFile(voice, clean))) queue.push([voice, clean]);
  }
  pump();
}

/** Must be called from a tap handler once: tablets only allow sound that began with a touch. */
export function unlock() {
  try {
    const a = player();
    if (!a.dataset.unlocked) {
      a.dataset.unlocked = '1';
      a.src = silentWav();
      a.play().catch(() => {});
    }
  } catch {
    /* ignore */
  }
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'he-IL';
    synth.speak(u);
  } catch {
    /* ignore */
  }
}

export function stop() {
  gen++;
  clearTimeout(timer);
  if (audio) {
    audio.onended = audio.onerror = audio.onplaying = audio.onloadedmetadata = null;
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
  }
  if (synth) {
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  }
  keepAlive = [];
  setLoading(false);
  setTalking(false);
}

/**
 * @param {string} text spoken Hebrew text
 * @param {{enabled?: boolean, rate?: number, voice?: string, onEnd?: () => void}} opts
 *        voice: 'danit' | 'itamar' (ElevenLabs) or 'device'
 */
export function narrate(text, { enabled = true, rate = 1, voice = 'danit', onEnd } = {}) {
  text = cleanText(text);
  const wasBusy = !!synth && (synth.speaking || synth.pending);
  stop();
  const my = ++gen;
  let finished = false;
  const finish = () => {
    if (finished || my !== gen) return;
    finished = true;
    clearTimeout(timer);
    setLoading(false);
    setTalking(false);
    onEnd?.();
  };

  if (!enabled || !text) {
    timer = setTimeout(finish, readTime(text));
    return;
  }

  // ---- the device's own voice (fallback)
  const device = () => {
    if (my !== gen) return;
    setLoading(false);
    clearTimeout(timer);
    if (voiceStatus() !== 'ok') {
      timer = setTimeout(finish, readTime(text));
      return;
    }
    // short sentences: long utterances get cut off in some browsers
    const chunks = (text.match(/[^.!?]+[.!?]*/g) || [text]).map((s) => s.trim()).filter(Boolean);
    const v = pickDeviceVoice();
    const start = () => {
      if (my !== gen) return;
      setTalking(true);
      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = v?.lang || 'he-IL';
        if (v) u.voice = v;
        u.rate = rate;
        u.pitch = 1.05;
        const last = i === chunks.length - 1;
        u.onend = () => last && finish();
        u.onerror = (e) => {
          if (my !== gen || e.error === 'interrupted' || e.error === 'canceled') return;
          clearTimeout(timer);
          timer = setTimeout(finish, readTime(text) / 2);
        };
        keepAlive.push(u);
        synth.speak(u);
      });
      // safety net in case the browser never reports the end
      clearTimeout(timer);
      timer = setTimeout(finish, (text.length * 130) / rate + 5000);
    };
    // Android needs a breath between cancel() and the next speak()
    if (wasBusy) setTimeout(start, 80);
    else start();
  };

  if (!useRecording(voice)) return device();

  // ---- the recorded voice
  setLoading(true);
  loadClip(voice, text).then(
    (src) => {
      if (my !== gen) return;
      setLoading(false);
      const a = player();
      const speed = Math.max(0.7, Math.min(1.3, rate / 0.95));
      a.onplaying = () => my === gen && setTalking(true);
      a.onended = finish;
      a.onerror = device;
      a.onloadedmetadata = () => {
        a.playbackRate = speed;
        if (Number.isFinite(a.duration)) {
          clearTimeout(timer);
          timer = setTimeout(finish, (a.duration / speed) * 1000 + 2500);
        }
      };
      a.src = src;
      a.playbackRate = speed;
      timer = setTimeout(finish, text.length * 140 + 8000);
      a.play().catch(() => my === gen && device());
    },
    () => device(),
  );
}
