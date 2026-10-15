import type { RelationshipRule, StudentType } from './types';
export const NORMAL_RELATIONSHIPS: readonly RelationshipRule[] = [
  { types: ['Joker', 'Joker'], noise: 4 }, { types: ['ToughGuy', 'ToughGuy'], noise: 5 },
  { types: ['Troublemaker', 'Joker'], noise: 6 }, { types: ['Geek', 'Geek'], noise: 3 },
  { types: ['Nerd', 'Quiet'], noise: -2 },
];
export function relationshipNoise(a: StudentType, b: StudentType, rules: readonly RelationshipRule[]) {
  return rules.find(({ types: [x, y] }) => (a === x && b === y) || (a === y && b === x))?.noise ?? 0;
}
