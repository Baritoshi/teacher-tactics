import type { ArchetypeRegistry, LevelDefinition, StudentArchetypeDefinition } from './types';

export const STUDENT_ARCHETYPES: ArchetypeRegistry = {
  Nerd: { id: 'Nerd', displayName: 'Nerd', color: '#76a46b', shortCode: 'N', baseNoise: 1, influence: 1, description: 'A little focus goes a long way.', traits: ['focused'], behaviourRules: [] },
  Joker: { id: 'Joker', displayName: 'Joker', color: '#e7bc50', shortCode: 'J', baseNoise: 4, influence: 3, description: 'Always has one more joke.', traits: ['talkative'], behaviourRules: [] },
  ToughGuy: { id: 'ToughGuy', displayName: 'ToughGuy', color: '#d16b5e', shortCode: 'T', baseNoise: 5, influence: 3, description: 'Best kept away from a rival.', traits: ['competitive'], behaviourRules: [] },
  Geek: { id: 'Geek', displayName: 'Geek', color: '#64b6c3', shortCode: 'G', baseNoise: 2, influence: 1, description: 'Too much to talk about with another Geek.', traits: ['enthusiastic'], behaviourRules: [] },
  Troublemaker: { id: 'Troublemaker', displayName: 'Troublemaker', color: '#a38ac3', shortCode: '!', baseNoise: 6, influence: 4, description: 'A Joker is the perfect partner in crime.', traits: ['disruptive'], behaviourRules: [] },
  Quiet: { id: 'Quiet', displayName: 'Quiet', color: '#a3aaa5', shortCode: 'Q', baseNoise: 0, influence: 1, description: 'A calming neighbour for a Nerd.', traits: ['calming'], behaviourRules: [] },
  PhoneAddict: {
    id: 'PhoneAddict', displayName: 'Phone Addict', shortCode: 'P', baseNoise: 2, influence: 1, color: '#858fbd',
    description: 'Keeps checking their phone and becomes more distracted when sitting away from the teacher.', traits: ['seat-sensitive'],
    behaviourRules: [
      { id: 'phone-front', kind: 'seat-condition', condition: 'front-row', contribution: { noise: -1 }, description: 'Near the teacher: −1 noise.' },
      { id: 'phone-back', kind: 'seat-condition', condition: 'back-row', contribution: { noise: 3 }, description: 'Away from the teacher: +3 noise.', hint: 'Move {name} closer to the teacher. The current seat adds +{noise} noise.' },
      { id: 'phone-window', kind: 'seat-condition', condition: 'window', contribution: { noise: 1 }, description: 'Distracted by the window: +1 noise.', hint: 'Move {name} away from the window. The current seat adds +{noise} noise.' },
    ],
  },
  GoodOnlyAlone: {
    id: 'GoodOnlyAlone', displayName: 'Good Only Alone', shortCode: 'A', baseNoise: 1, influence: 1, color: '#609b91',
    description: 'Works quietly when left alone, but becomes distracted when someone sits directly next to them.', traits: ['needs-space'],
    behaviourRules: [
      { id: 'alone', kind: 'adjacent-count', min: 0, max: 0, contribution: { noise: -2 }, description: 'No occupied adjacent seats: −2 noise.' },
      { id: 'not-alone', kind: 'adjacent-count', min: 1, contribution: { noise: 2 }, description: 'One or more occupied adjacent seats: +2 noise.', hint: '{name} works better with some space. Try moving them away from occupied adjacent seats (+{noise} noise).' },
    ],
  },
  Gossip: { id: 'Gossip', displayName: 'Gossip', shortCode: 'G', baseNoise: 2, influence: 1, color: '#c48d9f', description: 'A particular gossip partner can make this student especially talkative.', traits: ['specific-partner'], behaviourRules: [] },
  Sleeper: {
    id: 'Sleeper', displayName: 'Sleeper', shortCode: 'Z', baseNoise: 0, influence: 1, color: '#859aa9',
    description: 'Very quiet, but performs poorly when placed too close to the front.', traits: ['engagement-sensitive'],
    behaviourRules: [
      { id: 'sleep-front', kind: 'seat-condition', condition: 'front-row', contribution: { engagement: -3 }, description: 'Front row: −3 engagement.' },
      { id: 'sleep-middle', kind: 'seat-condition', condition: 'middle-row', contribution: { engagement: -1 }, description: 'Middle row: −1 engagement.' },
      { id: 'sleep-back', kind: 'seat-condition', condition: 'back-row', contribution: { engagement: 0 }, description: 'Back row: no engagement penalty.' },
    ],
  },
};

export const getArchetypes = (level?: Pick<LevelDefinition, 'archetypes'>): ArchetypeRegistry => level?.archetypes ?? STUDENT_ARCHETYPES;
export function getArchetype(id: string, level?: Pick<LevelDefinition, 'archetypes'>): StudentArchetypeDefinition {
  const definition = getArchetypes(level)[id];
  if (!definition) throw new Error(`Unknown student archetype: ${id}`);
  return definition;
}
