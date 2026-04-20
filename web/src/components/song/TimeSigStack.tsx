interface TimeSigStackProps { num: number; denom: number; size?: "sm" | "md"; }

export function TimeSigStack({ num, denom, size = "md" }: TimeSigStackProps) {
  const fs = size === "sm" ? 13 : 17;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "var(--font-mono)", fontWeight: 700, lineHeight: 1, gap: 1,
    }}>
      <span style={{ fontSize: fs }}>{num}</span>
      <div style={{ width: "100%", height: 1, background: "var(--ink-soft)", margin: "1px 0" }} />
      <span style={{ fontSize: fs }}>{denom}</span>
    </div>
  );
}
