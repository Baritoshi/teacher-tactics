import type { LevelDefinition, NoiseBreakdown, PairEffect, RelationshipEffect, RelationshipSource, Student, StudentType } from './types';
import { relationshipNoise } from './relationships';
import { detectSpatialRelations } from './spatial';

export function getStudentBaseNoise(student: Pick<Student, 'type' | 'baseNoise'>, level: LevelDefinition): number {
  return student.baseNoise + (level.baseNoiseModifiers?.[student.type] ?? 0);
}
export function getNeighbourNoise(first: StudentType, second: StudentType, level: LevelDefinition): number {
  const noise = relationshipNoise(first, second, level.relationships);
  return noise > 0 ? noise + (level.positivePairModifier ?? 0) : noise;
}

export function calculateNoise(students: readonly Student[], level: LevelDefinition): NoiseBreakdown {
  const bySeat = new Map(students.map(student => [student.seatId, student]));
  const byId = new Map(students.map(student => [student.id, student]));
  const seatDefinitions = new Map(level.classroomLayout.seats.map(seat => [seat.id, seat]));
  let baseNoise = 0, seatModifiers = 0;
  for (const student of students) {
    baseNoise += getStudentBaseNoise(student, level);
    const seat = seatDefinitions.get(student.seatId);
    if (seat?.frontRow) seatModifiers += level.frontRowModifier;
    if (seat?.windowSide) seatModifiers += level.windowModifier;
  }

  const effects: RelationshipEffect[] = [];
  for (const relation of detectSpatialRelations(students, level.classroomLayout)) {
    const first = bySeat.get(relation.seatA)!, second = bySeat.get(relation.seatB)!;
    let noiseDelta: number;
    let source: RelationshipSource;
    switch (relation.relationType) {
      case 'Adjacent':
        source = 'adjacent';
        noiseDelta = getNeighbourNoise(first.type, second.type, level);
        break;
      case 'GapOne': {
        source = 'gap-one';
        const finalPairValue = getNeighbourNoise(first.type, second.type, level);
        // Only positive final values travel across a gap. Round after all level modifiers.
        noiseDelta = finalPairValue > 0 ? Math.round(finalPairValue * (level.distantInteractionMultiplier ?? 0)) : 0;
        break;
      }
      case 'SameWorkstation':
        source = 'workstation';
        noiseDelta = relationshipNoise(first.type, second.type, level.workstationRelationships ?? []);
        break;
    }
    if (noiseDelta !== 0) effects.push({ studentAId: first.id, studentBId: second.id,
      relationType: relation.relationType, source, noiseDelta, viaSeatId: relation.viaSeatId });
  }

  const sum = (source: RelationshipSource) => effects.filter(effect => effect.source === source).reduce((total, effect) => total + effect.noiseDelta, 0);
  const adjacentPairEffects = sum('adjacent'), distantPairEffects = sum('gap-one'), workstationEffects = sum('workstation');
  // One visual per student pair, with explicit source components retained (e.g. 5 + 2).
  const aggregated = new Map<string, PairEffect>();
  for (const effect of effects) {
    const key = JSON.stringify([effect.studentAId, effect.studentBId].sort());
    const pair = aggregated.get(key) ?? { first: byId.get(effect.studentAId)!, second: byId.get(effect.studentBId)!,
      noise: 0, neighbourNoise: 0, distantNoise: 0, workstationNoise: 0, effects: [] };
    pair.effects.push(effect);
    pair.noise += effect.noiseDelta;
    if (effect.source === 'adjacent') pair.neighbourNoise += effect.noiseDelta;
    if (effect.source === 'gap-one') pair.distantNoise += effect.noiseDelta;
    if (effect.source === 'workstation') pair.workstationNoise += effect.noiseDelta;
    aggregated.set(key, pair);
  }
  return { baseNoise, seatModifiers, adjacentPairEffects, pairEffects: adjacentPairEffects, distantPairEffects, workstationEffects,
    totalNoise: baseNoise + seatModifiers + adjacentPairEffects + distantPairEffects + workstationEffects,
    effects, pairs: [...aggregated.values()] };
}
