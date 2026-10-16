import type { Student as StudentData, StudentArchetypeDefinition } from '../game/types';
export function Student({ student, archetype: type, problem, helpful }: { student: StudentData; archetype: StudentArchetypeDefinition; problem: boolean; helpful: boolean }) {
  return <span className="student" style={{ '--student-color': type.color } as React.CSSProperties}>
    <span className="student-name">{student.name}</span>
    <span className={`student-token ${problem ? 'problem' : ''} ${helpful ? 'helpful' : ''}`}><span className="token-face">{type.shortCode}</span></span>
    <span className="student-type">{type.displayName}</span>
  </span>;
}
