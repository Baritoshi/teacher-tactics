import { calculateNoise } from './noiseCalculator';
import { seededRandom, shuffled } from './random';
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
  const roster = count < level.roster.length ? shuffled(level.roster, random).slice(0, count) : level.roster;
  return roster.map((student, i) => ({ ...student, seatId: seats[i] }));
}
export function createGame(level: LevelDefinition, seed?: number): GameState {
  const count = level.studentCount ?? level.roster.length;
  if (!Number.isInteger(count) || count < 1 || count > level.roster.length) throw new Error('Invalid student count for this roster.');
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
  const pair = calculateNoise(state.students, level).pairs.filter(pair => pair.noise > 0).sort((a, b) => b.noise - a.noise)[0];
  const message = pair?.distantNoise ? `Move one of these students or block the gap.\n${pair.first.name} and ${pair.second.name} are still talking across an empty desk: +${pair.distantNoise} noise.`
    : pair ? `Separate ${pair.first.name} and ${pair.second.name}.\n${pair.first.type} + ${pair.second.type}: +${pair.noise} noise.${pair.workstationNoise ? ` Neighbours: +${pair.neighbourNoise}; workstation: +${pair.workstationNoise}.` : ''}`
    : 'No problematic neighbours remain. Try moving louder students to the front, or seating a Nerd beside a Quiet student.';
  return { ...state, moves: state.moves + level.hintCost, mode: 'hint', message, selectedId: null };
}
