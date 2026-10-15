import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LEVELS, NORMAL_LESSON, COMPUTER_ROOM, SUBSTITUTE_LESSON, LESSON_OBSERVATION } from './levels';
import { calculateNoise, getNeighbourNoise, getStudentBaseNoise } from './noiseCalculator';
import { createGame, getRating, getStatus, selectSeat, useHint } from './gameUtils';
import { NORMAL_ROSTER, STUDENT_TYPES } from './students';
import type { GameState, Student, StudentType } from './types';
import { DialogPanel } from '../components/DialogPanel';
import { EndScreen } from '../components/EndScreen';
import { HUD } from '../components/HUD';
import { LevelSelect } from '../components/LevelSelect';

const student = (type: StudentType, seatId: number): Student => ({
  id: `s${seatId}`, name: `Student ${seatId}`, type, seatId,
  baseNoise: STUDENT_TYPES[type].baseNoise, influence: 1, morale: 60,
});
const state = (students: Student[]): GameState => ({ students, moves: 0, selectedId: null, mode: 'analysis', message: '', status: 'playing' });

describe('configured scenarios', () => {
  it('preserves the original noise, hint and rating thresholds', () => {
    expect(NORMAL_LESSON).toMatchObject({ targetNoise: 45, loseNoise: 60, hintCost: 1 });
    expect(COMPUTER_ROOM).toMatchObject({ targetNoise: 48, loseNoise: 62, hintCost: 1 });
    expect(NORMAL_LESSON.ratings.map(b => b.maxMoves)).toEqual([4, 8, 12, 16, 22, Infinity]);
    expect(COMPUTER_ROOM.ratings).toEqual(NORMAL_LESSON.ratings);
    expect(calculateNoise([student('Geek', 0), student('Geek', 1)], NORMAL_LESSON)).toMatchObject({ baseNoise: 4, pairEffects: 3, workstationEffects: 0 });
    expect(calculateNoise([student('Geek', 0), student('Geek', 1)], COMPUTER_ROOM)).toMatchObject({ baseNoise: 6, pairEffects: 5, workstationEffects: 2 });
  });

  it.each(Object.keys(STUDENT_TYPES) as StudentType[])('applies Substitute base modifiers only to the specified types: %s', type => {
    const pupil = student(type, 0);
    const extra = ['Joker', 'ToughGuy', 'Troublemaker'].includes(type) ? 1 : 0;
    expect(getStudentBaseNoise(pupil, SUBSTITUTE_LESSON)).toBe(pupil.baseNoise + extra);
    expect(getStudentBaseNoise(pupil, LESSON_OBSERVATION)).toBe(pupil.baseNoise);
    expect(getStudentBaseNoise(pupil, NORMAL_LESSON)).toBe(pupil.baseNoise);
  });

  it.each([
    ['Joker', 'Joker', 5], ['Troublemaker', 'Joker', 7], ['ToughGuy', 'ToughGuy', 6],
    ['Geek', 'Geek', 4], ['Nerd', 'Quiet', -2], ['Quiet', 'Joker', 0],
  ] as const)('calculates Substitute %s/%s once as %i', (first, second, noise) => {
    for (const types of [[first, second], [second, first]]) {
      const breakdown = calculateNoise([student(types[0], 0), student(types[1], 1)], SUBSTITUTE_LESSON);
      expect(breakdown.pairEffects).toBe(noise);
      expect(breakdown.pairs).toHaveLength(noise === 0 ? 0 : 1);
      expect(breakdown.workstationEffects).toBe(0);
      expect(breakdown.totalNoise).toBe(breakdown.baseNoise + breakdown.seatModifiers + noise);
    }
  });

  it('leaves every Observation pair rule and base value standard', () => {
    for (const first of Object.keys(STUDENT_TYPES) as StudentType[]) {
      for (const second of Object.keys(STUDENT_TYPES) as StudentType[]) {
        expect(getNeighbourNoise(first, second, LESSON_OBSERVATION)).toBe(getNeighbourNoise(first, second, NORMAL_LESSON));
      }
    }
    expect([40, 41, 55, 56].map(n => getStatus(n, LESSON_OBSERVATION))).toEqual(['won', 'playing', 'playing', 'lost']);
    expect([48, 49, 65, 66].map(n => getStatus(n, SUBSTITUTE_LESSON))).toEqual(['won', 'playing', 'playing', 'lost']);
  });

  it.each(LEVELS)('charges and displays the configured hint cost in $name', level => {
    const initial = state([student('Joker', 0), student('Troublemaker', 1)]);
    const hinted = useHint(initial, level);
    expect(hinted.moves).toBe(level === LESSON_OBSERVATION ? 2 : 1);
    expect(hinted.students).toBe(initial.students);
    const hud = renderToStaticMarkup(<HUD noise={50} moves={0} level={level} disabled={false} onAction={() => {}} />);
    expect(hud).toContain(`<small>+${level.hintCost} ${level.hintCost === 1 ? 'move' : 'moves'}</small>`);
    const html = renderToStaticMarkup(<DialogPanel state={hinted} breakdown={calculateNoise(initial.students, level)} level={level} />);
    expect(html).toContain(`HINT USED · +${level.hintCost} ${level.hintCost === 1 ? 'MOVE' : 'MOVES'}`);
    if (level === SUBSTITUTE_LESSON) expect(hinted.message).toContain('+7 noise');
  });

  it.each([[0, 'Masterclass'], [3, 'Masterclass'], [4, 'Excellent'], [6, 'Excellent'], [7, 'Good'], [9, 'Good'], [10, 'Acceptable'], [12, 'Acceptable'], [13, 'Barely survived'], [16, 'Barely survived'], [17, 'Total teacher exhaustion'], [30, 'Total teacher exhaustion']] as const)('rates Observation %i moves as %s', (moves, rating) => {
    expect(getRating(moves, LESSON_OBSERVATION)).toBe(rating);
    const html = renderToStaticMarkup(<EndScreen status="won" noise={40} moves={moves} level={LESSON_OBSERVATION} onReset={() => {}} />);
    expect(html).toContain(`Rating: ${rating}`);
  });

  it('renders effective Substitute Analysis, student details and legend', () => {
    const students = [student('Joker', 0), student('Troublemaker', 1)];
    const breakdown = calculateNoise(students, SUBSTITUTE_LESSON);
    expect(breakdown).toMatchObject({ baseNoise: 12, seatModifiers: -3, pairEffects: 7, totalNoise: 16 });
    const panel = (mode: GameState['mode']) => renderToStaticMarkup(<DialogPanel state={{ ...state(students), mode, selectedId: students[0].id }} breakdown={breakdown} level={SUBSTITUTE_LESSON} />);
    for (const [label, value] of [['Base noise', 12], ['Seat modifiers', '-3'], ['Pair effects', '+7'], ['Total noise', 16]]) expect(panel('analysis')).toContain(`<span>${label}</span><b>${value}</b>`);
    expect(panel('analysis')).not.toContain('Workstation effects');
    expect(panel('student')).toContain('Base noise <b>5</b>');
    expect(panel('legend')).toContain('Joker + Joker +5');
    expect(panel('legend')).toContain('Troublemaker + Joker +7');
    expect(panel('legend')).toContain('Nerd + Quiet -2');
  });

  it.each(LEVELS)('creates/reset $name in an active state without altering shared definitions', level => {
    const rosterBefore = structuredClone(NORMAL_ROSTER);
    const levelsBefore = structuredClone(LEVELS);
    const archetypesBefore = structuredClone(STUDENT_TYPES);
    const initial = createGame(level);
    const initialBefore = structuredClone(initial);
    for (let reset = 0; reset < 15; reset++) {
      const game = createGame(level);
      expect(game).toMatchObject({ moves: 0, selectedId: null, mode: 'welcome', status: 'playing' });
      expect(game.students).toHaveLength(16);
      expect(new Set(game.students.map(s => s.seatId)).size).toBe(16);
      expect(getStatus(calculateNoise(game.students, level).totalNoise, level)).toBe('playing');
      useHint(game, level);
      selectSeat(selectSeat(game, game.students[0].seatId, level), game.students[1].seatId, level);
    }
    expect(initial).toEqual(initialBefore);
    expect(LEVELS).toEqual(levelsBefore);
    expect(NORMAL_ROSTER).toEqual(rosterBefore);
    expect(STUDENT_TYPES).toEqual(archetypesBefore);
    if (level !== COMPUTER_ROOM) expect(level.classroomLayout).toBe(NORMAL_LESSON.classroomLayout);
  });

  it('switches through all scenarios without accumulating modifiers', () => {
    for (const level of [...LEVELS, ...LEVELS].reverse()) {
      const breakdown = calculateNoise(createGame(level).students, level);
      expect(breakdown.baseNoise).toBe(level === SUBSTITUTE_LESSON ? 50 : level === COMPUTER_ROOM ? 48 : 43);
    }
  });

  it.each(LEVELS.map((level, index) => ({ level, index })))('shows selector position $index with all four options', ({ level, index }) => {
    const html = renderToStaticMarkup(<LevelSelect level={level} onChange={() => {}} />);
    expect(html).toContain(`${String(index + 1).padStart(2, '0')} / 04`);
    expect(html).toContain(`value="${level.id}" selected=""`);
    for (const item of LEVELS) expect(html).toContain(`>${item.name}</option>`);
  });
});
