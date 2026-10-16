import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HALF_ABSENT, LEVELS, NORMAL_LESSON, COMPUTER_ROOM, SUBSTITUTE_LESSON } from './levels';
import { createGame, getRating, getStatus, selectSeat, useHint } from './gameUtils';
import { calculateNoise } from './noiseCalculator';
import { detectSpatialRelations } from './spatial';
import { seededRandom } from './random';
import { STUDENT_TYPES } from './students';
import type { GameState, Student, StudentType } from './types';
import { Classroom } from '../components/Classroom';
import { DialogPanel } from '../components/DialogPanel';

const pupil = (type: StudentType, seatId: number): Student => ({ id: `s${seatId}`, name: `Student ${seatId}`, archetypeId: type, seatId, morale: 60 });
const state = (students: Student[]): GameState => ({ students, moves: 0, selectedId: null, mode: 'analysis', message: '', status: 'playing' });
const gapEffects = (students: Student[]) => calculateNoise(students, HALF_ABSENT).effects.filter(effect => effect.source === 'gap-one');
const emptySeats = (students: Student[]) => HALF_ABSENT.classroomLayout.seats.filter(seat => !students.some(student => student.seatId === seat.id));

describe('Half Absent generation and seed', () => {
  it('uses 16 standard seats, 8 sampled students and 8 empty destinations', () => {
    const game = createGame(HALF_ABSENT, 1);
    expect(HALF_ABSENT.classroomLayout).toBe(NORMAL_LESSON.classroomLayout);
    expect(HALF_ABSENT.classroomLayout.seats).toHaveLength(16);
    expect(game.students).toHaveLength(8);
    expect(emptySeats(game.students)).toHaveLength(8);
    expect(game.students.every(student => HALF_ABSENT.roster.some(source => source.id === student.id))).toBe(true);
    expect(game).toMatchObject({ seed: 1, status: 'playing', moves: 0 });
  });
  it('reproduces both roster and placement with the same seed on every level', () => {
    for (const level of LEVELS) for (const seed of [0, 1, 42, -3, 4294967295]) {
      expect(createGame(level, seed)).toEqual(createGame(level, seed));
    }
  });
  it('uses fresh randomness on resets and rerolls both membership and occupied seats', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(seededRandom(901));
    try {
      const games = Array.from({ length: 12 }, () => createGame(HALF_ABSENT));
      expect(new Set(games.map(game => game.students.map(s => s.id).sort().join(','))).size).toBeGreaterThan(1);
      expect(new Set(games.map(game => game.students.map(s => s.seatId).sort((a, b) => a - b).join(','))).size).toBeGreaterThan(1);
      expect(games.every(game => game.seed === undefined && game.moves === 0)).toBe(true);
    } finally { random.mockRestore(); }
  });
  it('different seeds give different games without touching the shared pool', () => {
    const before = structuredClone(LEVELS), typesBefore = structuredClone(STUDENT_TYPES);
    expect(createGame(HALF_ABSENT, 10).students).not.toEqual(createGame(HALF_ABSENT, 11).students);
    expect(LEVELS).toEqual(before);
    expect(STUDENT_TYPES).toEqual(typesBefore);
  });
  it('rejects invalid counts and seeds clearly', () => {
    for (const studentCount of [0, -1, 9.5, 17]) expect(() => createGame({ ...HALF_ABSENT, studentCount }, 1)).toThrow('Invalid student count');
    for (const seed of [NaN, Infinity, 1.5]) expect(() => createGame(HALF_ABSENT, seed)).toThrow('Seed must');
  });
  it.each([[0, 'Masterclass'], [2, 'Masterclass'], [3, 'Excellent'], [4, 'Excellent'], [5, 'Good'], [6, 'Good'], [7, 'Acceptable'], [8, 'Acceptable'], [9, 'Barely survived'], [11, 'Barely survived'], [12, 'Total teacher exhaustion']] as const)('rates %i moves as %s', (moves, rating) => {
    expect(getRating(moves, HALF_ABSENT)).toBe(rating);
  });
});

