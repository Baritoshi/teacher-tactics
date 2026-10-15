import type { LevelDefinition, PairEffect, Student } from '../game/types';
import { Seat } from './Seat';
interface Props { students: Student[]; pairs: PairEffect[]; level: LevelDefinition; selectedId: string | null; disabled: boolean; onSeat: (id: number) => void }
export function Classroom({ students, pairs, level, selectedId, disabled, onSeat }: Props) {
  const point = (seat: number) => ({ x: (seat % level.columns + .5) * 100, y: (Math.floor(seat / level.columns) + .58) * 100 });
  return <section className="classroom" aria-label="Classroom seating plan">
    <div className="room-top"><div className="board"><span>Today's lesson</span><strong>A little less conversation.</strong><i>More concentration.</i></div><div className="door" aria-hidden="true">EXIT <span>•</span></div></div>
    <div className="teacher-desk" aria-hidden="true"><span className="book"/><span className="mug">☕</span><small>TEACHER</small></div>
    <div className="windows" aria-hidden="true"><i/><i/><i/></div>
    <div className="room-aside" aria-hidden="true">WINDOW SIDE <span>+1 noise</span></div>
    <div className="front-row-note">FRONT ROW <span>−2 noise / student</span></div>
    <div className="seating" style={{ gridTemplateColumns: `repeat(${level.columns}, 1fr)` }}>
      <svg className="relationship-lines" viewBox={`0 0 ${level.columns * 100} ${level.rows * 100}`} preserveAspectRatio="none" aria-hidden="true">
        {pairs.map(pair => { const a = point(pair.first.seatId), b = point(pair.second.seatId); return <g key={`${pair.first.id}-${pair.second.id}`} className={pair.noise > 0 ? 'line-problem' : 'line-helpful'}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="8"/><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3}>{pair.noise > 0 ? '+' : ''}{pair.noise}</text>
        </g>; })}
      </svg>
      {Array.from({ length: level.rows * level.columns }, (_, seatId) => {
        const student = students.find(student => student.seatId === seatId);
        const neighbours = pairs.filter(pair => pair.first.id === student?.id || pair.second.id === student?.id);
        return <Seat key={seatId} seatId={seatId} student={student} selected={!!student && selectedId === student.id} problem={neighbours.some(pair => pair.noise > 0)} helpful={neighbours.some(pair => pair.noise < 0)} disabled={disabled} onClick={() => onSeat(seatId)}/>;
      })}
    </div>
    <div className="room-footer"><span><i className="dot red"/> Noisy neighbours</span><span><i className="dot green"/> Calming neighbours</span><span>Click two students to swap</span></div>
  </section>;
}
