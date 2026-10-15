import { LEVELS } from '../game/levels';
import type { LevelDefinition } from '../game/types';

export function LevelSelect({ level, onChange }: { level: LevelDefinition; onChange: (level: LevelDefinition) => void }) {
  return <div className="lesson-label"><i className="dot green"/>
    <select aria-label="Scenario" value={level.id} onChange={event => {
      const next = LEVELS.find(item => item.id === event.target.value);
      if (next) onChange(next);
    }}>{LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <span>{String(LEVELS.findIndex(item => item.id === level.id) + 1).padStart(2, '0')} / {String(LEVELS.length).padStart(2, '0')}</span>
  </div>;
}
