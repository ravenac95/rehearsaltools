// web/src/components/rehearsal/RehearsalTypeSheet.tsx
// Thin container — reads store and delegates all rendering to RehearsalTypeSheetPresentation.

import { useStore } from "../../store";
import { RehearsalTypeSheetPresentation } from "./RehearsalTypeSheetPresentation";
import type { RehearsalType } from "../../api/client";

export function RehearsalTypeSheet() {
  const open = useStore((s) => s.typePickerOpen);
  const types = useStore((s) => s.rehearsalTypes);
  const currentType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setRehearsalType = useStore((s) => s.setRehearsalType);
  return (
    <RehearsalTypeSheetPresentation
      open={open}
      types={types}
      selectedTypeId={currentType?.id ?? null}
      onClose={() => setTypePickerOpen(false)}
      onSelect={(t: RehearsalType) => {
        setRehearsalType(t);
        setTypePickerOpen(false);
      }}
    />
  );
}
