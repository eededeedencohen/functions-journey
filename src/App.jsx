import { useCallback, useMemo, useState } from 'react';
import Home from './screens/Home.jsx';
import Runner from './screens/Runner.jsx';
import Test from './screens/Test.jsx';
import StepPlayer from './components/StepPlayer.jsx';
import Mascot from './components/Mascot.jsx';
import Confetti from './components/Confetti.jsx';
import Rich from './components/Rich.jsx';
import Icon from './components/Icon.jsx';
import { UNITS } from './lib/lessons.js';
import { BOOKLET, practiceFor } from './lib/generators.js';
import { actions } from './lib/store.js';
import { go, useRoute } from './lib/router.js';
import { sfx } from './lib/sfx.js';

function Lesson({ unit }) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="page center">
        <Confetti fire={1} count={70} />
        <div className="card summary">
          <Mascot size={130} mood="happy" />
          <h1>סיימת את השיעור!</h1>
          <p>
            <Rich text={unit.title} /> · <b className="gain">+20 <Icon name="star" size={17} fill="currentColor" /></b>
          </p>
          <p>עכשיו הכי טוב לתרגל, כדי שזה יישאר בראש.</p>
          <div className="row">
            <button className="btn primary big" onClick={() => go('practice/' + unit.id)}>
              <span className="row-btn"><Icon name="pencil" /> לתרגול</span>
            </button>
            <button className="btn soft big" onClick={() => go('')}>
              לדף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <StepPlayer
      steps={unit.lesson}
      title={unit.title}
      onExit={() => go('')}
      onFinish={() => {
        actions.finishLesson(unit.id);
        sfx.win();
        setDone(true);
      }}
    />
  );
}

function Practice({ unit }) {
  const source = useCallback((i) => practiceFor[unit.id](i), [unit.id]);
  const record = useCallback((ok) => actions.recordPractice(unit.id, ok), [unit.id]);
  return <Runner title={`תרגול: ${unit.title}`} source={source} onExit={() => go('')} onRecord={record} />;
}

function Booklet({ item }) {
  const list = useMemo(() => item.build(), [item]);
  const source = useCallback((i) => list[i] || null, [list]);
  return (
    <Runner
      title={item.title}
      source={source}
      count={list.length}
      onExit={() => go('')}
      onDone={(stats) => actions.recordBooklet(item.id, stats.total ? stats.right / stats.total : 0)}
    />
  );
}

export default function App() {
  const [screen, id] = useRoute();
  const unit = UNITS.find((u) => u.id === id);
  if (screen === 'lesson' && unit) return <Lesson key={id} unit={unit} />;
  if (screen === 'practice' && unit) return <Practice key={id} unit={unit} />;
  if (screen === 'booklet') {
    const item = BOOKLET.find((b) => b.id === id);
    if (item) return <Booklet key={id} item={item} />;
  }
  if (screen === 'test') return <Test />;
  return <Home />;
}
