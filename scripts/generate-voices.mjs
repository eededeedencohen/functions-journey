// Records every fixed sentence of the course (lessons, booklet pages, short phrases) with the
// ElevenLabs voices into public/tts, so the tablet plays them instantly.
//   npm run voices            record whatever is missing
//   npm run voices -- --dry   only count sentences and characters (costs nothing)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNITS } from '../src/lib/lessons.js';
import { BOOKLET, poolProblems } from '../src/lib/generators.js';
import { FIXED_PHRASES } from '../src/lib/phrases.js';
import { VOICES, cleanText, hashText } from '../src/lib/tts.shared.js';
import { MODEL_QUALITY, audioPath, readKey, synthesize } from '../tts-server.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');

const texts = new Set();
const add = (t) => t && texts.add(cleanText(t));
FIXED_PHRASES.forEach(add);
for (const u of UNITS)
  for (const s of u.lesson) {
    add(s.say);
    add(s.quiz?.right);
    add(s.quiz?.wrong);
  }
const lessonCount = texts.size;
// booklet pages + the whole practice/test pool: the question and every step of its explanation
for (const problem of [...BOOKLET.flatMap((item) => item.build()), ...poolProblems()])
  for (const part of problem.parts) {
    add(part.say);
    part.solution.forEach((s) => add(s.say));
  }
console.log(`lessons and phrases: ${lessonCount} sentences | booklet + exercise pool: ${texts.size - lessonCount} sentences`);

const jobs = [];
for (const voice of VOICES)
  for (const text of texts) {
    const file = audioPath(root, voice.key, hashText(text));
    if (!fs.existsSync(file)) jobs.push({ voice, text, file });
  }
const chars = jobs.reduce((n, j) => n + j.text.length, 0);
console.log(`${texts.size} sentences x ${VOICES.length} voices | missing: ${jobs.length} recordings, ${chars} characters`);
if (dry || !jobs.length) process.exit(0);

const key = readKey(root);
if (!key) {
  console.error('No ELEVEN_LABS_API_KEY found in config.env');
  process.exit(1);
}

let done = 0;
let failed = 0;
const worker = async () => {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    try {
      const buf = await synthesize({ key, voiceId: job.voice.id, text: job.text, model: MODEL_QUALITY });
      fs.mkdirSync(path.dirname(job.file), { recursive: true });
      fs.writeFileSync(job.file, buf);
    } catch (e) {
      failed++;
      console.error('FAILED:', job.voice.key, job.text.slice(0, 40), '-', e.message);
    }
    if (++done % 25 === 0) console.log(`  ${done} done...`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker)); // the plan allows 5 requests at a time
console.log(`finished: ${done - failed} recorded, ${failed} failed`);
