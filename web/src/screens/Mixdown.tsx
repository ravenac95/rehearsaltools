import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { MixdownPresentation } from "./MixdownPresentation";

export function Mixdown() {
  const setError = useStore((s) => s.setError);
  const regions = useStore((s) => s.regions);
  const [outputDir, setOutputDir] = useState("");
  const [running, setRunning] = useState(false);

  const render = async () => {
    setRunning(true);
    try {
      await api.mixdownAll(outputDir.trim() || undefined);
    } catch (err: unknown) {
      setError(String((err as Error).message ?? err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <MixdownPresentation
      outputDir={outputDir}
      running={running}
      regionCount={regions.length}
      onOutputDirChange={setOutputDir}
      onRender={render}
    />
  );
}
