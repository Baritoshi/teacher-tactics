import type { ClassroomLayout, ComputerWorkstation, Orientation, SeatDefinition } from './types';

export function createStandardGrid(rows: number, columns: number): ClassroomLayout {
  const seats: SeatDefinition[] = [];
  const neighbourPairs: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const id = row * columns + col;
      seats.push({ id, x: col * 100 / columns, y: row * 100 / rows,
        width: 100 / columns, height: 100 / rows, orientation: 'Up',
        frontRow: row === 0, windowSide: col === 0 });
      if (col + 1 < columns) neighbourPairs.push([id, id + 1]);
      if (row + 1 < rows) neighbourPairs.push([id, id + columns]);
    }
  }
  return { type: 'standardGrid', seats, neighbourPairs, workstations: [],
    adjacencyDescription: 'Only horizontal and vertical neighbours count.' };
}

export const STANDARD_GRID = createStandardGrid(4, 4);

// Eight two-seat computers form an open-top U: two left, four bottom, two right.
// Seat IDs follow the perimeter. Consecutive IDs are neighbours, never across the room.
const stations: { id: string; x: number; y: number; orientation: Orientation; seats: readonly [number, number]; positions: readonly (readonly [number, number])[]; frontRow?: boolean; windowSide?: boolean }[] = [
  { id: 'left-top', x: 5, y: 23, orientation: 'Left', seats: [0, 1], positions: [[8, 0], [8, 23]], frontRow: true, windowSide: true },
  { id: 'left-bottom', x: 5, y: 69, orientation: 'Left', seats: [2, 3], positions: [[8, 46], [8, 69]], windowSide: true },
  { id: 'bottom-left', x: 26, y: 94, orientation: 'Down', seats: [4, 5], positions: [[19, 76], [27, 76]] },
  { id: 'bottom-middle-left', x: 42, y: 94, orientation: 'Down', seats: [6, 7], positions: [[35, 76], [43, 76]] },
  { id: 'bottom-middle-right', x: 58, y: 94, orientation: 'Down', seats: [8, 9], positions: [[51, 76], [59, 76]] },
  { id: 'bottom-right', x: 74, y: 94, orientation: 'Down', seats: [10, 11], positions: [[67, 76], [75, 76]] },
  { id: 'right-bottom', x: 95, y: 69, orientation: 'Right', seats: [12, 13], positions: [[80, 69], [80, 46]] },
  { id: 'right-top', x: 95, y: 23, orientation: 'Right', seats: [14, 15], positions: [[80, 23], [80, 0]], frontRow: true },
];

export const COMPUTER_U_SHAPE: ClassroomLayout = {
  type: 'computerUShape',
  workstations: stations.map(({ id, x, y, orientation, seats: [seatA, seatB] }): ComputerWorkstation => ({
    id, position: { x, y }, orientation, seatA, seatB,
  })),
  seats: stations.flatMap(station => station.seats.map((id, index): SeatDefinition => ({
    id, x: station.positions[index][0], y: station.positions[index][1],
    width: station.orientation === 'Down' ? 7 : 12, height: 18,
    orientation: station.orientation, workstationId: station.id,
    frontRow: station.frontRow ?? false, windowSide: station.windowSide ?? false,
  }))),
  neighbourPairs: Array.from({ length: 15 }, (_, id) => [id, id + 1] as const),
  adjacencyDescription: 'Neighbours follow the U around the walls, including each computer partner. No talking across the centre.',
};
