import type { GameState, LevelDefinition, NoiseBreakdown } from '../game/types';
import { getArchetype, getArchetypes } from '../game/archetypes';
import { LEVELS } from '../game/levels';
import { getNeighbourNoise, getStudentBaseNoise } from '../game/noiseCalculator';

const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

export function DialogPanel({ state, breakdown, level }: { state: GameState; breakdown: NoiseBreakdown; level: LevelDefinition }) {
  const student = state.students.find(student => student.id === state.selectedId);
  const contribution = student ? breakdown.studentContributions[student.id] : undefined;
  const hasWorkstations = !!level.workstationRelationships?.length;
  const hasDistant = !!level.distantInteractionMultiplier;
  const hasEmpty = state.students.length < level.classroomLayout.seats.length;
  const analysis = [
    ['Total noise', breakdown.totalNoise], ['Target', `≤ ${level.targetNoise}`], ['Lose', `> ${level.loseNoise}`],
    ['Base noise', breakdown.baseNoise], ['Seat modifiers', signed(breakdown.seatModifiers)],
    [hasDistant ? 'Adjacent pair effects' : hasWorkstations ? 'Neighbour pair effects' : 'Pair effects', signed(breakdown.adjacentPairEffects)],
    ...(hasDistant ? [['Distant pair effects', signed(breakdown.distantPairEffects)]] : []),
    ...(hasWorkstations ? [['Workstation effects', signed(breakdown.workstationEffects)]] : []),
    ...(breakdown.studentEffects.some(effect => effect.noiseDelta !== 0) ? [['Archetype effects', signed(breakdown.archetypeSeatEffects)]] : []),
    ...(level.specificRelationships?.length ? [['Specific relationships', signed(breakdown.specificRelationshipEffects)]] : []),
    ...(breakdown.hasEngagement ? [['Engagement (optional)', signed(breakdown.engagement.total)]] : []),
  ];
  const title = state.mode === 'student' && student ? student.name : ({ welcome: 'Your classroom. Your call.', hint: 'A word of advice', analysis: 'Behind the noise', legend: 'Meet your class', system: 'A change of scenery', student: 'Choose a student' })[state.mode];
  return <section className="dialog" aria-label="Lesson information" aria-live="polite">
    <div className="dialog-avatar" aria-hidden="true">✎<small>TEACHER'S NOTES</small></div>
    <div key={`${state.mode}-${state.selectedId ?? ''}`} className="dialog-content" tabIndex={0} aria-label="Teacher notes content">
      <div className="dialog-heading"><h2>{title}</h2><span>{state.mode === 'hint' ? `HINT USED · +${level.hintCost} ${level.hintCost === 1 ? 'MOVE' : 'MOVES'}` : `${level.name.toUpperCase()} · ${level.experimental ? 'EXPERIMENTAL' : String(LEVELS.findIndex(item => item.id === level.id) + 1).padStart(2, '0')}`}</span></div>
      {state.mode === 'welcome' && <><p>{level.description ?? "Sixteen personalities. One very loud lesson. Let's find a better seating plan."}</p><p className="muted">{hasEmpty ? 'Select a student, then another student to swap or an empty desk to move.' : 'Select a student, then another to swap their seats.'} Bring noise to <b>{level.targetNoise} or below</b> in as few moves as possible.</p></>}
      {state.mode === 'student' && student && contribution && <>
        <p><b>{getArchetype(student.archetypeId, level).displayName}</b> <span className="detail-separator">/</span> Base noise <b>{contribution.baseNoise}</b> <span className="detail-separator">/</span> Seat modifiers <b>{signed(contribution.seatModifiers)}</b> <span className="detail-separator">/</span> Total contribution <b title="Base + seat + archetype effects + half of each shared relationship">{signed(contribution.totalNoise)}</b></p>
        {breakdown.studentEffects.filter(effect => effect.studentId === student.id).map(effect => <p key={effect.ruleId} className="self-effect">{effect.description}</p>)}
        <div className="neighbours">{[true, false].map(problem => {
          const pairs = breakdown.pairs.filter(pair => (pair.first.id === student.id || pair.second.id === student.id) && (problem ? pair.noise > 0 : pair.noise < 0));
          return <p key={String(problem)}><b>{problem ? 'Problem' : 'Helpful'} {hasDistant ? 'relationships' : 'neighbours'}:</b> {pairs.length ? pairs.map(pair => `${pair.first.id === student.id ? pair.second.name : pair.first.name}: ${signed(pair.noise)}${pair.effects.some(effect => effect.relationType === 'GapOne') ? ' (across an empty desk)' : ''}`).join(' · ') : 'None'}</p>;
        })}</div>
        {(level.specificRelationships ?? []).filter(relation => relation.studentAId === student.id || relation.studentBId === student.id).map(relation => {
          const partnerId = relation.studentAId === student.id ? relation.studentBId : relation.studentAId;
          const partner = state.students.find(item => item.id === partnerId);
          return <p key={relation.id}>Special relationship: <b>{partner?.name ?? partnerId}</b> — {relation.displayName}{!partner && ' (absent)'}</p>;
        })}
        <small className="muted">Total includes half of each shared relationship. {hasEmpty ? 'Choose a student to swap, or an empty desk to move.' : 'Choose another seat to swap.'} Click {student.name} again to cancel.</small>
      </>}
      {(state.mode === 'hint' || state.mode === 'system') && <p className="message">{state.message}</p>}
      {state.mode === 'analysis' && <><div className={`analysis-grid ${analysis.length > 6 ? 'has-extra-effects' : ''}`}>{analysis.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>{breakdown.hasEngagement && <small className="muted">Engagement is experimental. Only noise determines the lesson outcome.</small>}</>}
      {state.mode === 'legend' && <>
        <div className="legend-types">{Object.values(getArchetypes(level)).map(type => <div className="legend-archetype" key={type.id}><span className="legend-token" style={{ background: type.color }}>{type.shortCode}</span><span><b>{type.displayName}</b> {getStudentBaseNoise({ archetypeId: type.id }, level)}<small>{type.description}</small></span></div>)}</div>
        <p className="legend-rules">{level.relationships.map(rule => `${rule.types.map(id => getArchetype(id, level).displayName).join(' + ')} ${signed(getNeighbourNoise(rule.types[0], rule.types[1], level))}`).join('  /  ')}{hasWorkstations && ` · Same computer: ${level.workstationRelationships!.map(rule => `${rule.types.join(' + ')} extra ${signed(rule.noise)}`).join(' / ')}. Solid lines include the extra effect.`}{hasDistant && ` · Across exactly one empty desk in the same row or column: positive effects × ${level.distantInteractionMultiplier}, rounded to the nearest integer (halves up). Thin dashed lines show these conversations.`}{level.specificRelationships?.map(relation => ` · ${relation.displayName}: adjacent ${signed(relation.adjacentNoise)}, across an empty desk ${signed(relation.gapOneNoise ?? 0)}.`)}</p>
        <small className="muted">{hasDistant ? 'Adjacent seats and conversations across one empty desk count.' : level.classroomLayout.adjacencyDescription} Front row {signed(level.frontRowModifier)}; window side {signed(level.windowModifier)} per occupied seat.</small>
      </>}
    </div>
  </section>;
}
