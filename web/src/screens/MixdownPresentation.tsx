interface MixdownPresentationProps {
  outputDir: string;
  running: boolean;
  regionCount: number;
  onOutputDirChange: (value: string) => void;
  onRender: () => void;
}

export function MixdownPresentation({
  outputDir,
  running,
  regionCount,
  onOutputDirChange,
  onRender,
}: MixdownPresentationProps) {
  return (
    <>
      <h2>Mixdown</h2>
      <div className="card">
        <label>Output directory (optional; leaves REAPER's current setting when blank)</label>
        <input
          type="text"
          value={outputDir}
          onChange={(e) => onOutputDirChange(e.target.value)}
          placeholder="/path/to/output"
        />
        <div className="spacer" />
        <button className="primary" onClick={onRender} disabled={running}>
          {running ? "Rendering…" : `Render ${regionCount} region${regionCount !== 1 ? "s" : ""}`}
        </button>
      </div>
      <div className="muted">
        Renders each region to a separate file named after the region.
        REAPER's native render dialog may open briefly — let it finish.
      </div>
    </>
  );
}
