import { useSyncExternalStore } from 'react';
import { isTalking, subscribe } from '../lib/speech.js';

/** Boti the robot teacher. The mouth moves while the voice is speaking. */
export default function Mascot({ size = 96, mood = 'idle' }) {
  const talking = useSyncExternalStore(subscribe, isTalking);
  return (
    <svg className={`bot ${talking ? 'talking' : ''} ${mood}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <line x1="60" y1="20" x2="60" y2="8" stroke="#1d2740" strokeWidth="4" strokeLinecap="round" />
      <circle className="bot-bulb" cx="60" cy="8" r="6" fill="#ffc93c" stroke="#1d2740" strokeWidth="3" />
      <rect x="8" y="50" width="12" height="26" rx="6" fill="#ff7a2f" stroke="#1d2740" strokeWidth="3" />
      <rect x="100" y="50" width="12" height="26" rx="6" fill="#ff7a2f" stroke="#1d2740" strokeWidth="3" />
      <rect x="18" y="20" width="84" height="80" rx="24" fill="#7a5af8" stroke="#1d2740" strokeWidth="4" />
      <rect x="28" y="32" width="64" height="40" rx="16" fill="#fffdf8" stroke="#1d2740" strokeWidth="3" />
      <g className="bot-eyes">
        {mood === 'happy' ? (
          <>
            <path d="M38 55 q7 -10 14 0" fill="none" stroke="#1d2740" strokeWidth="4" strokeLinecap="round" />
            <path d="M68 55 q7 -10 14 0" fill="none" stroke="#1d2740" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="45" cy="52" r="7" fill="#1d2740" />
            <circle cx="75" cy="52" r="7" fill="#1d2740" />
            <circle cx="47.5" cy="49.5" r="2.4" fill="#fff" />
            <circle cx="77.5" cy="49.5" r="2.4" fill="#fff" />
          </>
        )}
      </g>
      {mood === 'sad' ? (
        <path d="M48 90 q12 -9 24 0" fill="none" stroke="#1d2740" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <rect className="bot-mouth" x="46" y="80" width="28" height="9" rx="4.5" fill="#1d2740" />
      )}
      <circle cx="30" cy="84" r="4" fill="#ff9fc0" opacity=".8" />
      <circle cx="90" cy="84" r="4" fill="#ff9fc0" opacity=".8" />
    </svg>
  );
}
