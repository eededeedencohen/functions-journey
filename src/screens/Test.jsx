import { useMemo, useState } from 'react';
import PartView from '../components/PartView.jsx';
import Mascot from '../components/Mascot.jsx';
import Rich from '../components/Rich.jsx';
import Icon from '../components/Icon.jsx';
import Confetti from '../components/Confetti.jsx';
import { SolutionModal } from './Runner.jsx';
import { answerText, buildTest, grade, isEmpty } from '../lib/generators.js';
import { stop, unlock } from '../lib/speech.js';
import { sfx } from '../lib/sfx.js';
import { actions, useStore } from '../lib/store.js';
import { go } from '../lib/router.js';

const KIND = {
  graph: { label: 'גרפים', unit: 'read' },
  table: { label: 'חקירת טבלה', unit: 'table' },
  eq: { label: 'משוואות', unit: 'eq' },
};

function verdict(g) {
  if (g >= 90) return ['מצוין!', 'שליטה מלאה בחומר. כל הכבוד!'];
  if (g >= 75) return ['טוב מאוד!', 'עוד קצת תרגול בנושאים שסומנו, וזה מושלם.'];
  if (g >= 55) return ['יפה, בדרך הנכונה', 'כדאי לצפות בהסברים של השאלות שלא הצליחו ולתרגל שוב.'];
  return ['לא נורא – ככה לומדים', 'בואו נחזור לשיעורים ולתרגול, ואז ננסה שוב. אני איתך!'];
}

