import { useMemo, useState } from 'react';
import PartView from '../components/PartView.jsx';
import StepPlayer from '../components/StepPlayer.jsx';
import Mascot from '../components/Mascot.jsx';
import Rich from '../components/Rich.jsx';
import Icon, { Stars } from '../components/Icon.jsx';
import Confetti from '../components/Confetti.jsx';
import { grade, isEmpty } from '../lib/generators.js';
import { PRAISE, RETRY, REVEAL } from '../lib/phrases.js';
import { narrate, stop, unlock } from '../lib/speech.js';
import { sfx } from '../lib/sfx.js';
import { actions, useStore } from '../lib/store.js';
import { pick } from '../lib/math.js';

/** modal that plays the narrated, animated solution of one part */
export function SolutionModal({ part, onClose }) {
  return (
    <div className="modal">
      <StepPlayer compact steps={part.solution} title={`הסבר: ${part.title}`} onExit={onClose} onFinish={onClose} finishLabel="הבנתי!" />
    </div>
  );
}

/**
 * Runs exercises one part at a time with instant feedback:
 * first mistake -> hint and another try, second mistake -> the answer is revealed.
 * source(i) returns the i-th problem, or null when there are no more (booklet pages).
 */
export default function Runner({ title, source, count, onExit, onRecord, onDone }) {
  const { settings, stars } = useStore();
  const [pi, setPi] = useState(0);
  const problem = useMemo(() => source(pi), [source, pi]);
  const [partIdx, setPartIdx] = useState(0);
  const [value, setValue] = useState(undefined);
  const [tries, setTries] = useState(0);
  const [phase, setPhase] = useState('answer'); // answer | retry | right | reveal
  const [result, setResult] = useState(null);
  const [note, setNote] = useState('');
  const [praise, setPraise] = useState('');
  const [solution, setSolution] = useState(false);
  const [party, setParty] = useState(0);
  const [stats, setStats] = useState({ right: 0, total: 0 });

  const voice = (text) => settings.voice && narrate(text, { rate: settings.rate, voice: settings.voiceKey });

  if (!problem) {
    return (
      <div className="page center">
        <Confetti fire={1} count={60} />
        <div className="card summary">
          <Mascot size={130} mood="happy" />
          <Rich as="h1" text={`סיימת את ${title}!`} />
          <p className="big-num" dir="ltr">
            {stats.right} / {stats.total}
          </p>
          <p>תשובות נכונות בניסיון הראשון</p>
          <div className="row">
            <button className="btn primary" onClick={onExit}>
              חזרה
            </button>
            <button
              className="btn soft"
              onClick={() => {
                setPi(0);
                setStats({ right: 0, total: 0 });
              }}
            >
              <Icon name="replay" /> שוב מההתחלה
            </button>
          </div>
        </div>
      </div>
    );
  }

  const part = problem.parts[partIdx];
  const locked = phase === 'right' || phase === 'reveal';

  const finishPart = (firstTry, score) => {
    setStats((s) => ({ right: s.right + (firstTry ? 1 : 0), total: s.total + 1 }));
    onRecord?.(firstTry, score);
  };

  const check = () => {
    if (locked) return next();
    if (isEmpty(part, value)) {
      setNote(part.type === 'nums' ? 'צריך למלא את כל המשבצות לפני הבדיקה.' : 'צריך לענות לפני הבדיקה.');
      return;
    }
    setNote('');
    const res = grade(part, value);
    setResult(res);
    if (res.score === 1) {
      const p = pick(PRAISE);
      setPraise(p);
      setPhase('right');
      setParty((v) => v + 1);
      sfx.right();
      actions.addStars(tries === 0 ? 10 : 5);
      finishPart(tries === 0, 1);
      voice(p);
    } else if (tries === 0) {
      setTries(1);
      setPhase('retry');
      sfx.wrong();
      voice(RETRY);
    } else {
      setPhase('reveal');
      sfx.wrong();
      finishPart(false, res.score);
      voice(REVEAL);
    }
  };

  const reset = () => {
    setValue(undefined);
    setTries(0);
    setPhase('answer');
    setResult(null);
    setNote('');
  };

  const next = () => {
    stop();
    reset();
    if (partIdx < problem.parts.length - 1) setPartIdx(partIdx + 1);
    else {
      const done = pi + 1;
      if (count && done >= count) onDone?.(stats);
      setPartIdx(0);
      setPi(done);
    }
  };

  const change = (v) => {
    setValue(v);
    setNote('');
    if (phase === 'retry') setResult(null);
  };

  return (
    <div className="page runner">
      <header className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="יציאה">
          <Icon name="x" />
        </button>
        <div className="topbar-title">
          <Rich as="strong" text={problem.title && count ? problem.title : title} />
          <span>{part.title}</span>
        </div>
        {problem.parts.length > 1 && (
          <div className="dots">
            {problem.parts.map((p, n) => (
              <i key={p.id} className={n < partIdx ? 'done' : n === partIdx ? 'now' : ''} />
            ))}
          </div>
        )}
        <Stars n={stars} />
      </header>

      <PartView
        key={pi + '-' + part.id}
        problem={problem}
        part={part}
        value={value}
        onChange={change}
        locked={locked}
        result={result}
        showAnswers={phase === 'reveal'}
        onEnter={check}
      />

      <footer className={`feedback ${phase}`}>
        <Confetti fire={party} />
        {phase === 'right' && (
          <div className="fb-text">
            <Mascot size={56} mood="happy" />
            <div>
              <strong>{praise}</strong>
              <span className="gain">
                +{tries === 0 ? 10 : 5} <Icon name="star" size={17} fill="currentColor" />
              </span>
            </div>
          </div>
        )}
        {phase === 'retry' && (
          <div className="fb-text">
            <Mascot size={56} mood="sad" />
            <div>
              <strong>כמעט! נסו שוב</strong>
              <span className="hint-line">
                <Icon name="lightbulb" size={19} />
                <Rich text={part.hint} />
              </span>
            </div>
          </div>
        )}
        {phase === 'reveal' && (
          <div className="fb-text">
            <Mascot size={56} />
            <div>
              <strong>לא נורא, ככה לומדים!</strong>
              <span>התשובה הנכונה מסומנת בירוק. כדאי לצפות בהסבר המלא.</span>
            </div>
          </div>
        )}
        {phase === 'answer' && note && <div className="fb-text note">{note}</div>}
        <div className="fb-actions">
          {(locked || phase === 'retry') && (
            <button
              className={`btn ${phase === 'reveal' ? 'primary' : 'soft'}`}
              onClick={() => {
                unlock();
                setSolution(true);
              }}
            >
              <Icon name="explain" /> הסבר מלא
            </button>
          )}
          <button className={`btn ${phase === 'reveal' ? 'soft' : 'primary'} wide`} onClick={check}>
            {locked ? (
              <>
                הבא <Icon name="arrow-left" />
              </>
            ) : (
              <>
                בדיקה <Icon name="check" />
              </>
            )}
          </button>
        </div>
      </footer>

      {solution && <SolutionModal part={part} onClose={() => setSolution(false)} />}
    </div>
  );
}
