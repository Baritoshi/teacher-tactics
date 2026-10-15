import { calculateNoise } from './noiseCalculator';
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
function shuffledStudents(level: LevelDefinition): Student[] {
  const seats = Array.from({ length: level.rows * level.columns }, (_, i) => i);
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  return level.roster.map((student, i) => ({ ...student, seatId: seats[i] }));
}
export function createGame(level: LevelDefinition): GameState {
  // Rejection sampling avoids a lesson that is already won/lost on arrival.
  for (let attempt = 0; attempt < 2000; attempt++) {
    const students = shuffledStudents(level);
    if (getStatus(calculateNoise(students, level).totalNoise, level) === 'playing') {
      return { students, moves: 0, selectedId: null, mode: 'welcome', message: '', status: 'playing' };
    }
  }
  throw new Error('This level could not generate an active layout. Check its roster and noise thresholds.');
}
export function selectSeat(state: GameState, seatId: number, level: LevelDefinition): GameState {
  if (state.status !== 'playing') return state;
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
  const message = pair ? `Separate ${pair.first.name} and ${pair.second.name}.\n${pair.first.type} + ${pair.second.type}: +${pair.noise} noise.`
    : 'No problematic neighbours remain. Try moving louder students to the front, or seating a Nerd beside a Quiet student.';
  return { ...state, moves: state.moves + level.hintCost, mode: 'hint', message, selectedId: null };
}
