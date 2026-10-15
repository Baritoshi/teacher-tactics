import type { Student, StudentType } from './types';
export const STUDENT_TYPES: Record<StudentType, { color: string; short: string; baseNoise: number; description: string }> = {
  Nerd: { color: '#76a46b', short: 'N', baseNoise: 1, description: 'A little focus goes a long way.' },
  Joker: { color: '#e7bc50', short: 'J', baseNoise: 4, description: 'Always has one more joke.' },
  ToughGuy: { color: '#d16b5e', short: 'T', baseNoise: 5, description: 'Best kept away from a rival.' },
  Geek: { color: '#64b6c3', short: 'G', baseNoise: 2, description: 'Too much to talk about with another Geek.' },
  Troublemaker: { color: '#a38ac3', short: '!', baseNoise: 6, description: 'A Joker is the perfect partner in crime.' },
  Quiet: { color: '#a3aaa5', short: 'Q', baseNoise: 0, description: 'A calming neighbour for a Nerd.' },
};
const entries: [string, StudentType][] = [
  ['Adam', 'Joker'], ['Lena', 'Nerd'], ['Kamil', 'ToughGuy'], ['Maja', 'Geek'],
  ['Oskar', 'Troublemaker'], ['Zosia', 'Quiet'], ['Filip', 'Joker'], ['Julia', 'Nerd'],
  ['Igor', 'ToughGuy'], ['Ola', 'Quiet'], ['Bartek', 'Geek'], ['Ania', 'Nerd'],
  ['Tomek', 'Troublemaker'], ['Emilia', 'Quiet'], ['Leon', 'Joker'], ['Nina', 'Geek'],
];
export const NORMAL_ROSTER: Omit<Student, 'seatId'>[] = entries.map(([name, type], index) => ({
  id: `student-${index + 1}`, name, type, baseNoise: STUDENT_TYPES[type].baseNoise,
  influence: type === 'Troublemaker' ? 4 : type === 'ToughGuy' || type === 'Joker' ? 3 : 1,
  morale: 60 + index % 4 * 5,
}));
