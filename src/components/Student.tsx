import { STUDENT_TYPES } from '../game/students';
import type { Student as StudentData } from '../game/types';
export function Student({ student, problem, helpful }: { student: StudentData; problem: boolean; helpful: boolean }) {
  const type = STUDENT_TYPES[student.type];
  return <span className="student" style={{ '--student-color': type.color } as React.CSSProperties}>
    <span className="student-name">{student.name}</span>
    <span className={`student-token ${problem ? 'problem' : ''} ${helpful ? 'helpful' : ''}`}><span className="token-face">{type.short}</span></span>
    <span className="student-type">{student.type}</span>
  </span>;
}
