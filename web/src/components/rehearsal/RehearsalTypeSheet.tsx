// web/src/components/rehearsal/RehearsalTypeSheet.tsx
// Bottom sheet for selecting a rehearsal type.

import { useStore } from "../../store";
import type { RehearsalType } from "../../api/client";

export function RehearsalTypeSheet() {
  const typePickerOpen = useStore((s) => s.typePickerOpen);
  const rehearsalTypes = useStore((s) => s.rehearsalTypes);
  const rehearsalType = useStore((s) => s.rehearsalType);
  const setTypePickerOpen = useStore((s) => s.setTypePickerOpen);
  const setRehearsalType = useStore((s) => s.setRehearsalType);

  if (!typePickerOpen) return null;

  const handleSelect = (type: RehearsalType) => {
    setRehearsalType(type);
    setTypePickerOpen(false);
  };

  return (
    <div
      data-testid="type-picker-overlay"
      onClick={() => setTypePickerOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        data-testid="type-picker-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "70vh",
          background: "var(--surface-raised)",
          borderRadius: "16px 16px 0 0",
          overflowY: "auto",
          padding: 16,
        }}
      >
        {/* Grip bar */}
        <div style={{ width: 36, height: 4, background: "var(--faint)", margin: "0 auto 14px", borderRadius: 2 }} />

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: "var(--ink)" }}>
          Rehearsal Type
        </h2>

        {rehearsalTypes.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading types…</p>
        )}

        {rehearsalTypes.map((type) => {
          const isActive = rehearsalType?.id === type.id;
          return (
            <button
              key={type.id}
              data-testid={`type-card-${type.id}`}
              onClick={() => handleSelect(type)}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                width: "100%",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: isActive ? "var(--accent-soft)" : "var(--surface)",
                borderColor: isActive ? "var(--accent)" : "var(--rule)",
                borderWidth: "1px",
                borderStyle: "solid",
                fontFamily: "var(--font-body)",
              }}
            >
              <span style={{ fontSize: 20 }}>{type.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{type.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{type.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
