import type { LevelDefinition, NoiseBreakdown, PairEffect, RelationshipEffect, RelationshipSource, Student, StudentContribution, StudentType } from './types';
import { relationshipNoise } from './relationships';
import { detectSpatialRelations } from './spatial';
import { getArchetype } from './archetypes';
import { calculateStudentEffects } from './behaviours';

export function getStudentBaseNoise(student: Pick<Student, 'archetypeId'>, level: LevelDefinition): number {
  return getArchetype(student.archetypeId, level).baseNoise + (level.baseNoiseModifiers?.[student.archetypeId] ?? 0);
}
export function getNeighbourNoise(first: StudentType, second: StudentType, level: LevelDefinition): number {
  const noise = relationshipNoise(first, second, level.relationships);
  return noise > 0 ? noise + (level.positivePairModifier ?? 0) : noise;
}

export function calculateNoise(students: readonly Student[], level: LevelDefinition): NoiseBreakdown {
  const bySeat = new Map(students.map(student => [student.seatId, student]));
  const byId = new Map(students.map(student => [student.id, student]));
  const seatDefinitions = new Map(level.classroomLayout.seats.map(seat => [seat.id, seat]));
  const spatial = detectSpatialRelations(students, level.classroomLayout);
  const studentEffects = calculateStudentEffects(students, level, spatial);
  const studentContributions: Record<string, StudentContribution> = {};
  let baseNoise = 0, seatModifiers = 0;
  for (const student of students) {
    const base = getStudentBaseNoise(student, level);
    const seat = seatDefinitions.get(student.seatId);
    const seatNoise = (seat?.frontRow ? level.frontRowModifier : 0) + (seat?.windowSide ? level.windowModifier : 0);
    const self = studentEffects.filter(effect => effect.studentId === student.id);
    const archetypeEffects = self.reduce((sum, effect) => sum + effect.noiseDelta, 0);
    studentContributions[student.id] = { baseNoise: base, seatModifiers: seatNoise, archetypeEffects,
      sharedRelationshipNoise: 0, totalNoise: base + seatNoise + archetypeEffects,
      engagement: self.reduce((sum, effect) => sum + effect.engagementDelta, 0) };
    baseNoise += base;
    seatModifiers += seatNoise;
  }

  const effects: RelationshipEffect[] = [];
  const specificSeen = new Set<string>();
  for (const relation of spatial) {
    const first = bySeat.get(relation.seatA)!, second = bySeat.get(relation.seatB)!;
    let noiseDelta: number;
    let source: RelationshipSource;
    switch (relation.relationType) {
      case 'Adjacent':
        source = 'adjacent';
        noiseDelta = getNeighbourNoise(first.archetypeId, second.archetypeId, level);
        break;
      case 'GapOne': {
        source = 'gap-one';
        const finalPairValue = getNeighbourNoise(first.archetypeId, second.archetypeId, level);
        noiseDelta = finalPairValue > 0 ? Math.round(finalPairValue * (level.distantInteractionMultiplier ?? 0)) : 0;
        break;
      }
      case 'SameWorkstation':
        source = 'workstation';
        noiseDelta = relationshipNoise(first.archetypeId, second.archetypeId, level.workstationRelationships ?? []);
        break;
    }
    if (noiseDelta !== 0) effects.push({ studentAId: first.id, studentBId: second.id,
      relationType: relation.relationType, source, noiseDelta, viaSeatId: relation.viaSeatId });

    for (const special of level.specificRelationships ?? []) {
      const matches = (special.studentAId === first.id && special.studentBId === second.id)
        || (special.studentAId === second.id && special.studentBId === first.id);
      if (!matches) continue;
      const key = JSON.stringify([special.type, relation.relationType, ...[first.id, second.id].sort()]);
      if (specificSeen.has(key)) continue;
      specificSeen.add(key);
      const delta = relation.relationType === 'Adjacent' ? special.adjacentNoise
        : relation.relationType === 'GapOne' ? special.gapOneNoise ?? 0 : 0;
      if (delta !== 0) effects.push({ studentAId: first.id, studentBId: second.id, relationType: relation.relationType,
        source: 'specific-relationship', noiseDelta: delta, viaSeatId: relation.viaSeatId,
        relationshipId: special.id, description: special.displayName, hint: special.hint });
    }
  }

  const sum = (source: RelationshipSource) => effects.filter(effect => effect.source === source).reduce((total, effect) => total + effect.noiseDelta, 0);
  const adjacentPairEffects = sum('adjacent'), distantPairEffects = sum('gap-one'), workstationEffects = sum('workstation');
  const specificRelationshipEffects = sum('specific-relationship');
  const archetypeSeatEffects = studentEffects.reduce((sum, effect) => sum + effect.noiseDelta, 0);
  const engagementEffects = studentEffects.reduce((sum, effect) => sum + effect.engagementDelta, 0);
  const aggregated = new Map<string, PairEffect>();
  for (const effect of effects) {
    const key = JSON.stringify([effect.studentAId, effect.studentBId].sort());
    const pair = aggregated.get(key) ?? { first: byId.get(effect.studentAId)!, second: byId.get(effect.studentBId)!,
      noise: 0, neighbourNoise: 0, distantNoise: 0, workstationNoise: 0, specificNoise: 0, effects: [] };
    pair.effects.push(effect);
    pair.noise += effect.noiseDelta;
    if (effect.source === 'adjacent') pair.neighbourNoise += effect.noiseDelta;
    if (effect.source === 'gap-one') pair.distantNoise += effect.noiseDelta;
    if (effect.source === 'workstation') pair.workstationNoise += effect.noiseDelta;
    if (effect.source === 'specific-relationship') pair.specificNoise += effect.noiseDelta;
    for (const id of [effect.studentAId, effect.studentBId]) {
      // An inspectable allocation: each student receives half of shared pair noise.
      studentContributions[id].sharedRelationshipNoise += effect.noiseDelta / 2;
      studentContributions[id].totalNoise += effect.noiseDelta / 2;
    }
    aggregated.set(key, pair);
  }
  return { baseNoise, seatModifiers, archetypeSeatEffects, adjacentPairEffects, pairEffects: adjacentPairEffects, distantPairEffects,
    specificRelationshipEffects, workstationEffects,
    totalNoise: baseNoise + seatModifiers + archetypeSeatEffects + adjacentPairEffects + distantPairEffects + specificRelationshipEffects + workstationEffects,
    effects, pairs: [...aggregated.values()], studentEffects, studentContributions,
    engagement: { base: 0, archetypeEffects: engagementEffects, total: engagementEffects },
    hasEngagement: students.some(student => getArchetype(student.archetypeId, level).behaviourRules.some(rule => rule.contribution.engagement !== undefined)),
  };
}
