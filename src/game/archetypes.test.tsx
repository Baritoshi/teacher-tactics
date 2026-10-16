import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { STUDENT_ARCHETYPES, getArchetype } from './archetypes';
import { BEHAVIOUR_LAB, HALF_ABSENT, LEVELS, SELECTABLE_LEVELS } from './levels';
import { calculateNoise, getStudentBaseNoise } from './noiseCalculator';
import { createGame, getStatus, selectSeat, useHint } from './gameUtils';
import { buildNoiseHint } from './hints';
import { NORMAL_ROSTER } from './students';
import type { GameState, LevelDefinition, Student, StudentArchetypeDefinition } from './types';
import { DialogPanel } from '../components/DialogPanel';
import { Classroom } from '../components/Classroom';
import { LevelSelect } from '../components/LevelSelect';

const pupil = (archetypeId: string, seatId: number, id = `s${seatId}`): Student => ({ id, name: id, archetypeId, seatId });
const state = (students: Student[]): GameState => ({ students, moves: 0, selectedId: null, mode: 'analysis', message: '', status: 'playing' });
const isolated: LevelDefinition = { ...BEHAVIOUR_LAB, frontRowModifier: 0, windowModifier: 0 };
const calc = (students: Student[]) => calculateNoise(students, isolated);
const duo = (secondSeat: number) => [pupil('Gossip', 0, 'marta'), pupil('Gossip', secondSeat, 'kasia')];
const hint = (students: Student[]) => buildNoiseHint(students, isolated, calc(students));
const panel = (students: Student[], mode: GameState['mode'], level = isolated) => renderToStaticMarkup(
  <DialogPanel state={{ ...state(students), mode, selectedId: students[0]?.id ?? null }} breakdown={calculateNoise(students, level)} level={level} />,
);

describe('Phone Addict self effects', () => {
  it('resolves base noise from the definition without copied stats', () => {
    const student = pupil('PhoneAddict', 5);
    expect(getStudentBaseNoise(student, isolated)).toBe(2);
    expect(student).not.toHaveProperty('baseNoise');
    expect(student).not.toHaveProperty('behaviourRules');
  });
  it.each([[1, -1], [13, 3], [4, 1], [12, 4], [0, 0]])('adds seat effects at seat %i to %i', (seat, expected) => {
    const result = calc([pupil('PhoneAddict', seat)]);
    expect(result.archetypeSeatEffects).toBe(expected);
    expect(result.totalNoise).toBe(2 + expected);
    expect(result.effects).toHaveLength(0);
    expect(result.studentEffects.every(effect => effect.source === 'seat-position')).toBe(true);
  });
  it('does not mutate definitions, level or instance', () => {
    const definitions = structuredClone(STUDENT_ARCHETYPES), level = structuredClone(isolated);
    const students = [pupil('PhoneAddict', 12)], before = structuredClone(students);
    calc(students); hint(students);
    expect(STUDENT_ARCHETYPES).toEqual(definitions);
    expect(isolated).toEqual(level);
    expect(students).toEqual(before);
  });
});

describe('Good Only Alone occupied adjacency', () => {
  it.each([
    [[], -2], [[6], 2], [[4, 6], 2], [[7], -2], [[0], -2],
  ] as [number[], number][])('counts occupied adjacent seats %j once', (seats, expected) => {
    const result = calc([pupil('GoodOnlyAlone', 5), ...seats.map(seat => pupil('Quiet', seat))]);
    expect(result.archetypeSeatEffects).toBe(expected);
    expect(result.studentEffects).toHaveLength(1);
    expect(result.studentEffects[0]).toMatchObject({ source: 'alone-condition', noiseDelta: expected });
  });
});

describe('specific relationships use student IDs', () => {
  it.each([[1, 8, 'Adjacent'], [2, 4, 'GapOne'], [8, 4, 'GapOne']] as const)('adds one effect at seat %i', (seat, noise, relationType) => {
    const result = calc(duo(seat));
    expect(result.specificRelationshipEffects).toBe(noise);
    expect(result.adjacentPairEffects + result.distantPairEffects).toBe(0);
    expect(result.effects).toEqual([expect.objectContaining({ source: 'specific-relationship', relationType, noiseDelta: noise, relationshipId: 'marta-kasia-gossip' })]);
    expect(result.pairs).toHaveLength(1);
    expect(result.totalNoise).toBe(4 + noise);
  });
  it.each(['marta', 'kasia'])('does not link %s with an arbitrary Gossip', id => {
    expect(calc([pupil('Gossip', 0, id), pupil('Gossip', 1, 'other')]).specificRelationshipEffects).toBe(0);
  });
  it('ignores display names and array order', () => {
    const renamed = duo(1).map((student, i) => ({ ...student, name: `Renamed ${i}` })).reverse();
    expect(calc(renamed).specificRelationshipEffects).toBe(8);
    expect(hint(renamed)).toContain('Renamed 0 and Renamed 1');
    expect(calc(duo(1).map((student, i) => ({ ...student, id: `other-${i}` }))).specificRelationshipEffects).toBe(0);
  });
  it('requires a valid direct or empty-gap spatial relation', () => {
    for (const seat of [3, 5, 10, 15]) expect(calc(duo(seat)).specificRelationshipEffects).toBe(0);
    expect(calc([...duo(2), pupil('Quiet', 1)]).specificRelationshipEffects).toBe(0);
  });
  it('deduplicates reversed relationships without applying generic pair modifiers twice', () => {
    const relationship = isolated.specificRelationships![0];
    const level = { ...isolated, positivePairModifier: 10, distantInteractionMultiplier: 0.1,
      specificRelationships: [relationship, { ...relationship, id: 'duplicate', studentAId: 'kasia', studentBId: 'marta' }] };
    expect(calculateNoise(duo(1), level).specificRelationshipEffects).toBe(8);
    expect(calculateNoise(duo(2), level).specificRelationshipEffects).toBe(4);
  });
});