describe('moving into empty seats', () => {
  it('moves exactly one student, empties the old seat and charges one move', () => {
    const game = createGame(HALF_ABSENT, 42), first = game.students[0];
    const original = structuredClone(game);
    const destination = emptySeats(game.students)[0].id;
    const selected = selectSeat(game, first.seatId, HALF_ABSENT);
    expect(selected.selectedId).toBe(first.id);
    const moved = selectSeat(selected, destination, HALF_ABSENT);
    expect(moved.moves).toBe(1);
    expect(moved.selectedId).toBeNull();
    expect(moved.students).toHaveLength(8);
    expect(moved.students.filter(s => s.id === first.id)).toHaveLength(1);
    expect(moved.students.find(s => s.id === first.id)?.seatId).toBe(destination);
    expect(moved.students.some(s => s.seatId === first.seatId)).toBe(false);
    expect(emptySeats(moved.students)).toHaveLength(8);
    expect(moved.status).toBe(getStatus(calculateNoise(moved.students, HALF_ABSENT).totalNoise, HALF_ABSENT));
    expect(game).toEqual(original);
  });
  it('does nothing when an empty seat is clicked first; supports cancellation and swaps', () => {
    const game = createGame(HALF_ABSENT, 2);
    expect(selectSeat(game, emptySeats(game.students)[0].id, HALF_ABSENT)).toBe(game);
    const [first, second] = game.students;
    const selected = selectSeat(game, first.seatId, HALF_ABSENT);
    expect(selectSeat(selected, first.seatId, HALF_ABSENT)).toMatchObject({ moves: 0, selectedId: null });
    const swapped = selectSeat(selected, second.seatId, HALF_ABSENT);
    expect(swapped.moves).toBe(1);
    expect(swapped.students.find(s => s.id === second.id)?.seatId).toBe(first.seatId);
  });
  it('recalculates GapOne after moving and detects win/lose from the new board', () => {
    const game = state([pupil('Joker', 0), pupil('Joker', 2)]);
    expect(gapEffects(game.students)).toHaveLength(1);
    for (const [targetNoise, loseNoise, expected] of [[100, 200, 'won'], [-100, -50, 'lost']] as const) {
      const level = { ...HALF_ABSENT, targetNoise, loseNoise };
      const moved = selectSeat(selectSeat(game, 0, level), 15, level);
      expect(gapEffects(moved.students)).toHaveLength(0);
      expect(moved.status).toBe(expected);
      expect(useHint(moved, level)).toBe(moved);
    }
  });
});

