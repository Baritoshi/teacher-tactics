import { Student } from './Student';
import type { SeatDefinition, Student as StudentData } from '../game/types';
interface Props { seat: SeatDefinition; student?: StudentData; selected: boolean; problem: boolean; helpful: boolean; disabled: boolean; onClick: () => void }
export function Seat({ seat, student, selected, problem, helpful, disabled, onClick }: Props) {
  const seatId = seat.id;
  return <button className={`seat ${seat.workstationId ? 'computer-seat' : ''} facing-${seat.orientation.toLowerCase()} ${selected ? 'selected' : ''}`}
    style={{ left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.width}%`, height: `${seat.height}%` }}
    data-seat={seatId} data-workstation-id={seat.workstationId} data-orientation={seat.orientation}
    aria-label={student ? `${student.name}, ${student.type}, seat ${seatId + 1}` : `Empty seat ${seatId + 1}`}
    title={seat.workstationId ? `Computer ${seat.workstationId} · Facing ${seat.orientation}` : undefined}
    aria-pressed={selected} disabled={disabled} onClick={onClick}>
    <span className="seat-number">{String(seatId + 1).padStart(2, '0')}</span>
    {!seat.workstationId && <span className="desk" aria-hidden="true"><i /></span>}
    {student ? <Student student={student} problem={problem} helpful={helpful} /> : <span className="empty-seat">Empty</span>}
  </button>;
}
