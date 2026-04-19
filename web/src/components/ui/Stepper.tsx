import React from "react";

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
  const dec = () => {
    const next = value - step;
    if (min === undefined || next >= min) onChange(next);
  };
  const inc = () => {
    const next = value + step;
    if (max === undefined || next <= max) onChange(next);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="chip" onClick={dec} style={{ minHeight: 36, padding: "4px 12px" }}>–</button>
        <span style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-hand)",
          fontSize: 18, minWidth: 48, textAlign: "center",
          color: "var(--ink)",
        }}>
          {value}{unit ? <span style={{ fontSize: 13, color: "var(--muted-color)", marginLeft: 2 }}>{unit}</span> : null}
        </span>
        <button className="chip" onClick={inc} style={{ minHeight: 36, padding: "4px 12px" }}>+</button>
      </div>
    </div>
  );
}