describe('spatial detection and GapOne values', () => {
  it.each([
    ['Joker', 'Joker', 2], ['ToughGuy', 'ToughGuy', 3], ['Troublemaker', 'Joker', 3], ['Geek', 'Geek', 2],
  ] as const)('rounds %s/%s across an empty seat to %i, in both axes and orders', (first, second, value) => {
    for (const seats of [[0, 2], [1, 9], [12, 14], [7, 15]]) for (const types of [[first, second], [second, first]]) {
      const students = [pupil(types[0], seats[0]), pupil(types[1], seats[1])];
      const breakdown = calculateNoise(students, HALF_ABSENT);
      expect(breakdown.effects).toHaveLength(1);
      expect(breakdown.effects[0]).toMatchObject({ source: 'gap-one', relationType: 'GapOne', noiseDelta: value, studentAId: students[0].id, studentBId: students[1].id });
      expect(breakdown.distantPairEffects).toBe(value);
      expect(breakdown.adjacentPairEffects).toBe(0);
    }
  });
  it('requires the intervening seat to be empty in both axes', () => {
    for (const [end, middle] of [[2, 1], [8, 4]]) {
      expect(gapEffects([pupil('Joker', 0), pupil('Joker', end), pupil('Quiet', middle)])).toHaveLength(0);
    }
  });
  it.each([[0, 3], [0, 12], [0, 5], [0, 10], [3, 5], [3, 4]])('rejects long gaps, diagonals and row wrapping: %i/%i', (first, second) => {
    expect(gapEffects([pupil('Joker', first), pupil('Joker', second)])).toHaveLength(0);
  });
  it('does not transmit helpful or neutral relationships', () => {
    expect(gapEffects([pupil('Nerd', 0), pupil('Quiet', 2)])).toHaveLength(0);
    expect(gapEffects([pupil('Quiet', 0), pupil('Joker', 2)])).toHaveLength(0);
  });
  it('applies the multiplier after final scenario pair modifiers', () => {
    const level = { ...SUBSTITUTE_LESSON, distantInteractionMultiplier: 0.5 };
    expect(calculateNoise([pupil('Joker', 0), pupil('Joker', 2)], level).distantPairEffects).toBe(3); // (4 + 1) / 2
    const overridden = { ...HALF_ABSENT, relationships: [{ types: ['Geek', 'Geek'] as const, noise: 7 }], positivePairModifier: 2 };
    expect(calculateNoise([pupil('Geek', 0), pupil('Geek', 2)], overridden).distantPairEffects).toBe(5); // (7 + 2) / 2
  });
  it('never counts an adjacent pair as GapOne, even with a custom graph override', () => {
    const students = [pupil('Joker', 0), pupil('Joker', 2)];
    const level = { ...HALF_ABSENT, classroomLayout: { ...HALF_ABSENT.classroomLayout, neighbourPairs: [[0, 2], [2, 0], [0, 2]] as const } };
    const result = calculateNoise(students, level);
    expect(result.effects).toHaveLength(1);
    expect(result).toMatchObject({ adjacentPairEffects: 4, distantPairEffects: 0 });
    expect(calculateNoise([pupil('Joker', 0), pupil('Joker', 1)], HALF_ABSENT)).toMatchObject({ adjacentPairEffects: 4, distantPairEffects: 0 });
  });
  it('does not depend on seat IDs, visual coordinates, or array order', () => {
    const layout = { ...HALF_ABSENT.classroomLayout, neighbourPairs: [], seats: HALF_ABSENT.classroomLayout.seats.map(seat => ({ ...seat, id: seat.id * 10 + 100, x: 0, y: 0 })).reverse() };
    const students = [pupil('Joker', 100), pupil('Joker', 120)].reverse();
    const relations = detectSpatialRelations(students, layout);
    expect(relations).toEqual([{ seatA: 100, seatB: 120, relationType: 'GapOne', viaSeatId: 110 }]);
    expect(detectSpatialRelations(students, { ...layout, seats: layout.seats.filter(seat => seat.id !== 110) })).toHaveLength(0);
  });
  it('retains explicit independent adjacent and workstation effects', () => {
    const result = calculateNoise([pupil('Geek', 0), pupil('Geek', 1)], COMPUTER_ROOM);
    expect(result.effects.map(effect => [effect.source, effect.noiseDelta])).toEqual([['adjacent', 5], ['workstation', 2]]);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].effects).toEqual(result.effects);
    expect(result.pairs[0].noise).toBe(7);
    for (const level of LEVELS.slice(0, 4)) expect(calculateNoise([pupil('Joker', 0), pupil('Joker', 2)], level).distantPairEffects).toBe(0);
  });
});

