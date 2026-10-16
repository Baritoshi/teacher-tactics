import { EXPERIMENTAL_LEVELS, LEVELS, SELECTABLE_LEVELS } from '../game/levels';
import type { LevelDefinition } from '../game/types';

export function LevelSelect({ level, onChange }: { level: LevelDefinition; onChange: (level: LevelDefinition) => void }) {
  return <div className="lesson-label"><i className="dot green"/>
    <select aria-label="Scenario" value={level.id} onChange={event => {
      const next = SELECTABLE_LEVELS.find(item => item.id === event.target.value);
      if (next) onChange(next);
    }}>{LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<optgroup label="Experimental">{EXPERIMENTAL_LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup></select>
    <span>{level.experimental ? 'LAB' : `${String(LEVELS.findIndex(item => item.id === level.id) + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`}</span>
  </div>;
}
