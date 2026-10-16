import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { COMPUTER_ROOM, LEVELS, NORMAL_LESSON } from './levels';
import { calculateNoise, getStudentBaseNoise } from './noiseCalculator';
import { createGame, getRating, getStatus, selectSeat, useHint } from './gameUtils';
import { NORMAL_ROSTER, STUDENT_TYPES } from './students';
import type { GameState, Student, StudentType } from './types';
import { DialogPanel } from '../components/DialogPanel';
import { Classroom } from '../components/Classroom';

const student = (type: StudentType, seatId: number): Student => ({
  id: `s${seatId}`, name: `Student ${seatId}`, archetypeId: type, seatId,
  morale: 60,
});
const fixture = [student('Geek', 0), student('Geek', 1), student('Troublemaker', 4)];
const fixtureState: GameState = {
  students: fixture, moves: 0, selectedId: null, mode: 'analysis', message: '', status: 'playing',
};

describe('Computer Room configuration', () => {
  it('registers the original scenarios first and shares the canonical roster', () => {
    expect(LEVELS.slice(0, 2)).toEqual([NORMAL_LESSON, COMPUTER_ROOM]);
    expect(COMPUTER_ROOM.roster).toBe(NORMAL_ROSTER);
    expect(NORMAL_LESSON.roster).toBe(NORMAL_ROSTER);
    expect(COMPUTER_ROOM).toMatchObject({ targetNoise: 48, loseNoise: 62, hintCost: 1 });
  });

  it.each([
    ['Geek', 2, 3], ['Troublemaker', 6, 7], ['Nerd', 1, 1],
    ['Joker', 4, 4], ['ToughGuy', 5, 5], ['Quiet', 0, 0],
  ] as const)('uses scenario base noise for %s without changing normal noise', (type, normal, computer) => {
    const pupil = student(type, 0);
    expect(getStudentBaseNoise(pupil, NORMAL_LESSON)).toBe(normal);
    expect(getStudentBaseNoise(pupil, COMPUTER_ROOM)).toBe(computer);
    expect(STUDENT_TYPES[pupil.archetypeId].baseNoise).toBe(normal);
  });

  it('counts Geek pairs once as +3 in Normal Lesson and +5 in Computer Room', () => {
    const normal = calculateNoise(fixture, NORMAL_LESSON);
    const computer = calculateNoise(fixture, COMPUTER_ROOM);
    expect(normal).toMatchObject({ baseNoise: 10, seatModifiers: -2, pairEffects: 3, totalNoise: 11 });
    expect(computer).toMatchObject({ baseNoise: 13, seatModifiers: -2, pairEffects: 5, workstationEffects: 2, totalNoise: 18 });
    expect(computer.pairs).toHaveLength(1);
    expect(computer.totalNoise).toBe(computer.baseNoise + computer.seatModifiers + computer.pairEffects + computer.workstationEffects);
  });

  it('leaves all other relationship rules unchanged', () => {
    expect(COMPUTER_ROOM.relationships.filter(rule => !rule.types.every(type => type === 'Geek')))
      .toEqual(NORMAL_LESSON.relationships.filter(rule => !rule.types.every(type => type === 'Geek')));
  });

  it('can switch repeatedly without mutating the roster, existing games, or normal rules', () => {
    const originalRoster = structuredClone(NORMAL_ROSTER);
    const originalRules = structuredClone(NORMAL_LESSON.relationships);
    const normalGame = createGame(NORMAL_LESSON);
    const originalGame = structuredClone(normalGame);
    for (const level of [COMPUTER_ROOM, NORMAL_LESSON, COMPUTER_ROOM, NORMAL_LESSON]) {
      const game = createGame(level);
      calculateNoise(game.students, level);
      useHint(game, level);
      const selected = selectSeat(game, game.students[0].seatId, level);
      selectSeat(selected, game.students[1].seatId, level);
      expect(game.moves).toBe(0);
      expect(game.selectedId).toBeNull();
    }
    expect(NORMAL_ROSTER).toEqual(originalRoster);
    expect(NORMAL_LESSON.relationships).toEqual(originalRules);
    expect(normalGame).toEqual(originalGame);
  });

  it('resets Computer Room with 16 unique seats and applies modifiers exactly once', () => {
    for (let reset = 0; reset < 20; reset++) {
      const game = createGame(COMPUTER_ROOM);
      const breakdown = calculateNoise(game.students, COMPUTER_ROOM);
      expect(game).toMatchObject({ moves: 0, selectedId: null, mode: 'welcome', status: 'playing' });
      expect(game.students).toHaveLength(16);
      expect(new Set(game.students.map(pupil => pupil.seatId)).size).toBe(16);
      expect(breakdown.baseNoise).toBe(48); // Canonical 43 + three Geeks + two Troublemakers.
      expect(breakdown.seatModifiers).toBe(-4);
      expect(getStatus(breakdown.totalNoise, COMPUTER_ROOM)).toBe('playing');
      expect(calculateNoise(game.students, NORMAL_LESSON).baseNoise).toBe(43);
    }
  });

  it('uses the configured hint cost and strongest active relationship', () => {
    const hint = useHint(fixtureState, COMPUTER_ROOM);
    expect(hint.moves).toBe(1);
    expect(hint.message).toContain('Geek + Geek: +7 noise');
    expect(hint.students).toBe(fixtureState.students);
    expect(useHint(fixtureState, { ...COMPUTER_ROOM, hintCost: 2 }).moves).toBe(2);
  });

  it('uses Computer Room thresholds and the shared rating bands', () => {
    expect([48, 49, 62, 63].map(noise => getStatus(noise, COMPUTER_ROOM)))
      .toEqual(['won', 'playing', 'playing', 'lost']);
    expect(getRating(5, COMPUTER_ROOM)).toBe('Excellent');
  });
});

