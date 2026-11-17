import { useSyncExternalStore } from 'react';
import { setSfxEnabled } from './sfx.js';

// Progress + settings.
// Saved twice: on the device itself (localStorage) and in a tiny "database" — one JSON file
// kept by the course server on the computer (data/progress.json). Every device that opens the
// course reads that file, so Matanel can stop on the tablet and continue on another device.
// Without the server (plain static hosting) everything still works, saved on the device only.
const KEY = 'math-course-v1';
const SYNC_KEY = 'math-course-v1-sync';
const API = 'api/progress';
const DEFAULT_NAME = 'מתנאל';

const initial = {
  name: DEFAULT_NAME,
  stars: 0,
  lessons: {}, // lessonId -> true when finished
  practice: {}, // unitId -> { right, total }
  booklet: {}, // booklet item id -> best score 0..1
  tests: [], // { date, grade, kind }
  settings: { voice: true, rate: 0.95, auto: true, sfx: true, voiceKey: 'danit' },
};

function normalize(raw) {
  const s = { ...initial, ...raw, settings: { ...initial.settings, ...(raw && raw.settings) } };
  if (!s.name || s.name === 'אלוף') s.name = DEFAULT_NAME; // older versions used a placeholder name
  return s;
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable in private mode */
  }
}

let state = normalize(read(KEY, null));
// rev = version of the server file this device last saw; dirty = changes not yet sent
let sync = { rev: 0, dirty: false, ...read(SYNC_KEY, {}) };
let online = null; // null = not checked yet, true = server database works, false = device only
let pushTimer = null;
let version = 0; // bumps on every local change, to detect changes made while a save is in flight

setSfxEnabled(state.settings.sfx);
const subs = new Set();
const notify = () => subs.forEach((f) => f());
const hasProgress = (s) => s.stars > 0 || Object.keys(s.lessons).length > 0 || s.tests.length > 0 || Object.keys(s.practice).length > 0;

function setOnline(v) {
  if (online !== v) {
    online = v;
    notify();
  }
}

async function push() {
  clearTimeout(pushTimer);
  const sent = version;
  try {
    const r = await fetch(API, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state) });
    if (!r.ok) throw new Error('save ' + r.status);
    const j = await r.json();
    sync = { rev: j.rev, dirty: version !== sent };
    write(SYNC_KEY, sync);
    setOnline(true);
    if (sync.dirty) schedulePush();
  } catch {
    setOnline(false);
  }
}
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 700);
}

/**
 * Combine what this device has with what the server has, without ever losing progress:
 * progress only grows (more stars, more finished lessons), so each part keeps the fuller side.
 * A deliberate reset is the exception — the side that was reset most recently wins as a whole.
 */
function merge(local, remote) {
  const lr = local.resetAt || 0;
  const rr = remote.resetAt || 0;
  if (lr !== rr) return lr > rr ? local : remote;
  const practice = { ...remote.practice };
  for (const [k, v] of Object.entries(local.practice)) if (!practice[k] || v.total > practice[k].total) practice[k] = v;
  const booklet = { ...remote.booklet };
  for (const [k, v] of Object.entries(local.booklet)) booklet[k] = Math.max(v, booklet[k] ?? 0);
  const tests = [...new Map([...remote.tests, ...local.tests].map((t) => [t.date, t])).values()].sort((a, b) => a.date - b.date).slice(-30);
  return {
    ...remote,
    stars: Math.max(local.stars, remote.stars),
    lessons: { ...remote.lessons, ...local.lessons },
    practice,
    booklet,
    tests,
  };
}

/** read the server file and bring this device and the server to the same, fullest state */
async function pull() {
  try {
    const r = await fetch(API, { cache: 'no-store' });
    if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) throw new Error('no database');
    const j = await r.json();
    setOnline(true);
    if (!j.state) {
      // the server file is empty (first time, or the host wiped it): refill it from this device
      if (hasProgress(state) || sync.dirty) push();
      return;
    }
    const remote = normalize(j.state);
    let merged = merge(state, remote);
    // choices made here that were not sent yet (name, settings) stay
    if (sync.dirty && merged !== state) merged = { ...merged, name: state.name, settings: state.settings };
    if (JSON.stringify(merged) !== JSON.stringify(state)) {
      state = merged;
      write(KEY, state);
      setSfxEnabled(state.settings.sfx);
      notify();
    }
    const serverBehind = JSON.stringify(merged) !== JSON.stringify(remote);
    sync = { rev: j.rev, dirty: serverBehind };
    write(SYNC_KEY, sync);
    if (serverBehind) push();
  } catch {
    setOnline(false);
  }
}

function set(next) {
  state = typeof next === 'function' ? next(state) : next;
  version++;
  write(KEY, state);
  sync.dirty = true;
  write(SYNC_KEY, sync);
  setSfxEnabled(state.settings.sfx);
  notify();
  schedulePush();
}

if (typeof window !== 'undefined') {
  pull();
  // coming back to the tab / tablet waking up: pick up what was done on another device
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pull();
    else if (sync.dirty && navigator.sendBeacon) {
      navigator.sendBeacon(API, new Blob([JSON.stringify(state)], { type: 'application/json' }));
    }
  });
}

export const getState = () => state;
export const useStore = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
  );
/** true = saved in the shared database, false = saved on this device only, null = checking */
export const useSaveStatus = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => online,
  );

export const actions = {
  setName: (name) => set((s) => ({ ...s, name })),
  addStars: (n) => set((s) => ({ ...s, stars: s.stars + n })),
  finishLesson: (id) =>
    set((s) => (s.lessons[id] ? s : { ...s, lessons: { ...s.lessons, [id]: true }, stars: s.stars + 20 })),
  recordPractice: (unit, ok) =>
    set((s) => {
      const p = s.practice[unit] || { right: 0, total: 0 };
      return { ...s, practice: { ...s.practice, [unit]: { right: p.right + (ok ? 1 : 0), total: p.total + 1 } } };
    }),
  recordBooklet: (id, score) =>
    set((s) => ({ ...s, booklet: { ...s.booklet, [id]: Math.max(s.booklet[id] || 0, score) } })),
  recordTest: (grade, kind) =>
    set((s) => ({ ...s, tests: [...s.tests, { date: Date.now(), grade, kind }].slice(-30) })),
  setSetting: (k, v) => set((s) => ({ ...s, settings: { ...s.settings, [k]: v } })),
  // resetAt marks a deliberate reset, so other devices drop their old progress too
  reset: () => set({ ...initial, settings: state.settings, resetAt: Date.now() }),
};
