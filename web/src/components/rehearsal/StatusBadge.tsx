// web/src/components/rehearsal/StatusBadge.tsx
// Thin container — reads store and delegates all rendering to StatusBadgePresentation.

import { useStore } from "../../store";
import { StatusBadgePresentation } from "./StatusBadgePresentation";

export function StatusBadge() {
  const status = useStore((s) => s.rehearsalStatus);
  const position = useStore((s) => s.transport.position ?? 0);
  const segmentStart = useStore((s) => s.currentSegmentStart);
  const setCategory = useStore((s) => s.setCategory);
  return (
    <StatusBadgePresentation
      status={status}
      position={position}
      segmentStart={segmentStart}
      onSetCategory={setCategory}
    />
  );
}
