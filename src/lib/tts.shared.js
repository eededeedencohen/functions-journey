// Shared by the app (browser) and by the Node side (voice server + generate script),
// so both always agree on which audio file belongs to which sentence.

/** the two ElevenLabs teacher voices (library voice ids) */
export const VOICES = [
  { key: 'danit', id: 's0T0DT6EAPeX57MQpn3I', label: 'דנית' },
  { key: 'itamar', id: 'l7Q9rbdCC6j3J5dNlOOg', label: 'איתמר' },
];

/** the voice gets clean words only: no markup or math symbols it might read aloud */
export function cleanText(text) {
  return String(text || '')
    .replace(/[$*←→✔✓]/g, ' ')
    .replace(/−/g, ' מינוס ')
    .replace(/÷/g, ' חלקי ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** small, fast, dependency-free 64-bit string hash (cyrb53 style) -> 16 hex chars */
export function hashText(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/** relative path of the audio file for an (already cleaned) sentence */
export const ttsFile = (voiceKey, clean) => `tts/${voiceKey}/${hashText(clean)}.mp3`;
