import type { ComputerWorkstation as WorkstationData } from '../game/types';

// Replace this visual shell with final assets; layout and game rules stay independent.
export function ComputerWorkstation({ workstation }: { workstation: WorkstationData }) {
  return <div className={`computer-workstation facing-${workstation.orientation.toLowerCase()}`}
    data-workstation={workstation.id} data-orientation={workstation.orientation}
    style={{ left: `${workstation.position.x}%`, top: `${workstation.position.y}%` }} aria-hidden="true">
    <span className="computer-monitor"><i /></span><span className="computer-keyboard" />
    <span className="computer-number">PC {workstation.seatA / 2 + 1}</span>
  </div>;
}
