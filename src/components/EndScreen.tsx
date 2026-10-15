import { useEffect, useRef } from 'react';
import { getRating } from '../game/gameUtils';
import type { GameStatus, LevelDefinition } from '../game/types';
export function EndScreen({ status, noise, moves, level, onReset }: { status: GameStatus; noise: number; moves: number; level: LevelDefinition; onReset: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (status !== 'playing') button.current?.focus(); }, [status]);
  if (status === 'playing') return null;
  return <div className="end-backdrop"><section className="end-screen" role="dialog" aria-modal="true" aria-labelledby="end-title"><span className="end-symbol">{status === 'won' ? '✦' : '!'}</span><span className="eyebrow">LESSON COMPLETE</span><h2 id="end-title">{status === 'won' ? 'Class under control!' : 'Lesson lost!'}</h2><p>{status === 'won' ? `Rating: ${getRating(moves, level)}` : 'The class is out of control.'}</p><div className="end-stats"><span>Final noise<strong>{noise}</strong></span><span>Moves<strong>{moves}</strong></span></div><button ref={button} onClick={onReset}>Try Again <span>↻</span></button></section></div>;
}
