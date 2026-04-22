// web/src/components/rehearsal/RehearsalHeader.tsx
// Thin container — reads store and delegates all rendering to RehearsalHeaderPresentation.

import { useStore } from "../../store";
import { StatusBadge } from "./StatusBadge";
import { RehearsalHeaderPresentation } from "./RehearsalHeaderPresentation";

export function RehearsalHeader() {
  const rehearsalType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);
  return (
    <RehearsalHeaderPresentation
      rehearsalType={rehearsalType}
      statusBadge={<StatusBadge />}
      onOpenTypePicker={() => setTypePickerOpen(true)}
      onOpenMenu={() => setMenuOpen(true)}
    />
  );
}
