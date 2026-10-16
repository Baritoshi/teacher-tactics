import type { GameState, LevelDefinition, NoiseBreakdown } from '../game/types';

export function getDevelopmentSeed(): number | undefined {
  if (!import.meta.env.DEV || typeof window === 'undefined') return undefined;
  const value = new URLSearchParams(window.location.search).get('seed');
  if (value === null || !/^-?\d+$/.test(value)) return undefined;
  const seed = Number(value);
  return Number.isSafeInteger(seed) ? seed : undefined;
}

export function DevInfo({ level, state, breakdown }: { level: LevelDefinition; state: GameState; breakdown: NoiseBreakdown }) {
  if (!import.meta.env.DEV || typeof window === 'undefined' || new URLSearchParams(window.location.search).get('debug') !== '1') return null;
  const occupied = new Set(state.students.map(student => student.seatId));
  const { pairs: _pairs, effects, ...noise } = breakdown;
  return <details className="dev-info"><summary>Development: {level.id} · seed {state.seed ?? 'random (unseeded)'}</summary>
    <pre>{JSON.stringify({ level: level.id, seed: state.seed ?? null,
      occupiedSeats: [...occupied].sort((a, b) => a - b),
      emptySeats: level.classroomLayout.seats.filter(seat => !occupied.has(seat.id)).map(seat => seat.id),
      noiseBreakdown: noise, detectedRelationships: effects,
    }, null, 2)}</pre>
  </details>;
}
