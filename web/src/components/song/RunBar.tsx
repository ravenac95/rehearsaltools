interface RunBarProps {
  onRun: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function RunBar({ onRun, disabled, loading }: RunBarProps) {
  return (
    <div style={{
      position: "sticky", bottom: 0,
      background: "var(--surface-alt)",
      borderTop: "1px solid var(--rule)",
      padding: "12px var(--spacing-md)",
      display: "flex", justifyContent: "center",
    }}>
      <button
        className="primary"
        onClick={onRun}
        disabled={disabled || loading}
        style={{ width: "100%", maxWidth: 360, fontSize: 18, minHeight: 56 }}
      >
        {loading ? "Writing…" : "RUN ▸ play w/ click"}
      </button>
    </div>
  );
}
