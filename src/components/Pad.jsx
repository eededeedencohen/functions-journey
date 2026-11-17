import { useCallback, useEffect, useState } from 'react';
import { sfx } from '../lib/sfx.js';
import Icon from './Icon.jsx';

// On-screen number pad, so the tablet's own keyboard never covers the exercise.
// Values are kept as strings ("-12") by the parent; parse with toNum().

export const toNum = (v) => (v === undefined || v === '' || v === '-' ? null : Number(v));
export const showVal = (v) => (v || '').replace('-', '−');

export function usePad({ ids, values, onChange, onEnter, disabled }) {
  const [active, setActive] = useState(() => ids.find((id) => !values[id]) || ids[0]);

  const press = useCallback(
    (k) => {
      if (disabled) return;
      if (!ids.length) {
        if (k === 'next') onEnter?.();
        return;
      }
      const cur = values[active] || '';
      let next = cur;
      if (k === 'next') {
        const i = ids.indexOf(active);
        if (i < ids.length - 1) setActive(ids[i + 1]);
        else onEnter?.();
        return;
      }
      if (k === 'del') next = cur.slice(0, -1);
      else if (k === '-') next = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      else if (cur.replace('-', '').length < 3) {
        const digits = cur.replace('-', '');
        next = (cur.startsWith('-') ? '-' : '') + (digits === '0' ? k : digits + k);
      }
      if (next !== cur) onChange({ ...values, [active]: next });
    },
    [active, ids, values, onChange, onEnter, disabled],
  );

  // a real keyboard works too (handy on a computer)
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === '-') press('-');
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        press('next');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [press]);

  return { ids, values, active, setActive, press, disabled };
}

/** one answer box; mark: 'ok' | 'bad' | undefined */
export function Slot({ pad, id, mark, reveal }) {
  const on = pad.active === id && !pad.disabled;
  return (
    <button
      type="button"
      dir="ltr"
      className={`slot ${on ? 'on' : ''} ${mark || ''}`}
      onClick={() => !pad.disabled && pad.setActive(id)}
    >
      {showVal(pad.values[id]) || (on ? '' : ' ')}
      {on && <i className="caret" />}
      {reveal !== undefined && mark === 'bad' && <span className="slot-fix">{reveal}</span>}
    </button>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'del'];

export function NumPad({ pad }) {
  return (
    <div className={`numpad ${pad.disabled ? 'off' : ''}`} dir="ltr">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`key ${k === '-' || k === 'del' ? 'alt' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            sfx.tap();
            pad.press(k);
          }}
        >
          {k === 'del' ? <Icon name="backspace" size={26} /> : k === '-' ? '−' : k}
        </button>
      ))}
      {pad.ids.length > 1 && (
        <button
          type="button"
          className="key wide"
          dir="rtl"
          onPointerDown={(e) => {
            e.preventDefault();
            pad.press('next');
          }}
        >
          למשבצת הבאה <Icon name="arrow-left" size={18} />
        </button>
      )}
    </div>
  );
}
