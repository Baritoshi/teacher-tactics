import { describe, expect, it } from 'vitest';
import { calculateNoise } from './noiseCalculator';
import { NORMAL_LESSON } from './levels';
import { createGame, getRating, getStatus, selectSeat, swapSeats, useHint } from './gameUtils';
import type { GameState, Student, StudentType } from './types';
import { STUDENT_TYPES } from './students';
import { relationshipNoise, NORMAL_RELATIONSHIPS } from './relationships';
const student = (type: StudentType, seatId: number, id = `s${seatId}`): Student => ({ id, name: id, type, seatId, baseNoise: STUDENT_TYPES[type].baseNoise, influence: 1, morale: 60 });
const state = (students: Student[]): GameState => ({ students, moves: 0, selectedId: null, mode: 'welcome', message: '', status: 'playing' });
describe('noise rules', () => {
  it.each(NORMAL_RELATIONSHIPS)('applies $types symmetrically', rule => {
    expect(relationshipNoise(rule.types[0], rule.types[1], NORMAL_RELATIONSHIPS)).toBe(rule.noise);
    expect(relationshipNoise(rule.types[1], rule.types[0], NORMAL_RELATIONSHIPS)).toBe(rule.noise);
  });
  it('counts horizontal and vertical pairs once and returns a complete breakdown', () => {
    const result = calculateNoise([student('Joker', 0), student('Troublemaker', 1), student('Joker', 4)], NORMAL_LESSON);
    expect(result).toMatchObject({ baseNoise: 14, seatModifiers: -2, pairEffects: 10, totalNoise: 22 });
    expect(result.pairs).toHaveLength(2);
  });
  it('does not wrap rows, count diagonals, or talk across empty seats', () => {
    for (const seats of [[3, 4], [0, 5], [0, 2]]) {
      expect(calculateNoise(seats.map(seat => student('Joker', seat)), NORMAL_LESSON).pairEffects).toBe(0);
    }
  });
  it('applies helpful pairs and modifiers only to occupied seats', () => {
    expect(calculateNoise([student('Nerd', 0), student('Quiet', 1)], NORMAL_LESSON)).toMatchObject({ baseNoise: 1, seatModifiers: -3, pairEffects: -2, totalNoise: -4 });
    expect(calculateNoise([], NORMAL_LESSON).totalNoise).toBe(0);
  });
});
describe('lesson actions', () => {
  it('swaps two students immutably and moves into an empty seat', () => {
    const roster = [student('Nerd', 0), student('Joker', 1)];
    expect(swapSeats(roster, 's0', 1).map(s => s.seatId)).toEqual([1, 0]);
    expect(swapSeats(roster, 's0', 8).map(s => s.seatId)).toEqual([8, 1]);
    expect(roster.map(s => s.seatId)).toEqual([0, 1]);
  });
  it('selection and cancellation cost no moves; swapping costs one', () => {
    const initial = createGame(NORMAL_LESSON), first = initial.students[0], second = initial.students[1];
    const selected = selectSeat(initial, first.seatId, NORMAL_LESSON);
    expect(selected.selectedId).toBe(first.id);
    expect(selected.moves).toBe(0);
    expect(selectSeat(selected, first.seatId, NORMAL_LESSON).selectedId).toBeNull();
    const swapped = selectSeat(selected, second.seatId, NORMAL_LESSON);
    expect(swapped.moves).toBe(1);
    expect(swapped.selectedId).toBeNull();
    expect(swapped.students.find(s => s.id === first.id)?.seatId).toBe(second.seatId);
  });
  it('hints charge the level cost, find the strongest pair, and do not rearrange students', () => {
    const initial = state([student('Joker', 0), student('Joker', 1), student('Troublemaker', 2)]);
    const hint = useHint(initial, { ...NORMAL_LESSON, hintCost: 2 });
    expect(hint.moves).toBe(2);
    expect(hint.message).toContain('Separate s1 and s2');
    expect(hint.message).toContain('+6 noise');
    expect(hint.students).toBe(initial.students);
  });
  it('handles a hint with no problematic relationships', () => {
    expect(useHint(state([student('Quiet', 0)]), NORMAL_LESSON).message).toContain('No problematic');
  });
  it('honours exact win/lose boundaries', () => {
    expect([44, 45, 46, 60, 61].map(n => getStatus(n, NORMAL_LESSON))).toEqual(['won', 'won', 'playing', 'playing', 'lost']);
  });
  it.each(['won', 'lost'] as const)('blocks swaps and hints after %s', status => {
    const ended = { ...state([student('Joker', 0)]), status };
    expect(selectSeat(ended, 0, NORMAL_LESSON)).toBe(ended);
    expect(useHint(ended, NORMAL_LESSON)).toBe(ended);
  });
  it.each([[0, 'Masterclass'], [4, 'Masterclass'], [5, 'Excellent'], [8, 'Excellent'], [9, 'Good'], [12, 'Good'], [13, 'Acceptable'], [16, 'Acceptable'], [17, 'Barely survived'], [22, 'Barely survived'], [23, 'Total teacher exhaustion']] as const)('rates %i moves as %s', (moves, rating) => {
    expect(getRating(moves, NORMAL_LESSON)).toBe(rating);
  });
  it('starts active, keeps all unique students and seats, and can reach the target', () => {
    for (let i = 0; i < 30; i++) {
      const game = createGame(NORMAL_LESSON);
      expect(game.students).toHaveLength(16);
      expect(new Set(game.students.map(s => s.seatId)).size).toBe(16);
      expect(new Set(game.students.map(s => s.id)).size).toBe(16);
      expect(getStatus(calculateNoise(game.students, NORMAL_LESSON).totalNoise, NORMAL_LESSON)).toBe('playing');
      // This roster has base 43 and occupied-seat modifiers -4. A layout
      // with no positive relationships and a Nerd/Quiet pair is safely winnable.
    }
    const seatOrder = [0, 5, 1, 7, 3, 4, 8, 10, 9, 11, 12, 13, 14, 15, 6, 2];
    const arranged = NORMAL_LESSON.roster.map((s, i) => ({ ...s, seatId: seatOrder[i] }));
    expect(calculateNoise(arranged, NORMAL_LESSON).totalNoise).toBeLessThanOrEqual(NORMAL_LESSON.targetNoise);
  });
});
