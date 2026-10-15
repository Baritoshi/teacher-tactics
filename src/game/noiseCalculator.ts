import type { LevelDefinition, NoiseBreakdown, PairEffect, Student, StudentType } from './types';
import { relationshipNoise } from './relationships';
// Keep canonical student data unchanged; apply the current scenario at read time.
export function getStudentBaseNoise(student: Pick<Student, 'type' | 'baseNoise'>, level: LevelDefinition): number {
  return student.baseNoise + (level.baseNoiseModifiers?.[student.type] ?? 0);
}
// Apply once to an existing positive neighbour rule; neutral/helpful pairs stay unchanged.
export function getNeighbourNoise(first: StudentType, second: StudentType, level: LevelDefinition): number {
  const noise = relationshipNoise(first, second, level.relationships);
  return noise > 0 ? noise + (level.positivePairModifier ?? 0) : noise;
}
export function calculateNoise(students: readonly Student[], level: LevelDefinition): NoiseBreakdown {
  const layout = level.classroomLayout;
  const bySeat = new Map(students.map(student => [student.seatId, student]));
  const seatDefinitions = new Map(layout.seats.map(seat => [seat.id, seat]));
  const effects = new Map<string, PairEffect>();
  let baseNoise = 0, seatModifiers = 0;

  function addEffect(first: Student, second: Student, noise: number, source: 'neighbourNoise' | 'workstationNoise') {
    if (noise === 0) return;
    const key = [first.seatId, second.seatId].sort((a, b) => a - b).join(':');
    const pair = effects.get(key) ?? { first, second, noise: 0, neighbourNoise: 0, workstationNoise: 0 };
    pair[source] += noise;
    pair.noise += noise;
    effects.set(key, pair);
  }

  // Canonicalise graph edges to prevent duplicate/reversed neighbour pairs.
  const neighbours = new Map<number, number[]>();
  const seenEdges = new Set<string>();
  for (const [a, b] of layout.neighbourPairs) {
    const key = [a, b].sort((x, y) => x - y).join(':');
    if (a === b || seenEdges.has(key)) continue;
    seenEdges.add(key);
    neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
  }
  for (const student of students) {
    baseNoise += getStudentBaseNoise(student, level);
    const seat = seatDefinitions.get(student.seatId);
    if (seat?.frontRow) seatModifiers += level.frontRowModifier;
    if (seat?.windowSide) seatModifiers += level.windowModifier;
    for (const neighbourSeat of neighbours.get(student.seatId) ?? []) {
      const neighbour = bySeat.get(neighbourSeat);
      if (neighbour) addEffect(student, neighbour,
        getNeighbourNoise(student.type, neighbour.type, level), 'neighbourNoise');
    }
  }

  const seenWorkstations = new Set<string>();
  for (const station of layout.workstations) {
    const key = [station.seatA, station.seatB].sort((a, b) => a - b).join(':');
    if (station.seatA === station.seatB || seenWorkstations.has(key)) continue;
    seenWorkstations.add(key);
    const first = bySeat.get(station.seatA), second = bySeat.get(station.seatB);
    if (first && second) addEffect(first, second,
      relationshipNoise(first.type, second.type, level.workstationRelationships ?? []), 'workstationNoise');
  }
  const pairs = [...effects.values()];
  const pairEffects = pairs.reduce((sum, pair) => sum + pair.neighbourNoise, 0);
  const workstationEffects = pairs.reduce((sum, pair) => sum + pair.workstationNoise, 0);
  return { baseNoise, seatModifiers, pairEffects, workstationEffects,
    totalNoise: baseNoise + seatModifiers + pairEffects + workstationEffects, pairs };
}
