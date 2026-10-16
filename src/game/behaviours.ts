import { getArchetype } from './archetypes';
import type { LevelDefinition, SeatCondition, SeatDefinition, SpatialRelation, Student, StudentEffect } from './types';

const seatMatches = (seat: SeatDefinition, condition: SeatCondition): boolean => {
  switch (condition) {
    case 'front-row': return !!seat.frontRow;
    case 'back-row': return !!seat.backRow;
    case 'middle-row': return !seat.frontRow && !seat.backRow;
    case 'window': return !!seat.windowSide;
  }
};

// Evaluates rule kinds, never archetype names. Spatial detection is shared with pair effects.
export function calculateStudentEffects(students: readonly Student[], level: LevelDefinition, relations: readonly SpatialRelation[]): StudentEffect[] {
  const seats = new Map(level.classroomLayout.seats.map(seat => [seat.id, seat]));
  const adjacent = new Map<number, Set<number>>();
  for (const relation of relations) if (relation.relationType === 'Adjacent') {
    for (const [a, b] of [[relation.seatA, relation.seatB], [relation.seatB, relation.seatA]]) {
      const neighbours = adjacent.get(a) ?? new Set<number>();
      neighbours.add(b);
      adjacent.set(a, neighbours);
    }
  }
  const effects: StudentEffect[] = [];
  for (const student of students) {
    const seat = seats.get(student.seatId);
    if (!seat) continue;
    const seenRules = new Set<string>();
    for (const rule of getArchetype(student.archetypeId, level).behaviourRules) {
      if (seenRules.has(rule.id)) continue;
      seenRules.add(rule.id);
      const count = adjacent.get(student.seatId)?.size ?? 0;
      const matches = rule.kind === 'seat-condition' ? seatMatches(seat, rule.condition)
        : count >= rule.min && count <= (rule.max ?? Infinity);
      if (matches) effects.push({ studentId: student.id, ruleId: rule.id, effectType: rule.kind,
        noiseDelta: rule.contribution.noise ?? 0, engagementDelta: rule.contribution.engagement ?? 0,
        source: rule.kind === 'seat-condition' ? 'seat-position' : 'alone-condition', description: rule.description, hint: rule.hint });
    }
  }
  return effects;
}
