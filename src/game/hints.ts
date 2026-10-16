import { getArchetype } from './archetypes';
import type { LevelDefinition, NoiseBreakdown, Student } from './types';

function format(template: string, name: string, noise: number, partner = ''): string {
  return template.replaceAll('{name}', name).replaceAll('{noise}', String(noise)).replaceAll('{partner}', partner);
}

export function buildNoiseHint(students: readonly Student[], level: LevelDefinition, breakdown: NoiseBreakdown): string {
  const pair = breakdown.pairs.filter(pair => pair.noise > 0).sort((a, b) => b.noise - a.noise)[0];
  const self = students.map(student => {
    const effects = breakdown.studentEffects.filter(effect => effect.studentId === student.id);
    return { student, noise: effects.reduce((sum, effect) => sum + effect.noiseDelta, 0),
      hint: effects.find(effect => effect.noiseDelta > 0 && effect.hint)?.hint };
  }).filter(candidate => candidate.noise > 0).sort((a, b) => b.noise - a.noise)[0];
  if (self && self.noise > (pair?.noise ?? 0)) {
    return format(self.hint ?? 'Try a different seat for {name}. Current personal effects add +{noise} noise.', self.student.name, self.noise);
  }
  if (pair) {
    const special = pair.effects.find(effect => effect.source === 'specific-relationship' && effect.noiseDelta > 0);
    if (special) return format(special.hint ?? 'Separate {name} and {partner}. Their special relationship adds +{noise} noise.', pair.first.name, special.noiseDelta, pair.second.name)
      + (special.relationType === 'GapOne' ? ' They are talking across an empty desk.' : '');
    if (pair.distantNoise) return `Move one of these students or block the gap.\n${pair.first.name} and ${pair.second.name} are still talking across an empty desk: +${pair.distantNoise} noise.`;
    return `Separate ${pair.first.name} and ${pair.second.name}.\n${getArchetype(pair.first.archetypeId, level).displayName} + ${getArchetype(pair.second.archetypeId, level).displayName}: +${pair.noise} noise.${pair.workstationNoise ? ` Neighbours: +${pair.neighbourNoise}; workstation: +${pair.workstationNoise}.` : ''}`;
  }
  return 'No problematic neighbours remain. Try moving louder students to the front, or seating a Nerd beside a Quiet student.';
}
