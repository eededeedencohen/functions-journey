import { useState, useSyncExternalStore } from 'react';
import Icon from '../components/Icon.jsx';
import { actions, useSaveStatus, useStore } from '../lib/store.js';
import { VOICE_TEST } from '../lib/phrases.js';
import { VOICES } from '../lib/tts.shared.js';
import { hebrewVoices, narrate, subscribe, unlock, voiceStatus } from '../lib/speech.js';

const RATES = [
  [0.8, 'לאט'],
  [0.95, 'רגיל'],
  [1.15, 'מהר'],
];

function Toggle({ icon, label, value, onChange }) {
  return (
    <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <span>
        <Icon name={icon} size={20} /> {label}
      </span>
      <i />
    </button>
  );
}

export default function Settings({ onClose }) {
  const { settings, name } = useStore();
  const saved = useSaveStatus();
  // re-render when the browser finishes loading its voices
  useSyncExternalStore(subscribe, () => hebrewVoices().length);
  const [sure, setSure] = useState(false);
  const status = voiceStatus();
  const test = (over = {}) => {
    unlock();
    narrate(VOICE_TEST, { rate: settings.rate, voice: settings.voiceKey, ...over });
  };

  return (
    <div className="modal dim" onClick={onClose}>
      <div className="card dialog settings" onClick={(e) => e.stopPropagation()}>
        <h2>הגדרות</h2>

        <Toggle icon="volume" label="הסבר קולי" value={settings.voice} onChange={(v) => actions.setSetting('voice', v)} />
        <Toggle icon="forward" label="מעבר אוטומטי לשלב הבא" value={settings.auto} onChange={(v) => actions.setSetting('auto', v)} />
        <Toggle icon="music" label="צלילים" value={settings.sfx} onChange={(v) => actions.setSetting('sfx', v)} />

        <div className="set-row">
          <span>הקול של בוטי</span>
          <div className="seg-group">
            {[...VOICES, { key: 'device', label: 'קול המכשיר' }].map((v) => (
              <button
                key={v.key}
                className={settings.voiceKey === v.key ? 'on' : ''}
                onClick={() => {
                  actions.setSetting('voiceKey', v.key);
                  test({ voice: v.key });
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          {settings.voiceKey === 'device' && status !== 'ok' && (
            <p className="hint-note">
              {status === 'unsupported'
                ? 'הדפדפן הזה לא תומך בהקראה. ההסברים יופיעו ככתוביות.'
                : 'לא נמצא במכשיר קול בעברית, ולכן ההסברים יופיעו ככתוביות.'}
            </p>
          )}
        </div>

        <div className="set-row">
          <span>מהירות הדיבור</span>
          <div className="seg-group">
            {RATES.map(([r, label]) => (
              <button
                key={r}
                className={settings.rate === r ? 'on' : ''}
                onClick={() => {
                  actions.setSetting('rate', r);
                  test({ rate: r });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button className="btn soft" onClick={() => test()}>
          <Icon name="play" size={18} fill="currentColor" /> בדיקת קול
        </button>

        <div className="set-row">
          <span>השם שלי</span>
          <input className="text-input" value={name} maxLength={20} onChange={(e) => actions.setName(e.target.value)} />
        </div>

        <p className={`save-note ${saved ? 'ok' : ''}`}>
          <Icon name={saved ? 'check' : 'tap'} size={18} />
          {saved
            ? 'ההתקדמות נשמרת במחשב ומשותפת לכל המכשירים – אפשר להמשיך מכל מכשיר.'
            : saved === false
              ? 'ההתקדמות נשמרת כרגע רק במכשיר הזה (אין חיבור לשרת הקורס).'
              : 'בודק חיבור לשרת הקורס…'}
        </p>

        <div className="row">
          {sure ? (
            <button
              className="btn danger"
              onClick={() => {
                actions.reset();
                onClose();
              }}
            >
              בטוח? למחוק את כל ההתקדמות
            </button>
          ) : (
            <button className="btn ghost" onClick={() => setSure(true)}>
              איפוס התקדמות
            </button>
          )}
          <button className="btn primary" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
