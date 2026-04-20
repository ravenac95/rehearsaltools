import React, { useState, useRef } from "react";

interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;        // e.g. "BPM" displayed after value
  mono?: boolean;       // use --font-mono for the value
}

export function Stepper({ label, value, min, max, step = 1, onChange, unit, mono = false }: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const dec = () => {
    const next = value - step;
    if (min === undefined || next >= min) onChange(next);
  };
  const inc = () => {
    const next = value + step;
    if (max === undefined || next <= max) onChange(next);
  };

  const commitDraft = (d: string) => {
    const parsed = parseInt(d, 10);
    if (isNaN(parsed)) {
      onChange(clamp(value));
    } else {
      onChange(clamp(parsed));
    }
    setDraft(null);
  };

  const handleFocus = () => {
    setDraft(String(value));
  };

  const handleBlur = () => {
    if (draft !== null) {
      commitDraft(draft);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Escape"];
    if (e.key === "Enter") {
      commitDraft(draft ?? String(value));
      inputRef.current?.blur();
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      setDraft(null);
      inputRef.current?.blur();
      e.preventDefault();
      return;
    }
    if (/^\d$/.test(e.key)) return;
    if (allowed.includes(e.key)) return;
    e.preventDefault();
  };

  const displayValue = draft !== null ? draft : String(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="chip" onClick={dec} style={{ minHeight: 36, padding: "4px 12px" }}>–</button>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            fontFamily: mono ? "var(--font-mono)" : "var(--font-hand)",
            fontSize: 18,
            minWidth: 48,
            textAlign: "center",
            color: "var(--ink)",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
          }}
        />
        {unit ? <span style={{ fontSize: 13, color: "var(--muted-color)", marginLeft: 2 }}>{unit}</span> : null}
        <button className="chip" onClick={inc} style={{ minHeight: 36, padding: "4px 12px" }}>+</button>
      </div>
    </div>
  );
}
