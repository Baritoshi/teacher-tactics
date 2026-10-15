export type StudentType = 'Nerd' | 'Joker' | 'ToughGuy' | 'Geek' | 'Troublemaker' | 'Quiet';
export interface Student { id: string; name: string; type: StudentType; baseNoise: number; influence: number; morale: number; seatId: number }
export interface RelationshipRule { types: readonly [StudentType, StudentType]; noise: number }
export interface PairEffect { first: Student; second: Student; noise: number }
export interface RatingBand { maxMoves: number; label: string }
export interface LevelDefinition {
  id: string; name: string; rows: number; columns: number; targetNoise: number; loseNoise: number;
  description?: string;
  baseNoiseModifiers?: Readonly<Partial<Record<StudentType, number>>>;
  hintCost: number; frontRowModifier: number; windowModifier: number;
  roster: readonly Omit<Student, 'seatId'>[]; relationships: readonly RelationshipRule[];
  ratings: readonly RatingBand[];
}
export interface NoiseBreakdown { baseNoise: number; seatModifiers: number; pairEffects: number; totalNoise: number; pairs: PairEffect[] }
export type GameStatus = 'playing' | 'won' | 'lost';
export type DialogMode = 'welcome' | 'student' | 'hint' | 'analysis' | 'legend' | 'system';
export interface GameState { students: Student[]; moves: number; selectedId: string | null; mode: DialogMode; message: string; status: GameStatus }
