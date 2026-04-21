// web/src/components/rehearsal/RehearsalHeader.tsx
// Sticky header with rehearsal type pill, status badge, and hamburger button.

import { useStore } from "../../store";
import { StatusBadge } from "./StatusBadge";

export function RehearsalHeader() {
  const rehearsalType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);

  return (
    <div
      data-testid="rehearsal-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderBottom: "1px solid var(--rule)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Rehearsal type pill */}
      <button
        data-testid="rehearsal-type-pill"
        onClick={() => setTypePickerOpen(true)}
        style={{
          flexShrink: 0,
          background: "var(--surface-alt)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-pill)",
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          color: "var(--ink)",
          whiteSpace: "nowrap",
        }}
      >
        {rehearsalType?.emoji ?? "🎸"} {rehearsalType?.name ?? "Full Band"} ▾
      </button>

      {/* Status badge */}
      <StatusBadge />

      {/* Hamburger button */}
      <button
        data-testid="hamburger-button"
        onClick={() => setMenuOpen(true)}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          fontSize: 22,
          cursor: "pointer",
          color: "var(--ink)",
          padding: "4px",
          lineHeight: 1,
        }}
      >
        ☰
      </button>
    </div>
  );
}
