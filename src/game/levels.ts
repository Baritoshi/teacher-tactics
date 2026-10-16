import type { LevelDefinition } from './types';
import { NORMAL_ROSTER } from './students';
import { NORMAL_RELATIONSHIPS } from './relationships';
import { COMPUTER_U_SHAPE, STANDARD_GRID } from './layouts';
export const NORMAL_LESSON: LevelDefinition = {
  id: 'normal-lesson', name: 'Normal Lesson', classroomLayout: STANDARD_GRID,
  targetNoise: 45, loseNoise: 60, hintCost: 1, frontRowModifier: -2, windowModifier: 1,
  roster: NORMAL_ROSTER, relationships: NORMAL_RELATIONSHIPS,
  ratings: [ { maxMoves: 4, label: 'Masterclass' }, { maxMoves: 8, label: 'Excellent' },
    { maxMoves: 12, label: 'Good' }, { maxMoves: 16, label: 'Acceptable' },
    { maxMoves: 22, label: 'Barely survived' }, { maxMoves: Infinity, label: 'Total teacher exhaustion' } ],
};

export const COMPUTER_ROOM: LevelDefinition = {
  ...NORMAL_LESSON,
  id: 'computer-room',
  name: 'Computer Room',
  classroomLayout: COMPUTER_U_SHAPE,
  description: 'Students are more easily distracted by computers. Geeks become especially talkative when seated together.',
  targetNoise: 48,
  loseNoise: 62,
  hintCost: 1,
  baseNoiseModifiers: { Geek: 1, Troublemaker: 1 },
  workstationRelationships: [{ types: ['Geek', 'Geek'], noise: 2 }],
  relationships: NORMAL_RELATIONSHIPS.map(rule => ({
    ...rule,
    noise: rule.types.every(type => type === 'Geek') ? 5 : rule.noise,
  })),
};

export const SUBSTITUTE_LESSON: LevelDefinition = {
  ...NORMAL_LESSON,
  id: 'substitute-lesson', name: 'Substitute Lesson',
  description: 'The regular teacher is absent. Students are testing the limits, and noisy combinations become even harder to control.',
  targetNoise: 48, loseNoise: 65, hintCost: 1,
  baseNoiseModifiers: { Joker: 1, ToughGuy: 1, Troublemaker: 1 },
  positivePairModifier: 1,
};

export const LESSON_OBSERVATION: LevelDefinition = {
  ...NORMAL_LESSON,
  id: 'lesson-observation', name: 'Lesson Observation',
  description: 'An observer is present. The classroom must stay especially calm, and every unnecessary move matters.',
  targetNoise: 40, loseNoise: 55, hintCost: 2,
  ratings: [ { maxMoves: 3, label: 'Masterclass' }, { maxMoves: 6, label: 'Excellent' },
    { maxMoves: 9, label: 'Good' }, { maxMoves: 12, label: 'Acceptable' },
    { maxMoves: 16, label: 'Barely survived' }, { maxMoves: Infinity, label: 'Total teacher exhaustion' } ],
};

export const HALF_ABSENT: LevelDefinition = {
  ...NORMAL_LESSON,
  id: 'half-absent', name: 'Half Absent',
  description: 'Half the class is missing today. Empty desks give you more room to work with — but some students can still talk across the gaps.',
  studentCount: 8, targetNoise: 22, loseNoise: 38, hintCost: 1,
  distantInteractionMultiplier: 0.5,
  ratings: [ { maxMoves: 2, label: 'Masterclass' }, { maxMoves: 4, label: 'Excellent' },
    { maxMoves: 6, label: 'Good' }, { maxMoves: 8, label: 'Acceptable' },
    { maxMoves: 11, label: 'Barely survived' }, { maxMoves: Infinity, label: 'Total teacher exhaustion' } ],
};

export const LEVELS: readonly LevelDefinition[] = [NORMAL_LESSON, COMPUTER_ROOM, SUBSTITUTE_LESSON, LESSON_OBSERVATION, HALF_ABSENT];
