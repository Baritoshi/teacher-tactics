import type { ClassroomLayout, SpatialRelation, Student } from './types';

const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(':');

// Geometry/topology only. Noise rules and level enablement belong to the calculator.
export function detectSpatialRelations(students: readonly Student[], layout: ClassroomLayout): SpatialRelation[] {
  const occupied = new Set(students.map(student => student.seatId));
  const validSeats = new Set(layout.seats.map(seat => seat.id));
  const relations: SpatialRelation[] = [];
  const seen = new Set<string>();
  const adjacent = new Set(layout.neighbourPairs.map(([a, b]) => pairKey(a, b)));
  function add(relation: SpatialRelation) {
    const { seatA, seatB, relationType } = relation;
    const key = `${relationType}:${pairKey(seatA, seatB)}`;
    if (seatA === seatB || !validSeats.has(seatA) || !validSeats.has(seatB)
      || !occupied.has(seatA) || !occupied.has(seatB) || seen.has(key)) return;
    seen.add(key);
    relations.push(relation);
  }
  for (const [seatA, seatB] of layout.neighbourPairs) add({ seatA, seatB, relationType: 'Adjacent' });

  // Logical grid coordinates are independent of IDs and visual percentages.
  // A single intervening seat must exist and be empty. Right/down scans count once.
  const grid = new Map(layout.seats.filter(seat => seat.gridPosition).map(seat => [
    `${seat.gridPosition!.row}:${seat.gridPosition!.column}`, seat,
  ]));
  for (const seat of layout.seats) {
    if (!seat.gridPosition || !occupied.has(seat.id)) continue;
    const { row, column } = seat.gridPosition;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const middle = grid.get(`${row + dr}:${column + dc}`);
      const end = grid.get(`${row + 2 * dr}:${column + 2 * dc}`);
      if (!middle || !end || occupied.has(middle.id) || adjacent.has(pairKey(seat.id, end.id))) continue;
      add({ seatA: seat.id, seatB: end.id, viaSeatId: middle.id, relationType: 'GapOne' });
    }
  }
  for (const { seatA, seatB } of layout.workstations) add({ seatA, seatB, relationType: 'SameWorkstation' });
  return relations;
}
