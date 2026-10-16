import type { GameState, LevelDefinition, NoiseBreakdown, StudentType } from '../game/types';
import { STUDENT_TYPES } from '../game/students';
import { LEVELS } from '../game/levels';
import { getNeighbourNoise, getStudentBaseNoise } from '../game/noiseCalculator';
export function DialogPanel({ state, breakdown, level }: { state: GameState; breakdown: NoiseBreakdown; level: LevelDefinition }) {
  const student = state.students.find(student => student.id === state.selectedId);
  const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  const hasWorkstations = !!level.workstationRelationships?.length;
  const hasDistant = !!level.distantInteractionMultiplier;
  const hasEmpty = state.students.length < level.classroomLayout.seats.length;
  const analysis = [
    ['Total noise', breakdown.totalNoise], ['Target', `≤ ${level.targetNoise}`], ['Lose', `> ${level.loseNoise}`],
    ['Base noise', breakdown.baseNoise], ['Seat modifiers', signed(breakdown.seatModifiers)],
    [hasDistant ? 'Adjacent pair effects' : hasWorkstations ? 'Neighbour pair effects' : 'Pair effects', signed(breakdown.adjacentPairEffects)],
    ...(hasDistant ? [['Distant pair effects', signed(breakdown.distantPairEffects)]] : []),
    ...(hasWorkstations ? [['Workstation effects', signed(breakdown.workstationEffects)]] : []),
  ];
  const title = state.mode === 'student' && student ? student.name : ({ welcome: 'Your classroom. Your call.', hint: 'A word of advice', analysis: 'Behind the noise', legend: 'Meet your class', system: 'A change of scenery', student: 'Choose a student' })[state.mode];
  return <section className="dialog" aria-label="Lesson information" aria-live="polite"><div className="dialog-avatar" aria-hidden="true">✎<small>TEACHER'S NOTES</small></div><div className="dialog-content"><div className="dialog-heading"><h2>{title}</h2><span>{state.mode === 'hint' ? `HINT USED · +${level.hintCost} ${level.hintCost === 1 ? 'MOVE' : 'MOVES'}` : `${level.name.toUpperCase()} · ${String(LEVELS.findIndex(item => item.id === level.id) + 1).padStart(2, '0')}`}</span></div>
    {state.mode === 'welcome' && <><p>{level.description ?? "Sixteen personalities. One very loud lesson. Let's find a better seating plan."}</p><p className="muted">{hasEmpty ? 'Select a student, then another student to swap or an empty desk to move.' : 'Select a student, then another to swap their seats.'} Bring noise to <b>{level.targetNoise} or below</b> in as few moves as possible.</p></>}
    {state.mode === 'student' && student && <><p><b>{student.type}</b> <span className="detail-separator">/</span> Base noise <b>{getStudentBaseNoise(student, level)}</b> <span className="detail-separator">/</span> Influence <b>{student.influence}</b> <span className="detail-separator">/</span> Morale <b>{student.morale}</b></p><div className="neighbours">{[true, false].map(problem => { const pairs = breakdown.pairs.filter(pair => (pair.first.id === student.id || pair.second.id === student.id) && (problem ? pair.noise > 0 : pair.noise < 0)); return <p key={String(problem)}><b>{problem ? 'Problem' : 'Helpful'} {hasDistant ? 'relationships' : 'neighbours'}:</b> {pairs.length ? pairs.map(pair => `${pair.first.id === student.id ? pair.second.name : pair.first.name}: ${signed(pair.noise)}${pair.distantNoise ? ' (across an empty desk)' : ''}`).join(' · ') : 'None'}</p>; })}</div><small className="muted">{hasEmpty ? 'Choose another student to swap, or a highlighted empty desk to move.' : 'Choose another seat to swap.'} Click {student.name} again to cancel.</small></>}
    {(state.mode === 'hint' || state.mode === 'system') && <p className="message">{state.message}</p>}
    {state.mode === 'analysis' && <div className={`analysis-grid ${hasWorkstations || hasDistant ? 'has-extra-effects' : ''}`}>{analysis.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>}
    {state.mode === 'legend' && <><div className="legend-types">{Object.entries(STUDENT_TYPES).map(([name, type]) => <span key={name}><i className="dot" style={{ background: type.color }}/><b>{name}</b> {getStudentBaseNoise({ type: name as StudentType, baseNoise: type.baseNoise }, level)}</span>)}</div><p className="legend-rules">{level.relationships.map(rule => `${rule.types.join(' + ')} ${signed(getNeighbourNoise(rule.types[0], rule.types[1], level))}`).join('  /  ')}{hasWorkstations && ` · Same computer: ${level.workstationRelationships!.map(rule => `${rule.types.join(' + ')} extra ${signed(rule.noise)}`).join(' / ')}. Solid lines include the extra effect.`}{hasDistant && ` · Across exactly one empty desk in the same row or column: positive effects × ${level.distantInteractionMultiplier}, rounded to the nearest integer (halves up). Thin dashed lines show these conversations.`}</p><small className="muted">{hasDistant ? 'Adjacent seats and conversations across one empty desk count.' : level.classroomLayout.adjacencyDescription} Front row {signed(level.frontRowModifier)}; window side {signed(level.windowModifier)} per occupied seat. Influence and morale are informational in this MVP.</small></>}
  </div></section>;
}
