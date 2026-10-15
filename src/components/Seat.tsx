import { Student } from './Student';
import type { Student as StudentData } from '../game/types';
interface Props { seatId: number; student?: StudentData; selected: boolean; problem: boolean; helpful: boolean; disabled: boolean; onClick: () => void }
export function Seat({ seatId, student, selected, problem, helpful, disabled, onClick }: Props) {
  return <button className={`seat ${selected ? 'selected' : ''}`} data-seat={seatId} aria-label={student ? `${student.name}, ${student.type}, seat ${seatId + 1}` : `Empty seat ${seatId + 1}`} aria-pressed={selected} disabled={disabled} onClick={onClick}>
    <span className="seat-number">{String(seatId + 1).padStart(2, '0')}</span>
    <span className="desk" aria-hidden="true"><i /></span>
    {student ? <Student student={student} problem={problem} helpful={helpful} /> : <span className="empty-seat">Empty</span>}
  </button>;
}
