import { calculateNoise } from './noiseCalculator';
import { seededRandom, shuffled } from './random';
import { buildNoiseHint } from './hints';
import type { GameState, GameStatus, LevelDefinition, Student } from './types';
export function getStatus(noise: number, level: LevelDefinition): GameStatus {
  return noise <= level.targetNoise ? 'won' : noise > level.loseNoise ? 'lost' : 'playing';
}
export function getRating(moves: number, level: LevelDefinition) {
  return level.ratings.find(band => moves <= band.maxMoves)?.label ?? 'Total teacher exhaustion';
}
export function swapSeats(students: readonly Student[], firstId: string, targetSeat: number): Student[] {
  const first = students.find(student => student.id === firstId);
  if (!first) return [...students];
  return students.map(student => student.id === firstId ? { ...student, seatId: targetSeat }
    : student.seatId === targetSeat ? { ...student, seatId: first.seatId } : student);
}
function shuffledStudents(level: LevelDefinition, count: number, random: () => number): Student[] {
  const seats = shuffled(level.classroomLayout.seats.map(seat => seat.id), random);
  const pool = level.rosterPool ?? level.roster;
  const roster = count < pool.length ? shuffled(pool, random).slice(0, count) : pool;
  return roster.map((student, i) => ({ ...student, seatId: seats[i] }));
}
export function createGame(level: LevelDefinition, seed?: number): GameState {
  const pool = level.rosterPool ?? level.roster;
  const count = level.studentCount ?? pool.length;
  if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new Error('Invalid student count for this roster.');
  if (count > level.classroomLayout.seats.length) throw new Error('The roster exceeds the available seats.');
  const random = seed === undefined ? Math.random : seededRandom(seed);
  // Rejection sampling avoids a lesson that is already won/lost on arrival.
  for (let attempt = 0; attempt < 2000; attempt++) {
    const students = shuffledStudents(level, count, random);
    if (getStatus(calculateNoise(students, level).totalNoise, level) === 'playing') {
      return { students, moves: 0, selectedId: null, mode: 'welcome', message: '', status: 'playing', seed };
    }
  }
  throw new Error('This level could not generate an active layout. Check its roster and noise thresholds.');
}
export function selectSeat(state: GameState, seatId: number, level: LevelDefinition): GameState {
  if (state.status !== 'playing') return state;
  if (!level.classroomLayout.seats.some(seat => seat.id === seatId)) return state;
  const clicked = state.students.find(student => student.seatId === seatId);
  if (!state.selectedId) return clicked ? { ...state, selectedId: clicked.id, mode: 'student' } : state;
  if (clicked?.id === state.selectedId) return { ...state, selectedId: null, mode: 'welcome' };
  const first = state.students.find(student => student.id === state.selectedId)!;
  const students = swapSeats(state.students, first.id, seatId);
  return { ...state, students, moves: state.moves + 1, selectedId: null, mode: 'system',
    message: clicked ? `${first.name} and ${clicked.name} swapped seats. A fresh start for both.` : `${first.name} moved to an empty seat.`,
    status: getStatus(calculateNoise(students, level).totalNoise, level) };
}
export function useHint(state: GameState, level: LevelDefinition): GameState {
  if (state.status !== 'playing') return state;
  const message = buildNoiseHint(state.students, level, calculateNoise(state.students, level));
  return { ...state, moves: state.moves + level.hintCost, mode: 'hint', message, selectedId: null };
}
