// web/src/components/rehearsal/RehearsalHeaderPresentation.tsx
// Pure presentation component for the sticky rehearsal header.

import type { ReactNode } from "react";
import type { RehearsalType } from "../../api/client";

export interface RehearsalHeaderPresentationProps {
  rehearsalType: RehearsalType | null;
  statusBadge: ReactNode; // slot for <StatusBadge /> in production or <StatusBadgePresentation .../> in stories
  onOpenTypePicker: () => void;
  onOpenMenu: () => void;
}

export function RehearsalHeaderPresentation({
  rehearsalType,
  statusBadge,
  onOpenTypePicker,
  onOpenMenu,
}: RehearsalHeaderPresentationProps) {
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
        onClick={onOpenTypePicker}
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
        {rehearsalType ? `${rehearsalType.emoji} ${rehearsalType.name}` : "—"} ▾
      </button>

      {/* Status badge */}
      {statusBadge}

      {/* Hamburger button */}
      <button
        data-testid="hamburger-button"
        onClick={onOpenMenu}
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
