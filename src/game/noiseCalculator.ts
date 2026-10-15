import type { LevelDefinition, NoiseBreakdown, PairEffect, Student } from './types';
import { relationshipNoise } from './relationships';
// Keep canonical student data unchanged; apply the current scenario at read time.
export function getStudentBaseNoise(student: Pick<Student, 'type' | 'baseNoise'>, level: LevelDefinition): number {
  return student.baseNoise + (level.baseNoiseModifiers?.[student.type] ?? 0);
}
export function calculateNoise(students: readonly Student[], level: LevelDefinition): NoiseBreakdown {
  const bySeat = new Map(students.map(student => [student.seatId, student]));
  const pairs: PairEffect[] = [];
  let baseNoise = 0, seatModifiers = 0;
  for (const student of students) {
    baseNoise += getStudentBaseNoise(student, level);
    const row = Math.floor(student.seatId / level.columns), col = student.seatId % level.columns;
    if (row === 0) seatModifiers += level.frontRowModifier;
    if (col === 0) seatModifiers += level.windowModifier;
    // Right and down only: no diagonals, wrapping, or duplicate pairs.
    const neighbours = [col + 1 < level.columns ? bySeat.get(student.seatId + 1) : undefined,
      row + 1 < level.rows ? bySeat.get(student.seatId + level.columns) : undefined];
    for (const neighbour of neighbours) {
      if (!neighbour) continue;
      const noise = relationshipNoise(student.type, neighbour.type, level.relationships);
      if (noise !== 0) pairs.push({ first: student, second: neighbour, noise });
    }
  }
  const pairEffects = pairs.reduce((sum, pair) => sum + pair.noise, 0);
  return { baseNoise, seatModifiers, pairEffects, totalNoise: baseNoise + seatModifiers + pairEffects, pairs };
}
