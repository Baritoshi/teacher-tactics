import type { LevelDefinition } from './types';
import { NORMAL_ROSTER } from './students';
import { NORMAL_RELATIONSHIPS } from './relationships';
export const NORMAL_LESSON: LevelDefinition = {
  id: 'normal-lesson', name: 'Normal Lesson', rows: 4, columns: 4,
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
  description: 'Students are more easily distracted by computers. Geeks become especially talkative when seated together.',
  targetNoise: 48,
  loseNoise: 62,
  hintCost: 1,
  baseNoiseModifiers: { Geek: 1, Troublemaker: 1 },
  relationships: NORMAL_RELATIONSHIPS.map(rule => ({
    ...rule,
    noise: rule.types.every(type => type === 'Geek') ? 5 : rule.noise,
  })),
};

export const LEVELS: readonly LevelDefinition[] = [NORMAL_LESSON, COMPUTER_ROOM];