describe('optional engagement', () => {
  it.each([[1, -3], [5, -1], [9, -1], [13, 0]])('evaluates Sleeper at seat %i', (seat, engagement) => {
    const result = calc([pupil('Sleeper', seat)]);
    expect(result.totalNoise).toBe(0);
    expect(result.hasEngagement).toBe(true);
    expect(result.engagement).toEqual({ base: 0, archetypeEffects: engagement, total: engagement });
  });
  it.each([[-1, 1, 'playing'], [0, 1, 'won'], [-2, -1, 'lost']] as const)('keeps outcomes driven exclusively by noise', (targetNoise, loseNoise, outcome) => {
    const level = { ...isolated, targetNoise, loseNoise };
    const initial = state([pupil('Sleeper', 13)]);
    const moved = selectSeat(selectSeat(initial, 13, level), 1, level);
    expect(calculateNoise(moved.students, level).engagement.total).toBe(-3);
    expect(moved.status).toBe(outcome);
  });
  it('shows optional engagement only for contributing students', () => {
    expect(panel([pupil('Sleeper', 1)], 'analysis')).toContain('<span>Engagement (optional)</span><b>-3</b>');
    expect(panel([pupil('Quiet', 1)], 'analysis')).not.toContain('Engagement (optional)');
  });
});

describe('shared effects in hints and UI', () => {
  it('prioritizes a Phone Addict with +4 self noise', () => {
    expect(hint([pupil('PhoneAddict', 12, 'Iga')])).toBe('Move Iga closer to the teacher. The current seat adds +4 noise.');
  });
  it('recommends space for a distracted student', () => {
    expect(hint([pupil('GoodOnlyAlone', 5, 'Aneta'), pupil('Quiet', 6)])).toContain('Aneta works better with some space');
  });
  it('explains gossip and the actual gap strength', () => {
    expect(hint(duo(1))).toContain('gossip relationship adds +8 noise');
    expect(hint(duo(2))).toContain('gossip relationship adds +4 noise. They are talking across an empty desk.');
  });
  it('chooses stronger pair noise over self noise and ignores engagement', () => {
    const students = [pupil('PhoneAddict', 12), pupil('Joker', 1, 'J'), pupil('Troublemaker', 2, 'T'), pupil('Sleeper', 3, 'Z')];
    expect(hint(students)).toContain('Separate J and T');
    expect(hint([pupil('Sleeper', 1)])).toContain('No problematic neighbours');
  });
  it('shows self effects, special partner and allocated total in the inspector', () => {
    expect(panel([pupil('PhoneAddict', 12)], 'student')).toContain('Total contribution <b title="Base + seat + archetype effects + half of each shared relationship">+6</b>');
    expect(panel([pupil('PhoneAddict', 12)], 'student')).toContain('Away from the teacher: +3 noise.');
    expect(panel(duo(1), 'student')).toContain('Special relationship: <b>kasia</b> — Gossip Partner');
    expect(panel(duo(1), 'student')).toContain('kasia: +8');
    expect(panel([pupil('PhoneAddict', 12), ...duo(1)], 'analysis')).toContain('<span>Archetype effects</span><b>+4</b>');
    expect(panel(duo(1), 'analysis')).toContain('<span>Specific relationships</span><b>+8</b>');
  });
  it('renders specific GapOne as one dashed line with its +4 label', () => {
    const students = duo(2), result = calc(students);
    const html = renderToStaticMarkup(<Classroom students={students} pairs={result.pairs} level={isolated} selectedId={null} disabled={false} onSeat={() => {}} />);
    expect(html.match(/<line /g)).toHaveLength(1);
    expect(html).toContain('line-gap-one');
    expect(html).toMatch(/class="gap-label"[^>]*>\+4<\/span>/);
  });
});

