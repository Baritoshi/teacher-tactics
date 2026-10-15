import { LevelSelect } from './components/LevelSelect';
import { useState } from 'react';
import { Classroom } from './components/Classroom';
import { HUD } from './components/HUD';
import { DialogPanel } from './components/DialogPanel';
import { EndScreen } from './components/EndScreen';
import { NORMAL_LESSON } from './game/levels';
import type { LevelDefinition } from './game/types';
import { calculateNoise } from './game/noiseCalculator';
import { createGame, selectSeat, useHint } from './game/gameUtils';
export default function App() {
  const [level, setLevel] = useState(NORMAL_LESSON);
  // A new scenario gets a fresh state, including moves, selection and end screen.
  return <LessonGame key={level.id} level={level} onLevelChange={setLevel} />;
}
function LessonGame({ level, onLevelChange }: { level: LevelDefinition; onLevelChange: (level: LevelDefinition) => void }) {
  const [state, setState] = useState(() => createGame(level));
  const breakdown = calculateNoise(state.students, level);
  const reset = () => setState(createGame(level));
  function action(action: 'hint' | 'analysis' | 'legend' | 'reset') {
    if (action === 'reset') reset();
    else if (action === 'hint') setState(state => useHint(state, level));
    else setState(state => ({ ...state, mode: action }));
  }
  return <main className="game-shell"><header className="game-header"><a className="brand" href="./"><span className="brand-icon">tt<span>✦</span></span><span>TEACHER TACTICS<small>THE ART OF KEEPING ORDER</small></span></a><LevelSelect level={level} onChange={onLevelChange}/><span className="edition">SEATING PLAN <span>VOL. 01</span></span></header><div className="page-heading"><div><span className="eyebrow">A LITTLE STRATEGY. A QUIETER CLASSROOM.</span><h1>Every seat makes a difference<span>.</span></h1></div><p>Rearrange the class.<br/>Restore a little calm.</p></div><HUD noise={breakdown.totalNoise} moves={state.moves} level={level} disabled={state.status !== 'playing'} onAction={action}/><Classroom students={state.students} pairs={breakdown.pairs} level={level} selectedId={state.selectedId} disabled={state.status !== 'playing'} onSeat={seat => setState(state => selectSeat(state, seat, level))}/><DialogPanel state={state} breakdown={breakdown} level={level}/><footer className="page-footer"><span>GOOD TEACHING STARTS WITH A GOOD PLAN.</span><span>React + a little classroom chemistry <i>✦</i></span></footer><EndScreen status={state.status} noise={breakdown.totalNoise} moves={state.moves} level={level} onReset={reset}/></main>;
}
