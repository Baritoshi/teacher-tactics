import type { Student, StudentType } from './types';
// Compatibility export for existing consumers; canonical definitions live in the registry.
export { STUDENT_ARCHETYPES as STUDENT_TYPES } from './archetypes';
const entries: [string, StudentType][] = [
  ['Adam', 'Joker'], ['Lena', 'Nerd'], ['Kamil', 'ToughGuy'], ['Maja', 'Geek'],
  ['Oskar', 'Troublemaker'], ['Zosia', 'Quiet'], ['Filip', 'Joker'], ['Julia', 'Nerd'],
  ['Igor', 'ToughGuy'], ['Ola', 'Quiet'], ['Bartek', 'Geek'], ['Ania', 'Nerd'],
  ['Tomek', 'Troublemaker'], ['Emilia', 'Quiet'], ['Leon', 'Joker'], ['Nina', 'Geek'],
];
export const NORMAL_ROSTER: Omit<Student, 'seatId'>[] = entries.map(([name, archetypeId], index) => ({
  id: `student-${index + 1}`, name, archetypeId, morale: 60 + index % 4 * 5,
}));
export const BEHAVIOUR_ROSTER: readonly Omit<Student, 'seatId'>[] = [
  { id: 'lab-phone', name: 'Iga', archetypeId: 'PhoneAddict' },
  { id: 'lab-alone', name: 'Aneta', archetypeId: 'GoodOnlyAlone' },
  { id: 'marta', name: 'Marta', archetypeId: 'Gossip', relationshipTags: ['gossipPartner'] },
  { id: 'kasia', name: 'Kasia', archetypeId: 'Gossip', relationshipTags: ['gossipPartner'] },
  { id: 'lab-sleeper', name: 'Zenek', archetypeId: 'Sleeper' },
  ...NORMAL_ROSTER.slice(0, 7),
];