describe('hints and rendering share calculator effects', () => {
  const students = [pupil('Joker', 0), pupil('Troublemaker', 2)];
  it('explains the strongest GapOne problem and charges a hint without moving anyone', () => {
    const initial = state(students);
    const hint = useHint(initial, HALF_ABSENT);
    expect(hint.moves).toBe(1);
    expect(hint.students).toBe(initial.students);
    expect(hint.message).toContain('Move one of these students or block the gap.');
    expect(hint.message).toContain('Student 0 and Student 2');
    expect(hint.message).toContain('across an empty desk: +3 noise');
    const stronger = useHint(state([...students, pupil('Joker', 12), pupil('Troublemaker', 13)]), HALF_ABSENT);
    expect(stronger.message).toContain('Separate Student 12 and Student 13');
  });
  it('renders distant lines, labels, rings and only selected empty destinations', () => {
    const result = calculateNoise(students, HALF_ABSENT);
    const render = (selectedId: string | null, disabled = false) => renderToStaticMarkup(<Classroom students={students} pairs={result.pairs} level={HALF_ABSENT} selectedId={selectedId} disabled={disabled} onSeat={() => {}} />);
    const selected = render(students[0].id);
    expect(selected.match(/data-seat=/g)).toHaveLength(16);
    expect(selected.match(/legal-destination/g)).toHaveLength(14);
    expect(selected).toContain('line-gap-one');
    expect(selected).toContain('data-distant-noise="3"');
    expect(selected).toMatch(/class="gap-label"[^>]*>\+3<\/span>/);
    expect(selected.match(/<line /g)).toHaveLength(1);
    expect(selected.match(/student-token problem/g)).toHaveLength(2);
    expect(render(null)).not.toContain('legal-destination');
    expect(render(students[0].id, true)).not.toContain('legal-destination');
  });
  it('shows the source totals in Analysis and describes distant partners', () => {
    const result = calculateNoise(students, HALF_ABSENT);
    const render = (mode: GameState['mode']) => renderToStaticMarkup(<DialogPanel state={{ ...state(students), mode, selectedId: students[0].id }} breakdown={result} level={HALF_ABSENT} />);
    expect(render('analysis')).toContain('<span>Adjacent pair effects</span><b>0</b>');
    expect(render('analysis')).toContain('<span>Distant pair effects</span><b>+3</b>');
    expect(render('analysis')).not.toContain('Workstation effects');
    expect(render('student')).toContain('Student 2: +3 (across an empty desk)');
    expect(render('legend')).toContain('positive effects × 0.5');
  });
});

describe('seeded board invariants', () => {
  it('preserves unique students, seats, effect categories and exact totals through moves', () => {
    for (const level of LEVELS) for (let seed = 0; seed < 60; seed++) {
      let game = createGame(level, seed);
      const ids = game.students.map(s => s.id).sort();
      const moveRandom = seededRandom(seed + 1000);
      for (let step = 0; step < 8; step++) {
        const occupied = new Set(game.students.map(s => s.seatId));
        expect(occupied.size).toBe(game.students.length);
        expect(game.students.map(s => s.id).sort()).toEqual(ids);
        expect(new Set(ids).size).toBe(ids.length);
        expect(occupied.size + level.classroomLayout.seats.filter(s => !occupied.has(s.id)).length).toBe(level.classroomLayout.seats.length);
        const result = calculateNoise(game.students, level);
        expect(Number.isFinite(result.totalNoise)).toBe(true);
        expect(result.totalNoise).toBe(result.baseNoise + result.seatModifiers + result.adjacentPairEffects + result.distantPairEffects + result.workstationEffects);
        expect(result.distantPairEffects).toBe(result.effects.filter(e => e.source === 'gap-one').reduce((sum, e) => sum + e.noiseDelta, 0));
        expect(result.effects.every(e => e.studentAId !== e.studentBId)).toBe(true);
        const keys = result.effects.map(e => JSON.stringify([e.source, ...[e.studentAId, e.studentBId].sort()]));
        expect(new Set(keys).size).toBe(keys.length);
        for (const pair of result.pairs) expect(pair.noise).toBe(pair.effects.reduce((sum, e) => sum + e.noiseDelta, 0));
        if (game.status !== 'playing') break;
        const first = game.students[Math.floor(moveRandom() * game.students.length)];
        const otherSeats = level.classroomLayout.seats.filter(s => s.id !== first.seatId);
        const target = otherSeats[Math.floor(moveRandom() * otherSeats.length)].id;
        const beforeMoves = game.moves;
        game = selectSeat(selectSeat(game, first.seatId, level), target, level);
        expect(game.moves).toBe(beforeMoves + 1);
        expect(game.selectedId).toBeNull();
      }
    }
  });
});
