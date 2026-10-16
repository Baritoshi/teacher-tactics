import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { COMPUTER_ROOM, NORMAL_LESSON } from './levels';
import { COMPUTER_U_SHAPE, STANDARD_GRID } from './layouts';
import { calculateNoise } from './noiseCalculator';
import { createGame, getStatus, selectSeat, swapSeats, useHint } from './gameUtils';
import { NORMAL_ROSTER, STUDENT_TYPES } from './students';
import type { GameState, Student, StudentType } from './types';
import { Classroom } from '../components/Classroom';
import { DialogPanel } from '../components/DialogPanel';

const pupil = (type: StudentType, seatId: number): Student => ({
  id: `s${seatId}`, name: `Student ${seatId}`, archetypeId: type, seatId,
  morale: 60,
});

describe('data-driven classroom layouts', () => {
  it('preserves the original 4 by 4 geometry and all 24 neighbour edges', () => {
    expect(NORMAL_LESSON.classroomLayout).toBe(STANDARD_GRID);
    expect(STANDARD_GRID.type).toBe('standardGrid');
    expect(STANDARD_GRID.workstations).toHaveLength(0);
    expect(STANDARD_GRID.seats).toHaveLength(16);
    for (const seat of STANDARD_GRID.seats) {
      expect(seat).toMatchObject({ x: seat.id % 4 * 25, y: Math.floor(seat.id / 4) * 25,
        width: 25, height: 25, orientation: 'Up', frontRow: seat.id < 4, windowSide: seat.id % 4 === 0 });
    }
    const edges = STANDARD_GRID.neighbourPairs.map(([a, b]) => `${a}:${b}`);
    expect(edges).toHaveLength(24);
    expect(new Set(edges).size).toBe(24);
    expect(edges).not.toContain('3:4');
    expect(edges).toContain('0:4');
    expect(edges).toContain('0:1');
  });

  it('forms an open-top U with two left, two right and four bottom stations', () => {
    expect(COMPUTER_ROOM.classroomLayout).toBe(COMPUTER_U_SHAPE);
    expect(COMPUTER_U_SHAPE.type).toBe('computerUShape');
    expect(COMPUTER_U_SHAPE.workstations).toHaveLength(8);
    expect(COMPUTER_U_SHAPE.seats).toHaveLength(16);
    expect(COMPUTER_U_SHAPE.workstations.filter(s => s.orientation === 'Left')).toHaveLength(2);
    expect(COMPUTER_U_SHAPE.workstations.filter(s => s.orientation === 'Right')).toHaveLength(2);
    expect(COMPUTER_U_SHAPE.workstations.filter(s => s.orientation === 'Down')).toHaveLength(4);
    expect(COMPUTER_U_SHAPE.workstations.every(s => s.position.x < 10 || s.position.x > 90 || s.position.y > 90)).toBe(true);
    expect(COMPUTER_U_SHAPE.seats.every(s => s.x < 20 || s.x >= 80 || s.y >= 76)).toBe(true);
  });

  it('assigns exactly two distinct, correctly oriented seats to each computer', () => {
    const allocated: number[] = [];
    for (const station of COMPUTER_U_SHAPE.workstations) {
      const seats = COMPUTER_U_SHAPE.seats.filter(seat => seat.workstationId === station.id);
      expect(seats.map(seat => seat.id)).toEqual([station.seatA, station.seatB]);
      expect(station.seatA).not.toBe(station.seatB);
      for (const seat of seats) {
        expect(seat.orientation).toBe(station.orientation);
        expect(seat.x).toBeGreaterThanOrEqual(0);
        expect(seat.y).toBeGreaterThanOrEqual(0);
        expect(seat.x + seat.width).toBeLessThanOrEqual(100);
        expect(seat.y + seat.height).toBeLessThanOrEqual(100);
      }
      allocated.push(station.seatA, station.seatB);
    }
    expect(new Set(allocated).size).toBe(16);
  });

  it('uses explicit U neighbours without row wrapping or talking across the centre', () => {
    expect(COMPUTER_U_SHAPE.neighbourPairs).toHaveLength(15);
    expect(calculateNoise([pupil('Geek', 1), pupil('Geek', 2)], COMPUTER_ROOM)).toMatchObject({ pairEffects: 5, workstationEffects: 0 });
    expect(calculateNoise([pupil('Geek', 0), pupil('Geek', 15)], COMPUTER_ROOM)).toMatchObject({ pairEffects: 0, workstationEffects: 0 });
  });

  it('adds 5 + 2 exactly once for two Geeks sharing a workstation', () => {
    const noise = calculateNoise([pupil('Geek', 0), pupil('Geek', 1)], COMPUTER_ROOM);
    expect(noise).toMatchObject({ baseNoise: 6, seatModifiers: -2, pairEffects: 5, workstationEffects: 2, totalNoise: 11 });
    expect(noise.pairs).toHaveLength(1);
    expect(noise.pairs[0]).toMatchObject({ neighbourNoise: 5, workstationNoise: 2, noise: 7 });
  });

  it('keeps normal Geek pairs at +3 with zero workstation effects', () => {
    expect(calculateNoise([pupil('Geek', 0), pupil('Geek', 1)], NORMAL_LESSON)).toMatchObject({ pairEffects: 3, workstationEffects: 0 });
  });

  it('does not apply workstation effects to other types or an empty partner seat', () => {
    expect(calculateNoise([pupil('Joker', 0), pupil('Joker', 1)], COMPUTER_ROOM)).toMatchObject({ pairEffects: 4, workstationEffects: 0 });
    expect(calculateNoise([pupil('Geek', 0)], COMPUTER_ROOM)).toMatchObject({ pairEffects: 0, workstationEffects: 0 });
  });

  it('does not double-count reversed/duplicated neighbour edges or workstation declarations', () => {
    const level = { ...COMPUTER_ROOM, classroomLayout: { ...COMPUTER_U_SHAPE,
      neighbourPairs: [...COMPUTER_U_SHAPE.neighbourPairs, [1, 0] as const, [0, 1] as const],
      workstations: [...COMPUTER_U_SHAPE.workstations, COMPUTER_U_SHAPE.workstations[0]] } };
    expect(calculateNoise([pupil('Geek', 0), pupil('Geek', 1)], level)).toMatchObject({ pairEffects: 5, workstationEffects: 2 });
  });

  it('keeps workstation effects independent of the neighbour graph', () => {
    const level = { ...COMPUTER_ROOM, classroomLayout: { ...COMPUTER_U_SHAPE, neighbourPairs: [] } };
    const noise = calculateNoise([pupil('Geek', 0), pupil('Geek', 1)], level);
    expect(noise).toMatchObject({ pairEffects: 0, workstationEffects: 2 });
    expect(noise.pairs[0].noise).toBe(2);
  });

  it('resets with unique occupied seats while preserving the U layout and source archetypes', () => {
    const source = structuredClone(NORMAL_ROSTER), types = structuredClone(STUDENT_TYPES);
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const game = createGame(COMPUTER_ROOM);
      expect(game.students).toHaveLength(16);
      expect(new Set(game.students.map(student => student.seatId)).size).toBe(16);
      expect(game.students.every(student => COMPUTER_U_SHAPE.seats.some(seat => seat.id === student.seatId))).toBe(true);
      expect(getStatus(calculateNoise(game.students, COMPUTER_ROOM).totalNoise, COMPUTER_ROOM)).toBe('playing');
      orders.add(game.students.map(student => student.seatId).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(COMPUTER_ROOM.classroomLayout).toBe(COMPUTER_U_SHAPE);
    expect(NORMAL_ROSTER).toEqual(source);
    expect(STUDENT_TYPES).toEqual(types);
  });

  it('swaps between computers, charges one move, and recomputes the end status', () => {
    const game = createGame(COMPUTER_ROOM);
    const first = game.students.find(student => student.seatId === 0)!;
    const second = game.students.find(student => student.seatId === 12)!;
    const selected = selectSeat(game, 0, COMPUTER_ROOM);
    const swapped = selectSeat(selected, 12, COMPUTER_ROOM);
    expect(swapped.moves).toBe(1);
    expect(swapped.students.find(student => student.id === first.id)?.seatId).toBe(12);
    expect(swapped.students.find(student => student.id === second.id)?.seatId).toBe(0);
    expect(swapped.status).toBe(getStatus(calculateNoise(swapped.students, COMPUTER_ROOM).totalNoise, COMPUTER_ROOM));
    expect(swapped.selectedId).toBeNull();
  });

  it('supports empty seats and non-contiguous seat IDs without a grid dependency', () => {
    const custom = { ...COMPUTER_ROOM, classroomLayout: { ...COMPUTER_U_SHAPE,
      seats: COMPUTER_U_SHAPE.seats.map(seat => ({ ...seat, id: seat.id + 100, workstationId: undefined })),
      neighbourPairs: [], workstations: [] }, roster: NORMAL_ROSTER.slice(0, 8), targetNoise: -100, loseNoise: 100 };
    const game = createGame(custom);
    const first = game.students[0];
    const empty = custom.classroomLayout.seats.find(seat => !game.students.some(student => student.seatId === seat.id))!;
    const moved = selectSeat(selectSeat(game, first.seatId, custom), empty.id, custom);
    expect(moved.moves).toBe(1);
    expect(moved.students.find(student => student.id === first.id)?.seatId).toBe(empty.id);
    expect(moved.students).toHaveLength(8);
    expect(selectSeat(game, 999, custom)).toBe(game);
    expect(swapSeats(game.students, first.id, empty.id).find(student => student.id === first.id)?.seatId).toBe(empty.id);
  });

  it('shows separate effects in Analysis, a single +7 visual, and a decomposed hint', () => {
    const students = [pupil('Geek', 0), pupil('Geek', 1)];
    const state: GameState = { students, moves: 0, selectedId: null, mode: 'analysis', message: '', status: 'playing' };
    const breakdown = calculateNoise(students, COMPUTER_ROOM);
    const html = renderToStaticMarkup(<Classroom students={students} pairs={breakdown.pairs} level={COMPUTER_ROOM} selectedId={null} disabled={false} onSeat={() => {}} />);
    expect(html.match(/data-workstation="/g)).toHaveLength(8);
    expect(html.match(/data-seat="/g)).toHaveLength(16);
    expect(html.match(/<line /g)).toHaveLength(1);
    expect(html).toMatch(/<text[^>]*>\+7<\/text>/);
    expect(html).toContain('data-workstation-noise="2"');
    const analysis = renderToStaticMarkup(<DialogPanel state={state} breakdown={breakdown} level={COMPUTER_ROOM} />);
    expect(analysis).toContain('<span>Neighbour pair effects</span><b>+5</b>');
    expect(analysis).toContain('<span>Workstation effects</span><b>+2</b>');
    const normal = renderToStaticMarkup(<DialogPanel state={state} breakdown={calculateNoise(students, NORMAL_LESSON)} level={NORMAL_LESSON} />);
    expect(normal).not.toContain('Workstation effects');
    expect(useHint(state, COMPUTER_ROOM).message).toContain('Neighbours: +5; workstation: +2');
  });
});
