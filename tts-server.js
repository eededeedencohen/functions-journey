// The course's small server side. Used by Vite (`npm run dev` / `npm run preview`) as a
// plugin, and by server.js (`npm start`) when the course is hosted online.
// 1. ElevenLabs voice. The API key never reaches the tablet: the browser asks for
//    tts/<voice>/<hash>.mp3 , and the server answers from public/tts (recorded ahead of time
//    by `npm run voices`) or records the sentence on the spot.
// 2. api/progress — a one-file "database" (progress.json) that keeps the student's
//    progress, so every device that opens the course continues from the same place.
//
// Environment (all optional):
//   ELEVEN_LABS_API_KEY  the key, when there is no config.env file (e.g. on a hosting service)
//   COURSE_DATA_DIR      where progress.json and on-demand recordings are kept (a persistent disk)
//   TTS_DAILY_CHARS      most characters to record on demand per day (default 20000)
import fs from 'node:fs';
import path from 'node:path';
import { VOICES, cleanText, hashText } from './src/lib/tts.shared.js';

export const MODEL_QUALITY = 'eleven_v4'; // best quality: lessons + booklet, recorded ahead of time
export const MODEL_FAST = 'eleven_v4_turbo'; // ~2s: explanations of random exercises, on demand
const MAX_CHARS = 420;

export function readKey(root) {
  for (const name of ['config.env', '.env.local', '.env']) {
    try {
      const m = fs.readFileSync(path.join(root, name), 'utf8').match(/^\s*ELEVEN_LABS_API_KEY\s*=\s*(.+?)\s*$/m);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    } catch {
      /* file not there */
    }
  }
  return process.env.ELEVEN_LABS_API_KEY || null;
}

/** one sentence -> mp3 Buffer (Hebrew needs the v4 models) */
export async function synthesize({ key, voiceId, text, model = MODEL_QUALITY }) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: model, language_code: 'he' }),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
}

/** recordings made ahead of time (part of the project) */
export const audioPath = (root, voiceKey, hash) => path.join(root, 'public', 'tts', voiceKey, hash + '.mp3');

/** request handler for tts/… and api/progress; calls next() for everything else */
export function createHandler(root) {
  const inFlight = new Map();
  const dataDir = process.env.COURSE_DATA_DIR || path.join(root, 'data');
  // on-demand recordings: next to the recorded ones while developing, on the data disk when hosted
  const cachePath = (voiceKey, hash) =>
    process.env.COURSE_DATA_DIR ? path.join(dataDir, 'tts', voiceKey, hash + '.mp3') : audioPath(root, voiceKey, hash);
  const dailyLimit = Number(process.env.TTS_DAILY_CHARS || 20000);
  const used = { day: '', chars: 0 };

  // ---- the mini database: one JSON file with the student's progress, shared by all devices
  const dbFile = path.join(dataDir, 'progress.json');
  const readDb = () => {
    try {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch {
      return { rev: 0, state: null };
    }
  };
  const progress = (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'GET') return res.end(JSON.stringify(readDb()));
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 300000) req.destroy();
    });
    req.on('end', () => {
      try {
        const state = JSON.parse(body);
        if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('not an object');
        const db = { rev: readDb().rev + 1, savedAt: new Date().toISOString(), state };
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(dbFile + '.tmp', JSON.stringify(db, null, 1));
        fs.renameSync(dbFile + '.tmp', dbFile); // never leave a half-written file
        res.end(JSON.stringify({ rev: db.rev }));
      } catch {
        res.statusCode = 400;
        res.end('{"error":"bad data"}');
      }
    });
  };

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://local');
    if (url.pathname.endsWith('/api/progress')) return progress(req, res);
    if (url.pathname.endsWith('/tts/status')) {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ eleven: !!readKey(root) }));
    }
    const m = url.pathname.match(/\/tts\/([a-z]+)\/([0-9a-f]{16})\.mp3$/);
    if (!m) return next();
    const voice = VOICES.find((v) => v.key === m[1]);
    const fail = (code, msg) => {
      res.statusCode = code;
      res.end(msg);
    };
    if (!voice) return fail(404, 'unknown voice');
    const recorded = audioPath(root, voice.key, m[2]);
    const file = fs.existsSync(recorded) ? recorded : cachePath(voice.key, m[2]);
    try {
      if (!fs.existsSync(file)) {
        const text = cleanText(url.searchParams.get('t') || '');
        const key = readKey(root);
        if (!key) return fail(404, 'no api key');
        // only record real course sentences: the hash must match, Hebrew, and not too long
        if (!text || text.length > MAX_CHARS || hashText(text) !== m[2] || !/[֐-׿]/.test(text)) return fail(400, 'bad text');
        if (!inFlight.has(file)) {
          // a daily ceiling, so a public address cannot drain the ElevenLabs quota
          const today = new Date().toISOString().slice(0, 10);
          if (used.day !== today) Object.assign(used, { day: today, chars: 0 });
          if (used.chars + text.length > dailyLimit) return fail(429, 'daily voice limit reached');
          used.chars += text.length;
          inFlight.set(
            file,
            synthesize({ key, voiceId: voice.id, text, model: MODEL_FAST })
              .then((buf) => {
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.writeFileSync(file, buf);
              })
              .finally(() => inFlight.delete(file)),
          );
        }
        await inFlight.get(file);
      }
      const buf = fs.readFileSync(file);
      res.setHeader('content-type', 'audio/mpeg');
      res.setHeader('content-length', buf.length);
      res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      res.end(buf);
    } catch (e) {
      console.error('[tts]', e.message);
      fail(502, 'voice unavailable');
    }
  };
}

export function ttsPlugin() {
  let handler = (req, res, next) => next();
  const use = (server) => server.middlewares.use((req, res, next) => handler(req, res, next));
  return {
    name: 'eleven-tts',
    configResolved(config) {
      handler = createHandler(config.root);
    },
    configureServer: use,
    configurePreviewServer: use,
  };
}
