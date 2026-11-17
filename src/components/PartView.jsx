import CoordPlane, { C } from './CoordPlane.jsx';
import ValueTable from './ValueTable.jsx';
import Rich from './Rich.jsx';
import Icon from './Icon.jsx';
import { NumPad, Slot, usePad } from './Pad.jsx';
import { fmt } from '../lib/math.js';
import { isHebrew } from '../lib/generators.js';
import { narrate } from '../lib/speech.js';
import { sfx } from '../lib/sfx.js';
import { useStore } from '../lib/store.js';

const ptLabel = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * One question (a "part" of a problem): the graph / table / equation on one side and the
 * answer area with the number pad on the other. Used by practice, the booklet and the test.
 *
 * value / onChange: the student's answer (shape depends on part.type)
 * locked: no more editing     result: output of grade()     showAnswers: reveal the right answer
 */
export default function PartView({ problem, part, value, onChange, locked, result, showAnswers, onEnter }) {
  const { settings } = useStore();
  const isNums = part.type === 'nums';
  const pad = usePad({
    ids: isNums ? part.fields.map((f) => f.id) : [],
    values: (isNums && value) || {},
    onChange,
    onEnter,
    disabled: locked,
  });
  const slot = (i) => (
    <Slot
      pad={pad}
      id={part.fields[i].id}
      mark={result?.marks?.[part.fields[i].id]}
      reveal={showAnswers ? fmt(part.answers[i]) : undefined}
    />
  );

  // ----- points the student placed on the graph
  let userPts = [];
  let onTap;
  let lines = problem.graph?.lines || [];
  if (part.type === 'point') {
    if (value) {
      const good = same(value, part.answer);
      userPts.push({
        id: 'u' + value.join('_'),
        x: value[0],
        y: value[1],
        color: result ? (good ? C.ok : C.bad) : C.ink,
        label: ptLabel(...value),
      });
    }
    if (showAnswers && !(value && same(value, part.answer)))
      userPts.push({ id: 'ans', x: part.answer[0], y: part.answer[1], color: C.ok, label: ptLabel(...part.answer), pulse: true });
    if (!locked)
      onTap = (x, y) => {
        sfx.tap();
        onChange([x, y]);
      };
  }
  if (part.type === 'plot') {
    const list = value || [];
    userPts = list.map((p) => {
      const good = part.answers.some((a) => same(a, p));
      return { id: 'u' + p.join('_'), x: p[0], y: p[1], color: result ? (good ? C.ok : C.bad) : C.y, label: ptLabel(...p), lp: 'l' };
    });
    if (showAnswers) {
      part.answers
        .filter((a) => !list.some((p) => same(a, p)))
        .forEach((a) => userPts.push({ id: 'a' + a.join('_'), x: a[0], y: a[1], color: C.ok, pulse: true }));
    }
    if (result && (result.score === 1 || showAnswers)) lines = [problem.line];
    if (!locked)
      onTap = (x, y) => {
        sfx.tap();
        onChange(list.some((p) => same(p, [x, y])) ? list.filter((p) => !same(p, [x, y])) : [...list, [x, y]]);
      };
  }

  const showGraph = problem.kind === 'graph' || part.type === 'plot';

  return (
    <div className={`pv kind-${problem.kind}`}>
      <div className="pv-visual card">
        {problem.kind === 'table' && <ValueTable {...problem.table} />}
        {showGraph && <CoordPlane {...problem.graph} lines={lines} points={userPts} onTap={onTap} />}
        {problem.kind === 'eq' && (
          <div className="eq-big" dir="ltr">
            {problem.eq.l} = {problem.eq.r}
          </div>
        )}
      </div>

      <div className="pv-work">
        <div className="prompt">
          <Rich text={part.prompt} />
          <button
            className="speak-btn"
            onClick={() => narrate(part.say, { enabled: true, rate: settings.rate, voice: settings.voiceKey })}
            aria-label="הקראת השאלה"
          >
            <Icon name="volume" size={20} />
          </button>
        </div>

        {isNums && part.layout === 'table' && <ValueTable {...problem.table} cell={slot} />}

        {isNums && part.layout === 'expr' && (
          <div className="expr-input" dir="ltr">
            <span>{part.name}(x) =</span>
            {slot(0)}
            <span>· x +</span>
            {slot(1)}
          </div>
        )}

        {isNums && part.layout === 'list' && (
          <div className="fields">
            {part.fields.map((f, i) => (
              <div key={f.id} className="field" dir={isHebrew(f.label) ? 'rtl' : 'ltr'}>
                <span>{f.label}</span>
                {slot(i)}
              </div>
            ))}
          </div>
        )}

        {part.type === 'choice' && (
          <div className="options">
            {part.options.map((o, i) => {
              const cls =
                result && (showAnswers || result.score === 1) && i === part.answer
                  ? 'right'
                  : result && value === i && i !== part.answer
                    ? 'wrong'
                    : value === i
                      ? 'picked'
                      : '';
              return (
                <button
                  key={i}
                  className={`option ${cls}`}
                  disabled={locked}
                  onClick={() => {
                    sfx.tap();
                    onChange(i);
                  }}
                >
                  <Rich text={o} />
                </button>
              );
            })}
          </div>
        )}

        {(part.type === 'point' || part.type === 'plot') && !locked && (
          <div className="tap-note">
            <Icon name="tap" /> לחצו על מערכת הצירים{part.type === 'plot' ? ` (סומנו ${(value || []).length})` : ''}
          </div>
        )}

        {isNums && !locked && <NumPad pad={pad} />}
      </div>
    </div>
  );
}
