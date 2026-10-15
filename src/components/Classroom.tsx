import type { LevelDefinition, PairEffect, Student } from '../game/types';
import { Seat } from './Seat';
import { ComputerWorkstation } from './ComputerWorkstation';
interface Props { students: Student[]; pairs: PairEffect[]; level: LevelDefinition; selectedId: string | null; disabled: boolean; onSeat: (id: number) => void }
export function Classroom({ students, pairs, level, selectedId, disabled, onSeat }: Props) {
  const layout = level.classroomLayout;
  const point = (id: number) => {
    const seat = layout.seats.find(seat => seat.id === id)!;
    return { x: (seat.x + seat.width * .5) * 4, y: (seat.y + seat.height * .62) * 4 };
  };
  return <section className={`classroom layout-${layout.type}`} aria-label="Classroom seating plan" data-layout={layout.type}>
    <div className="room-top"><div className="board"><span>Today's lesson</span><strong>A little less conversation.</strong><i>More concentration.</i></div><div className="door" aria-hidden="true">EXIT <span>•</span></div></div>
    <div className="teacher-desk" aria-hidden="true"><span className="book"/><span className="mug">☕</span><small>TEACHER</small></div>
    <div className="windows" aria-hidden="true"><i/><i/><i/></div>
    <div className="room-aside" aria-hidden="true">WINDOW SIDE <span>+1 noise</span></div>
    <div className="front-row-note">FRONT ROW <span>−2 noise / student</span></div>
    <div className="seating">
      {layout.workstations.map(workstation => <ComputerWorkstation key={workstation.id} workstation={workstation} />)}
      <svg className="relationship-lines" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">
        {pairs.map(pair => { const a = point(pair.first.seatId), b = point(pair.second.seatId); return <g key={`${pair.first.id}-${pair.second.id}`} className={`${pair.noise > 0 ? 'line-problem' : 'line-helpful'} ${pair.workstationNoise ? 'line-workstation' : ''}`} data-neighbour-noise={pair.neighbourNoise} data-workstation-noise={pair.workstationNoise}>
          <title>{`Neighbours: ${pair.neighbourNoise}; workstation: ${pair.workstationNoise}; total: ${pair.noise}`}</title>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="8"/><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3}>{pair.noise > 0 ? '+' : ''}{pair.noise}</text>
        </g>; })}
      </svg>
      {layout.seats.map(seat => {
        const seatId = seat.id;
        const student = students.find(student => student.seatId === seatId);
        const neighbours = pairs.filter(pair => pair.first.id === student?.id || pair.second.id === student?.id);
        return <Seat key={seatId} seat={seat} student={student} selected={!!student && selectedId === student.id} problem={neighbours.some(pair => pair.noise > 0)} helpful={neighbours.some(pair => pair.noise < 0)} disabled={disabled} onClick={() => onSeat(seatId)}/>;
      })}
    </div>
    <div className="room-footer"><span><i className="dot red"/> Noisy neighbours</span><span><i className="dot green"/> Calming neighbours</span><span>Click two students to swap</span></div>
  </section>;
}
