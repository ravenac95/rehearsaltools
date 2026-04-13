import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";

export function Mixdown() {
  const setError = useStore((s) => s.setError);
  const regions = useStore((s) => s.regions);
  const [outputDir, setOutputDir] = useState("");
  const [running, setRunning] = useState(false);

  const render = async () => {
    setRunning(true);
    try {
      await api.mixdownAll(outputDir.trim() || undefined);
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <h2>Mixdown</h2>
      <div className="card">
        <label>Output directory (optional; leaves REAPER's current setting when blank)</label>
        <input
          type="text"
          value={outputDir}
          onChange={(e) => setOutputDir(e.target.value)}
          placeholder="/path/to/output"
        />
        <div className="spacer" />
        <button className="primary" onClick={render} disabled={running}>
          {running ? "Rendering…" : `Render ${regions.length} region${regions.length !== 1 ? "s" : ""}`}
        </button>
      </div>
      <div className="muted">
        Renders each region to a separate file named after the region.
        REAPER's native render dialog may open briefly — let it finish.
      </div>
    </>
  );
}
