import { useRef } from "react";
import type { SongForm } from "../../api/client";

interface FormTabsProps {
  forms: SongForm[];
  activeFormId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete?: (id: string) => void;
}

const DOUBLE_TAP_MS = 300;

export function FormTabs({ forms, activeFormId, onSelect, onCreate, onDelete }: FormTabsProps) {
  const lastTap = useRef<{ id: string; t: number } | null>(null);

  const handleTouchEnd = (id: string) => (e: React.TouchEvent) => {
    if (!onDelete) return;
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === id && now - prev.t < DOUBLE_TAP_MS) {
      e.preventDefault();
      lastTap.current = null;
      onDelete(id);
    } else {
      lastTap.current = { id, t: now };
    }
  };

  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto", padding: "8px 0",
      borderBottom: "1px solid var(--rule)",
    }}>
      {forms.map((f) => {
        const active = f.id === activeFormId;
        return (
          <button
            key={f.id}
            className={active ? "chip solid" : "chip"}
            onClick={() => onSelect(f.id)}
            onDoubleClick={onDelete ? () => onDelete(f.id) : undefined}
            onTouchEnd={onDelete ? handleTouchEnd(f.id) : undefined}
            title={onDelete ? "Double-click or double-tap to delete" : undefined}
            style={{ flexShrink: 0 }}
          >
            {f.name}
          </button>
        );
      })}
      <button className="chip ghost" onClick={onCreate}
        style={{ flexShrink: 0 }}>+</button>
    </div>
  );
}