describe('data-driven extension and scenario isolation', () => {
  const custom: StudentArchetypeDefinition = { id: 'TestArchetype', displayName: 'Test Student', shortCode: 'X', description: 'Configured without a component change.',
    baseNoise: 7, influence: 1, color: '#789abc', traits: [], behaviourRules: [
      { id: 'window-test', kind: 'seat-condition', condition: 'window', contribution: { noise: 9, engagement: 2 }, description: 'Test window effect.', hint: 'Move {name}: +{noise}.' },
    ] };
  const level = { ...isolated, archetypes: { ...STUDENT_ARCHETYPES, [custom.id]: custom } };
  it('automatically renders every registry entry with its original description', () => {
    const html = panel([], 'legend', level);
    for (const archetype of Object.values(level.archetypes)) {
      expect(html).toContain(`<b>${archetype.displayName}</b>`);
      expect(html).toContain(archetype.description);
      expect(html).toContain(archetype.color);
    }
    const students = [pupil(custom.id, 12)];
    const htmlToken = renderToStaticMarkup(<Classroom students={students} pairs={[]} level={level} selectedId={null} disabled={false} onSeat={() => {}} />);
    expect(htmlToken).toContain('token-face">X');
    expect(htmlToken).toContain('Test Student');
  });
  it('uses custom rule data in calculation and hints, without mutating the global registry', () => {
    const students = [pupil(custom.id, 12, 'Pat')], result = calculateNoise(students, level);
    expect(result.totalNoise).toBe(16);
    expect(result.engagement.total).toBe(2);
    expect(buildNoiseHint(students, level, result)).toBe('Move Pat: +9.');
    expect(STUDENT_ARCHETYPES[custom.id]).toBeUndefined();
    expect(() => getArchetype(custom.id)).toThrow('Unknown student archetype');
    const duplicate = { ...level, archetypes: { ...level.archetypes, [custom.id]: { ...custom, behaviourRules: [...custom.behaviourRules, ...custom.behaviourRules] } } };
    expect(calculateNoise(students, duplicate)).toEqual(result);
  });
  it('keeps the five original rosters and rules intact; exposes Lab as experimental', () => {
    expect(LEVELS).toHaveLength(5);
    expect(LEVELS.every(level => level.roster === NORMAL_ROSTER && !level.rosterPool)).toBe(true);
    expect(NORMAL_ROSTER.every(student => !['PhoneAddict', 'GoodOnlyAlone', 'Gossip', 'Sleeper'].includes(student.archetypeId))).toBe(true);
    const html = renderToStaticMarkup(<LevelSelect level={BEHAVIOUR_LAB} onChange={() => {}} />);
    expect(html).toContain('<optgroup label="Experimental">');
    expect(html).toContain('>LAB</span>');
    expect(html).toContain('value="behaviour-lab" selected=""');
  });
  it('allows an optional Half Absent pool without changing its default', () => {
    const pool = [...NORMAL_ROSTER.slice(0, 7), { id: 'custom-alone', name: 'A', archetypeId: 'GoodOnlyAlone' }];
    const game = createGame({ ...HALF_ABSENT, rosterPool: pool }, 42);
    expect(game.students.map(student => student.id).sort()).toEqual(pool.map(student => student.id).sort());
    expect(HALF_ABSENT.rosterPool).toBeUndefined();
  });
  it('generates Lab with all five new students, 4 empty seats, stable seeds and working resets', () => {
    for (let seed = 0; seed < 50; seed++) {
      const game = createGame(BEHAVIOUR_LAB, seed);
      expect(game).toEqual(createGame(BEHAVIOUR_LAB, seed));
      expect(game.students).toHaveLength(12);
      expect(new Set(game.students.map(student => student.seatId)).size).toBe(12);
      for (const id of ['lab-phone', 'lab-alone', 'marta', 'kasia', 'lab-sleeper']) expect(game.students.some(student => student.id === id)).toBe(true);
      expect(getStatus(calculateNoise(game.students, BEHAVIOUR_LAB).totalNoise, BEHAVIOUR_LAB)).toBe('playing');
      expect(useHint(game, BEHAVIOUR_LAB).moves).toBe(1);
    }
  });
  it('preserves exact category/contribution sums and immutable data across all scenarios and moves', () => {
    const definitions = structuredClone(STUDENT_ARCHETYPES), levels = structuredClone(SELECTABLE_LEVELS);
    for (const level of SELECTABLE_LEVELS) for (let seed = 0; seed < 20; seed++) {
      let game = createGame(level, seed);
      for (let move = 0; move < 8; move++) {
        const result = calculateNoise(game.students, level);
        expect(result.totalNoise).toBe(result.baseNoise + result.seatModifiers + result.archetypeSeatEffects + result.adjacentPairEffects + result.distantPairEffects + result.specificRelationshipEffects + result.workstationEffects);
        expect(Object.values(result.studentContributions).reduce((sum, value) => sum + value.totalNoise, 0)).toBe(result.totalNoise);
        expect(result.engagement.total).toBe(result.studentEffects.reduce((sum, effect) => sum + effect.engagementDelta, 0));
        game = selectSeat(selectSeat(game, game.students[move].seatId, level), (seed + move) % 16, level);
      }
    }
    expect(STUDENT_ARCHETYPES).toEqual(definitions);
    expect(SELECTABLE_LEVELS).toEqual(levels);
  });
});
