import { useState } from 'react';
import Mascot from '../components/Mascot.jsx';
import Rich from '../components/Rich.jsx';
import Icon, { Stars } from '../components/Icon.jsx';
import Settings from './Settings.jsx';
import { UNITS } from '../lib/lessons.js';
import { BOOKLET } from '../lib/generators.js';
import { useStore } from '../lib/store.js';
import { go } from '../lib/router.js';
import { unlock } from '../lib/speech.js';

export default function Home() {
  const { name, stars, lessons, practice, booklet, tests } = useStore();
  const [settings, setSettings] = useState(false);
  const doneCount = UNITS.filter((u) => lessons[u.id]).length;
  const nextUnit = UNITS.find((u) => !lessons[u.id]);
  const best = tests.length ? Math.max(...tests.map((t) => t.grade)) : null;
  const open = (path) => {
    unlock();
    go(path);
  };

  return (
    <div className="page home">
      <header className="home-top">
        <Mascot size={92} mood="happy" />
        <div className="hello">
          <h1>שלום{name ? `, ${name}` : ''}!</h1>
          <p>
            {nextUnit ? <Rich text={`השיעור הבא שלך: ${nextUnit.title}`} /> : 'סיימת את כל השיעורים! זה הזמן לתרגל ולהיבחן.'}
          </p>
        </div>
        <div className="home-stats">
          <Stars n={stars} big />
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="הגדרות">
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <div className="progress-line">
        <div className="progress-fill" style={{ width: `${(100 * doneCount) / UNITS.length}%` }} />
        <span>
          {doneCount} מתוך {UNITS.length} שיעורים
        </span>
      </div>

      <h2 className="section-title">המסלול שלי</h2>
      <div className="units">
        {UNITS.map((u, i) => {
          const p = practice[u.id];
          return (
            <div key={u.id} className={`card unit ${lessons[u.id] ? 'done' : ''}`} style={{ '--c': u.color }}>
              <div className="unit-head">
                <div className="unit-num">{lessons[u.id] ? <Icon name="check" size={20} stroke={3.2} /> : i + 1}</div>
                <div className="unit-icon">
                  <Icon name={u.icon} size={30} />
                </div>
              </div>
              <Rich as="h3" text={u.title} />
              <Rich as="p" text={u.sub} />
              <div className="unit-meta">{p ? `תרגול: ${p.right} מתוך ${p.total} נכון` : 'עוד לא תרגלת'}</div>
              <div className="unit-actions">
                <button className="btn primary" onClick={() => open('lesson/' + u.id)}>
                  <Icon name="play" size={18} fill="currentColor" /> שיעור
                </button>
                <button className="btn soft" onClick={() => open('practice/' + u.id)}>
                  <Icon name="pencil" size={18} /> תרגול
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="specials">
        <button className="card special test" onClick={() => open('test')}>
          <div className="special-icon">
            <Icon name="trophy" size={44} />
          </div>
          <h3>מבחן</h3>
          <p>שאלות מכל הנושאים, ציון, והסבר מלא לכל שאלה</p>
          {best !== null && (
            <div className="best">
              הציון הכי טוב שלך: <b>{best}</b>
            </div>
          )}
          <span className="btn">
            להתחיל מבחן <Icon name="arrow-left" />
          </span>
        </button>
        <div className="card special book">
          <div className="special-icon">
            <Icon name="notebook" size={36} />
          </div>
          <div>
            <h3>החוברת שלי</h3>
            <p>בדיוק התרגילים מדפי העבודה – עם בדיקה והסבר</p>
            <div className="book-list">
              {BOOKLET.map((b) => (
                <button key={b.id} className={`book-item ${booklet[b.id] !== undefined ? 'done' : ''}`} onClick={() => open('booklet/' + b.id)}>
                  <Icon name={booklet[b.id] !== undefined ? 'check' : b.icon} size={22} />
                  <Rich as="strong" text={b.title} />
                  <Rich as="small" text={booklet[b.id] !== undefined ? `הושלם · ${Math.round(booklet[b.id] * 100)}%` : b.sub} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