describe('shared scenario presentation', () => {
  it('renders Analysis from the same breakdown used by the calculator', () => {
    const breakdown = calculateNoise(fixture, COMPUTER_ROOM);
    const html = renderToStaticMarkup(<DialogPanel state={fixtureState} breakdown={breakdown} level={COMPUTER_ROOM} />);
    expect(html).toContain('COMPUTER ROOM · 02');
    for (const [label, value] of [['Total noise', 18], ['Base noise', 13], ['Seat modifiers', '-2'], ['Neighbour pair effects', '+5'], ['Workstation effects', '+2'], ['Target', '≤ 48'], ['Lose', '&gt; 62']]) {
      expect(html).toContain(`<span>${label}</span><b>${value}</b>`);
    }
  });

  it('draws the calculator pair as +7 with problem rings using the shared Classroom', () => {
    const breakdown = calculateNoise(fixture, COMPUTER_ROOM);
    const html = renderToStaticMarkup(<Classroom students={fixture} pairs={breakdown.pairs} level={COMPUTER_ROOM} selectedId={null} disabled={false} onSeat={() => {}} />);
    expect(breakdown.pairs[0].noise).toBe(7);
    expect(html).toMatch(/<text[^>]*>\+7<\/text>/);
    expect(html.match(/student-token problem/g)).toHaveLength(2);
    const normal = renderToStaticMarkup(<Classroom students={fixture} pairs={calculateNoise(fixture, NORMAL_LESSON).pairs} level={NORMAL_LESSON} selectedId={null} disabled={false} onSeat={() => {}} />);
    expect(normal).toMatch(/<text[^>]*>\+3<\/text>/);
  });

  it('shows effective student noise, scenario legend and description', () => {
    const breakdown = calculateNoise(fixture, COMPUTER_ROOM);
    const render = (mode: GameState['mode']) => renderToStaticMarkup(<DialogPanel state={{ ...fixtureState, mode, selectedId: fixture[0].id }} breakdown={breakdown} level={COMPUTER_ROOM} />);
    expect(render('student')).toContain('Base noise <b>3</b>');
    expect(render('student')).toContain('Student 1: +7');
    expect(render('legend')).toContain('<b>Geek</b> 3');
    expect(render('legend')).toContain('<b>Troublemaker</b> 7');
    expect(render('legend')).toContain('Geek + Geek +5');
    expect(render('welcome')).toContain(COMPUTER_ROOM.description);
    const normal = renderToStaticMarkup(<DialogPanel state={{ ...fixtureState, mode: 'student', selectedId: fixture[0].id }} breakdown={calculateNoise(fixture, NORMAL_LESSON)} level={NORMAL_LESSON} />);
    expect(normal).toContain('NORMAL LESSON · 01');
    expect(normal).toContain('Base noise <b>2</b>');
  });
});
