import { useState, useRef } from "react";

interface TimeSigInputProps {
  num: number;
  denom: number;
  onChange: (num: number, denom: number) => void;
}

const DENOMS = [1, 2, 4, 8, 16, 32, 64];
const FIELD_FS = 17;

export function TimeSigInput({ num, denom, onChange }: TimeSigInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setDraft(null);
      return;
    }
    const clamped = Math.max(1, Math.min(64, parsed));
    setDraft(null);
    if (clamped !== num) onChange(clamped, denom);
  };

  const fieldStyle = {
    fontFamily: "var(--font-mono)",
    fontWeight: 700 as const,
    fontSize: FIELD_FS,
    lineHeight: 1,
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    outline: "none",
    textAlign: "center" as const,
    width: "3ch",
    padding: 0,
    margin: 0,
    appearance: "none" as const,
    MozAppearance: "textfield" as const,
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      lineHeight: 1, gap: 1,
      padding: "4px 6px",
      border: "1px solid var(--rule)",
      borderRadius: "var(--radius-sm)",
      background: "var(--surface)",
    }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft ?? String(num)}
        aria-label="Time signature numerator"
        onFocus={() => setDraft(String(num))}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => commit(draft ?? String(num))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(draft ?? String(num)); inputRef.current?.blur(); }
          if (e.key === "Escape") { setDraft(null); inputRef.current?.blur(); }
        }}
        style={fieldStyle}
      />
      <div style={{ width: "100%", height: 1, background: "var(--ink-soft)", margin: "1px 0" }} />
      <select
        value={denom}
        aria-label="Time signature denominator"
        onChange={(e) => onChange(num, parseInt(e.target.value, 10))}
        style={{ ...fieldStyle, cursor: "pointer", textAlignLast: "center" as const }}
      >
        {DENOMS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}
