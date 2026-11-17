import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import CoordPlane, { C } from './CoordPlane.jsx';
import ValueTable from './ValueTable.jsx';
import EquationSteps from './EquationSteps.jsx';
import Mascot from './Mascot.jsx';
import Rich from './Rich.jsx';
import Icon from './Icon.jsx';
import Confetti from './Confetti.jsx';
import { isLoading, narrate, prefetch, stop, subscribe, unlock } from '../lib/speech.js';
import { sfx } from '../lib/sfx.js';
import { actions, useStore } from '../lib/store.js';
import { shuffle, range } from '../lib/math.js';

/** the "board": graph and/or table and/or equation for one step */
export function StepVisual({ step, extraPoints = [], onTap }) {
  const hasSide = step.table || step.eq;
  if (!step.graph && !hasSide) {
    return (
      <div className="visual hero" key={step.hero?.title}>
        <div className="hero-badge">
          <Icon name={step.hero?.icon || 'pencil'} size={84} stroke={2} />
        </div>
        {step.hero?.title && (
          <div className="hero-title" dir="auto">
            {step.hero.title}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`visual ${step.graph && hasSide ? 'both' : ''}`}>
      {step.graph && (
        <CoordPlane {...step.graph} points={[...(step.graph.points || []), ...extraPoints]} onTap={onTap} />
      )}
      {hasSide && (
        <div className="visual-side">
          {step.table && <ValueTable key={step.table.name + step.table.xs.join()} {...step.table} />}
          {step.eq && <EquationSteps key={step.eq.rows[0].l + step.eq.rows[0].r} {...step.eq} />}
        </div>
      )}
    </div>
  );
}

/**
 * Plays narrated steps: speaks `say`, shows `text`, animates the board, and moves on when
 * the voice has finished. Used for full lessons and (compact) for exercise solutions.
 */
export default function StepPlayer({ steps, title, onExit, onFinish, compact = false, finishLabel = 'סיימתי!' }) {
  const { settings } = useStore();
  const voiceLoading = useSyncExternalStore(subscribe, isLoading);
  const [i, setI] = useState(0);
  const [started, setStarted] = useState(compact);
  const [playing, setPlaying] = useState(true);
  const [spoken, setSpoken] = useState(false);
  const [replay, setReplay] = useState(0);
  const [quiz, setQuiz] = useState({ state: 'idle', picked: null, tap: null, tries: 0 });
  const [party, setParty] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const live = useRef({});
  live.current = { settings, playing };

  const order = useMemo(
    () => (step.quiz?.options ? shuffle(range(0, step.quiz.options.length - 1)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i],
  );

  const speak = (text, onEnd) => {
    const s = live.current.settings;
    narrate(text, { enabled: s.voice, rate: s.rate, voice: s.voiceKey, onEnd });
  };

  // get the coming sentences ready, so the voice starts without a pause
  useEffect(() => {
    if (!settings.voice) return;
    const ahead = compact && i === 0 ? steps : [step, steps[i + 1], steps[i + 2]];
    prefetch(
      ahead.filter(Boolean).flatMap((s) => [s.say, s.quiz?.right, s.quiz?.wrong]).filter(Boolean),
      settings.voiceKey,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, settings.voice, settings.voiceKey]);

  // narrate the current step
  useEffect(() => {
    if (!started) return;
    setSpoken(false);
    if (!playing) return;
    speak(step.say, () => setSpoken(true));
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, started, replay, playing]);

  useEffect(() => {
    setQuiz({ state: 'idle', picked: null, tap: null, tries: 0 });
  }, [i]);

  useEffect(() => stop, []);

  // move on automatically once the voice (and the quiz, if any) is done
  const ready = step.quiz ? quiz.state === 'done' : spoken;
  useEffect(() => {
    if (!started || !playing || !settings.auto || !ready || last) return;
    const t = setTimeout(() => setI((v) => Math.min(v + 1, steps.length - 1)), step.quiz ? 500 : 900);
    return () => clearTimeout(t);
  }, [ready, started, playing, settings.auto, last, steps.length, step.quiz]);

  const goTo = (n) => {
    stop();
    setI(Math.max(0, Math.min(steps.length - 1, n)));
    setPlaying(true);
  };

  const answer = (ok, patch) => {
    if (quiz.state === 'right' || quiz.state === 'done') return;
    if (ok) {
      sfx.right();
      setParty((p) => p + 1);
      actions.addStars(quiz.tries === 0 ? 3 : 1);
      setQuiz((q) => ({ ...q, ...patch, state: 'right' }));
      speak(step.quiz.right, () => setQuiz((q) => ({ ...q, state: 'done' })));
    } else {
      sfx.wrong();
      setQuiz((q) => ({ ...q, ...patch, state: 'wrong', tries: q.tries + 1 }));
      speak(step.quiz.wrong);
    }
  };

  const isPoint = step.quiz?.kind === 'point';
  const onTap = isPoint
    ? (x, y) => answer(x === step.quiz.answer[0] && y === step.quiz.answer[1], { tap: [x, y] })
    : undefined;
  const extraPoints =
    isPoint && quiz.tap
      ? [
          {
            id: 'tap' + quiz.tap.join('_'),
            x: quiz.tap[0],
            y: quiz.tap[1],
            color: quiz.state === 'wrong' ? C.bad : C.ok,
            label: `(${quiz.tap[0]}, ${quiz.tap[1]})`.replace(/-/g, '−'),
          },
        ]
      : [];

  const quizSolved = quiz.state === 'right' || quiz.state === 'done';
  const bubble =
    step.quiz && quiz.state === 'wrong' ? step.quiz.wrong : step.quiz && quizSolved ? step.quiz.right : step.text;

  return (
    <div className={`player ${compact ? 'compact' : ''}`}>
      <header className="player-top">
        <button className="icon-btn" onClick={onExit} aria-label="סגירה">
          <Icon name="x" />
        </button>
        <Rich as="div" className="player-title" text={title} />
        <div className="segs" dir="rtl">
          {steps.map((s, n) => (
            <button
              key={n}
              className={`seg ${n < i ? 'done' : ''} ${n === i ? 'now' : ''} ${s.quiz ? 'q' : ''}`}
              onClick={() => started && goTo(n)}
              aria-label={`שלב ${n + 1}`}
            />
          ))}
        </div>
        <button
          className={`icon-btn ${settings.voice ? '' : 'off'}`}
          onClick={() => {
            if (settings.voice) stop();
            actions.setSetting('voice', !settings.voice);
            setReplay((r) => r + 1);
          }}
          aria-label="קול"
        >
          <Icon name={settings.voice ? 'volume' : 'mute'} />
        </button>
      </header>

      <div className="player-body">
        <div className="stage card">
          {started ? (
            <StepVisual step={step} extraPoints={extraPoints} onTap={quizSolved ? undefined : onTap} />
          ) : (
            <div className="visual hero">
              <Mascot size={150} mood="happy" />
              <Rich as="div" className="hero-title" text={title} />
              <button
                className="btn primary big row-btn"
                onClick={() => {
                  unlock();
                  setStarted(true);
                }}
              >
                <Icon name="play" fill="currentColor" /> מתחילים
              </button>
            </div>
          )}
          <Confetti fire={party} />
        </div>

        <div className="side">
          <div className="teacher">
            <Mascot size={compact ? 64 : 84} mood={quiz.state === 'wrong' ? 'sad' : quizSolved ? 'happy' : 'idle'} />
            <div className={`bubble ${quiz.state}`} key={i + quiz.state}>
              <Rich text={started ? bubble : 'לחצו על "מתחילים" ואני אסביר הכול בקול.'} />
              {voiceLoading && (
                <span className="voice-loading">
                  <Icon name="loader" size={16} className="spin" /> הקול בדרך…
                </span>
              )}
            </div>
          </div>

          {started && step.quiz?.options && (
            <div className="options">
              {order.map((oi) => {
                const picked = quiz.picked === oi;
                const good = oi === step.quiz.answer;
                const cls = quizSolved && good ? 'right' : picked && quiz.state === 'wrong' ? 'wrong' : '';
                return (
                  <button
                    key={oi}
                    className={`option ${cls}`}
                    disabled={quizSolved}
                    onClick={() => answer(good, { picked: oi })}
                  >
                    <Rich text={step.quiz.options[oi]} />
                  </button>
                );
              })}
            </div>
          )}
          {started && isPoint && !quizSolved && (
            <div className="tap-note">
              <Icon name="tap" /> לחצו על מערכת הצירים
            </div>
          )}

          {started && (
            <div className="controls">
              <button className="btn ghost" disabled={i === 0} onClick={() => goTo(i - 1)}>
                <Icon name="arrow-right" /> הקודם
              </button>
              <button
                className="btn round"
                onClick={() => {
                  if (playing && !spoken) {
                    stop();
                    setPlaying(false);
                  } else {
                    setPlaying(true);
                    setReplay((r) => r + 1);
                  }
                }}
                aria-label={playing && !spoken ? 'השהה' : 'השמע שוב'}
              >
                <Icon name={playing && !spoken ? 'pause' : 'replay'} />
              </button>
              {last ? (
                <button className="btn primary" onClick={onFinish}>
                  {finishLabel} <Icon name="check" />
                </button>
              ) : (
                <button className={`btn ${ready ? 'primary' : 'soft'}`} onClick={() => goTo(i + 1)}>
                  {step.quiz && !quizSolved ? 'דלג' : 'הבא'} <Icon name="arrow-left" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
