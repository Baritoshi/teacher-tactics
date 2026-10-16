// Registry keys, deliberately open so adding an archetype needs no enum edit.
export type StudentType = string;
export interface StudentInstance { id: string; name: string; archetypeId: string; seatId: number; relationshipTags?: readonly string[]; morale?: number }
export type Student = StudentInstance;
export type SeatCondition = 'front-row' | 'back-row' | 'middle-row' | 'window';
export interface MetricContribution { noise?: number; engagement?: number }
interface BehaviourRuleBase { id: string; contribution: MetricContribution; description: string; hint?: string }
export type BehaviourRule = BehaviourRuleBase & (
  { kind: 'seat-condition'; condition: SeatCondition } |
  { kind: 'adjacent-count'; min: number; max?: number }
);
export interface StudentArchetypeDefinition {
  id: string; displayName: string; shortCode: string; description: string;
  baseNoise: number; color: string; influence: number;
  traits: readonly string[]; behaviourRules: readonly BehaviourRule[];
}
export type ArchetypeRegistry = Readonly<Record<string, StudentArchetypeDefinition>>;
export interface StudentEffect {
  studentId: string; ruleId: string; effectType: BehaviourRule['kind'];
  noiseDelta: number; engagementDelta: number;
  source: 'seat-position' | 'alone-condition'; description: string; hint?: string;
}
export interface SpecificRelationship {
  id: string; studentAId: string; studentBId: string; type: string; displayName: string;
  adjacentNoise: number; gapOneNoise?: number; hint?: string;
}
export interface EngagementBreakdown { base: number; archetypeEffects: number; total: number }
export interface StudentContribution {
  baseNoise: number; seatModifiers: number; archetypeEffects: number;
  sharedRelationshipNoise: number; totalNoise: number; engagement: number;
}
export interface RelationshipRule { types: readonly [StudentType, StudentType]; noise: number }
export type RelationType = 'Adjacent' | 'GapOne' | 'SameWorkstation';
export type RelationshipSource = 'adjacent' | 'gap-one' | 'workstation' | 'specific-relationship';
export interface SpatialRelation { seatA: number; seatB: number; relationType: RelationType; viaSeatId?: number }
export interface RelationshipEffect {
  studentAId: string; studentBId: string; relationType: RelationType;
  noiseDelta: number; source: RelationshipSource; viaSeatId?: number;
  relationshipId?: string; description?: string; hint?: string;
}
// A display aggregate derived from RelationshipEffect, never calculated separately in UI.
export interface PairEffect { first: Student; second: Student; noise: number; neighbourNoise: number; distantNoise: number; workstationNoise: number; specificNoise: number; effects: RelationshipEffect[] }
export type Orientation = 'Up' | 'Down' | 'Left' | 'Right';
// Coordinates and dimensions are percentages of the seating area.
export interface SeatDefinition {
  id: number; x: number; y: number; width: number; height: number;
  orientation: Orientation; workstationId?: string; frontRow?: boolean; backRow?: boolean; windowSide?: boolean;
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
  experimental?: boolean;
  archetypes?: ArchetypeRegistry;
  rosterPool?: readonly Omit<Student, 'seatId'>[];
  specificRelationships?: readonly SpecificRelationship[];
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
  baseNoise: number; seatModifiers: number; archetypeSeatEffects: number; adjacentPairEffects: number; distantPairEffects: number;
  /** Compatibility alias for adjacentPairEffects; excludes distant/workstation effects. */
  pairEffects: number;
  specificRelationshipEffects: number; workstationEffects: number; totalNoise: number; effects: RelationshipEffect[]; pairs: PairEffect[];
  studentEffects: StudentEffect[]; studentContributions: Record<string, StudentContribution>;
  engagement: EngagementBreakdown; hasEngagement: boolean;
}
export type GameStatus = 'playing' | 'won' | 'lost';
export type DialogMode = 'welcome' | 'student' | 'hint' | 'analysis' | 'legend' | 'system';
export interface GameState { students: Student[]; moves: number; selectedId: string | null; mode: DialogMode; message: string; status: GameStatus; seed?: number }
