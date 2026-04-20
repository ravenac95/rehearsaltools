import type { SongForm } from "../../api/client";

interface FormTabsProps {
  forms: SongForm[];
  activeFormId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function FormTabs({ forms, activeFormId, onSelect, onCreate }: FormTabsProps) {
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
