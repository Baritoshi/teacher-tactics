export type StudentType = 'Nerd' | 'Joker' | 'ToughGuy' | 'Geek' | 'Troublemaker' | 'Quiet';
export interface Student { id: string; name: string; type: StudentType; baseNoise: number; influence: number; morale: number; seatId: number }
export interface RelationshipRule { types: readonly [StudentType, StudentType]; noise: number }
export type RelationType = 'Adjacent' | 'GapOne' | 'SameWorkstation';
export type RelationshipSource = 'adjacent' | 'gap-one' | 'workstation';
export interface SpatialRelation { seatA: number; seatB: number; relationType: RelationType; viaSeatId?: number }
export interface RelationshipEffect {
  studentAId: string; studentBId: string; relationType: RelationType;
  noiseDelta: number; source: RelationshipSource; viaSeatId?: number;
}
// A display aggregate derived from RelationshipEffect, never calculated separately in UI.
export interface PairEffect { first: Student; second: Student; noise: number; neighbourNoise: number; distantNoise: number; workstationNoise: number; effects: RelationshipEffect[] }
export type Orientation = 'Up' | 'Down' | 'Left' | 'Right';
// Coordinates and dimensions are percentages of the seating area.
export interface SeatDefinition {
  id: number; x: number; y: number; width: number; height: number;
  orientation: Orientation; workstationId?: string; frontRow?: boolean; windowSide?: boolean;
  gridPosition?: { row: number; column: number };
}
export interface ComputerWorkstation {
  id: string; position: { x: number; y: number }; orientation: Orientation;
  seatA: number; seatB: number;
}
export interface ClassroomLayout {
  type: 'standardGrid' | 'computerUShape' | 'custom';
  seats: readonly SeatDefinition[];
  neighbourPairs: readonly (readonly [number, number])[];
  workstations: readonly ComputerWorkstation[];
  adjacencyDescription: string;
}
export interface RatingBand { maxMoves: number; label: string }
export interface LevelDefinition {
  id: string; name: string; classroomLayout: ClassroomLayout; targetNoise: number; loseNoise: number;
  description?: string;
  baseNoiseModifiers?: Readonly<Partial<Record<StudentType, number>>>;
  positivePairModifier?: number;
  studentCount?: number;
  distantInteractionMultiplier?: number;
  hintCost: number; frontRowModifier: number; windowModifier: number;
  roster: readonly Omit<Student, 'seatId'>[]; relationships: readonly RelationshipRule[];
  workstationRelationships?: readonly RelationshipRule[];
  ratings: readonly RatingBand[];
}
export interface NoiseBreakdown {
  baseNoise: number; seatModifiers: number; adjacentPairEffects: number; distantPairEffects: number;
  /** Compatibility alias for adjacentPairEffects; excludes distant/workstation effects. */
  pairEffects: number;
  workstationEffects: number; totalNoise: number; effects: RelationshipEffect[]; pairs: PairEffect[];
}
export type GameStatus = 'playing' | 'won' | 'lost';
export type DialogMode = 'welcome' | 'student' | 'hint' | 'analysis' | 'legend' | 'system';
export interface GameState { students: Student[]; moves: number; selectedId: string | null; mode: DialogMode; message: string; status: GameStatus; seed?: number }