export default function Test() {
  const { tests } = useStore();
  const [phase, setPhase] = useState('intro'); // intro | run | done
  const [kind, setKind] = useState('full');
  const [problems, setProblems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState(null);
  const [solution, setSolution] = useState(null);

  const qs = useMemo(() => problems.flatMap((problem, pi) => problem.parts.map((part) => ({ problem, part, key: pi + '-' + part.id }))), [problems]);

  const start = (k) => {
    unlock();
    setKind(k);
    setProblems(buildTest(k));
    setValues({});
    setIdx(0);
    setOpen(null);
    setPhase('run');
    window.scrollTo(0, 0);
  };

  // ------------------------------------------------------------------ intro
  if (phase === 'intro') {
    return (
      <div className="page center">
        <header className="topbar">
          <button className="icon-btn" onClick={() => go('')} aria-label="חזרה">
            <Icon name="x" />
          </button>
          <div className="topbar-title">
            <strong>מבחן</strong>
          </div>
        </header>
        <div className="card summary">
          <Mascot size={120} />
          <h1>מוכנים למבחן?</h1>
          <p>
            במבחן אין רמזים ואין בדיקה באמצע. בסוף מקבלים ציון, רואים מה היה נכון, ואפשר לצפות בהסבר מלא לכל שאלה.
          </p>
          <div className="row">
            <button className="btn primary big" onClick={() => start('full')}>
              <span className="row-btn"><Icon name="trophy" /> מבחן מלא</span>
              <small>כ־15 שאלות · 20 דקות</small>
            </button>
            <button className="btn soft big" onClick={() => start('short')}>
              <span className="row-btn"><Icon name="zap" /> מבחן קצר</span>
              <small>כ־9 שאלות · 10 דקות</small>
            </button>
          </div>
          {tests.length > 0 && (
            <div className="history">
              <h3>הציונים האחרונים</h3>
              <div className="bars" dir="ltr">
                {tests.slice(-8).map((t, i) => (
                  <div key={i} className="bar" style={{ '--h': t.grade + '%' }}>
                    <span>{t.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ results
  if (phase === 'done') {
    const rows = qs.map((q) => ({ ...q, res: grade(q.part, values[q.key]), empty: isEmpty(q.part, values[q.key]) }));
    const total = rows.reduce((s, r) => s + r.part.points, 0);
    const got = rows.reduce((s, r) => s + r.part.points * r.res.score, 0);
    const g = Math.round((100 * got) / total);
    const [head, text] = verdict(g);
    const byKind = Object.keys(KIND)
      .map((k) => {
        const rs = rows.filter((r) => r.problem.kind === k);
        const t = rs.reduce((s, r) => s + r.part.points, 0);
        return { k, pct: t ? Math.round((100 * rs.reduce((s, r) => s + r.part.points * r.res.score, 0)) / t) : null };
      })
      .filter((x) => x.pct !== null);
    return (
      <div className="page results">
        <header className="topbar">
          <button className="icon-btn" onClick={() => go('')} aria-label="חזרה">
            <Icon name="x" />
          </button>
          <div className="topbar-title">
            <strong>תוצאות המבחן</strong>
          </div>
        </header>
        <Confetti fire={g >= 75 ? 1 : 0} count={70} />
        <div className="card score-card">
          <div className="ring" style={{ '--p': g }}>
            <div>
              <b>{g}</b>
              <span>ציון</span>
            </div>
          </div>
          <div className="score-text">
            <h1>{head}</h1>
            <p>{text}</p>
            <div className="kinds">
              {byKind.map(({ k, pct }) => (
                <button key={k} className={`kind ${pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'low'}`} onClick={() => go('lesson/' + KIND[k].unit)}>
                  <span>{KIND[k].label}</span>
                  <b>{pct}%</b>
                </button>
              ))}
            </div>
          </div>
          <Mascot size={110} mood={g >= 55 ? 'happy' : 'idle'} />
        </div>

        <h2 className="section-title">כל השאלות</h2>
        <div className="review">
          {rows.map((r, n) => {
            const state = r.res.score === 1 ? 'ok' : r.res.score > 0 ? 'part' : 'bad';
            return (
              <div key={r.key} className={`card review-row ${state}`}>
                <button className="review-head" onClick={() => setOpen(open === n ? null : n)}>
                  <span className="mark">
                    <Icon name={state === 'ok' ? 'check' : state === 'part' ? 'minus' : 'x'} size={20} stroke={3.2} />
                  </span>
                  <span className="review-title">
                    <strong>
                      {n + 1}. {r.part.title}
                    </strong>
                    <small>
                      {r.problem.title} · {Math.round(r.part.points * r.res.score * 10) / 10} מתוך {r.part.points} נק׳
                      {r.empty ? ' · לא נענתה' : ''}
                    </small>
                  </span>
                  <span className="chev">
                    <Icon name={open === n ? 'chevron-up' : 'chevron-down'} size={20} />
                  </span>
                </button>
                {open === n && (
                  <div className="review-body">
                    <PartView problem={r.problem} part={r.part} value={values[r.key]} onChange={() => {}} locked result={r.res} showAnswers />
                    <div className="review-foot">
                      <div className="answer-line">
                        התשובה הנכונה: <Rich text={answerText(r.part)} />
                      </div>
                      <button
                        className="btn primary"
                        onClick={() => {
                          unlock();
                          setSolution(r.part);
                        }}
                      >
                        <Icon name="explain" /> הסבר מלא
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="row end-row">
          <button className="btn primary" onClick={() => setPhase('intro')}>
            מבחן חדש
          </button>
          <button className="btn soft" onClick={() => go('')}>
            לדף הבית
          </button>
        </div>
        {solution && <SolutionModal part={solution} onClose={() => setSolution(null)} />}
      </div>
    );
  }

  // ------------------------------------------------------------------ running
  const q = qs[idx];
  const missing = qs.filter((x) => isEmpty(x.part, values[x.key])).length;
  const submit = () => {
    stop();
    const total = qs.reduce((s, x) => s + x.part.points, 0);
    const got = qs.reduce((s, x) => s + x.part.points * grade(x.part, values[x.key]).score, 0);
    const g = Math.round((100 * got) / total);
    actions.recordTest(g, kind);
    actions.addStars(Math.round(g / 2));
    sfx.win();
    setConfirm(false);
    setPhase('done');
    window.scrollTo(0, 0);
  };
  const forward = () => (idx < qs.length - 1 ? setIdx(idx + 1) : missing ? setConfirm(true) : submit());

  return (
    <div className="page runner">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setPhase('intro')} aria-label="יציאה">
          <Icon name="x" />
        </button>
        <div className="topbar-title">
          <strong>
            שאלה {idx + 1} מתוך {qs.length}
          </strong>
          <span>
            {q.problem.title} · {q.part.title}
          </span>
        </div>
        <div className="dots many">
          {qs.map((x, n) => (
            <i key={x.key} className={`${n === idx ? 'now' : ''} ${isEmpty(x.part, values[x.key]) ? '' : 'done'}`} onClick={() => setIdx(n)} />
          ))}
        </div>
      </header>

      <PartView
        key={q.key}
        problem={q.problem}
        part={q.part}
        value={values[q.key]}
        onChange={(v) => setValues((all) => ({ ...all, [q.key]: v }))}
        onEnter={forward}
      />

      <footer className="feedback answer">
        <div className="fb-text note">{idx === qs.length - 1 && missing > 0 ? `נשארו ${missing} שאלות בלי תשובה` : ''}</div>
        <div className="fb-actions">
          <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            <Icon name="arrow-right" /> הקודם
          </button>
          <button className="btn primary wide" onClick={forward}>
            {idx < qs.length - 1 ? 'הבא' : 'הגשת המבחן'} <Icon name={idx < qs.length - 1 ? 'arrow-left' : 'check'} />
          </button>
        </div>
      </footer>

      {confirm && (
        <div className="modal dim">
          <div className="card dialog">
            <h2>להגיש את המבחן?</h2>
            <p>נשארו {missing} שאלות בלי תשובה מלאה.</p>
            <div className="row">
              <button className="btn soft" onClick={() => setConfirm(false)}>
                חזרה למבחן
              </button>
              <button className="btn primary" onClick={submit}>
                להגיש בכל זאת
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
