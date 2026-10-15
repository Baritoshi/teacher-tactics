import type { LevelDefinition } from '../game/types';
interface Props { noise: number; moves: number; level: LevelDefinition; disabled: boolean; onAction: (action: 'hint' | 'analysis' | 'legend' | 'reset') => void }
export function HUD({ noise, moves, level, disabled, onAction }: Props) {
  return <section className="hud" aria-label="Lesson controls">
    <div className="noise-stat"><span className="eyebrow">CLASSROOM NOISE</span><div><strong aria-label={`Noise ${noise}`}>{noise}</strong><span className="noise-unit"> / {level.loseNoise}<small>Keep it down.</small></span><span className="sound-icon" aria-hidden="true">▂▅▃▇▅</span></div><div className="noise-meter"><i style={{ width: `${Math.min(noise / level.loseNoise * 100, 100)}%` }}/><b style={{ left: `${level.targetNoise / level.loseNoise * 100}%` }}/></div></div>
    <div className="stat target"><span className="eyebrow">TARGET</span><strong>≤ {level.targetNoise}</strong><small>the sweet spot</small></div>
    <div className="stat"><span className="eyebrow">LOSE</span><strong>&gt; {level.loseNoise}</strong><small>too much chaos</small></div>
    <div className="stat moves"><span className="eyebrow">MOVES</span><strong>{String(moves).padStart(2, '0')}</strong><small>make them count</small></div>
    <nav className="actions" aria-label="Game actions"><button disabled={disabled} onClick={() => onAction('hint')}><span>☀</span> Hint <small>+{level.hintCost} move</small></button><button onClick={() => onAction('analysis')}><span>▥</span> Analysis</button><button onClick={() => onAction('legend')}><span>◇</span> Legend</button><button className="reset" onClick={() => onAction('reset')}><span>↻</span> Reset</button></nav>
  </section>;
}
