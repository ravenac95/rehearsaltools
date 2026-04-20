import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";
import { RegionsPresentation } from "./RegionsPresentation";

export function Regions() {
  const regions = useStore((s) => s.regions);
  const refresh = useStore((s) => s.refreshRegions);
  const setError = useStore((s) => s.setError);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh(); }
    catch (err: unknown) { setError(String((err as Error).message ?? err)); }
  };

  return (
    <RegionsPresentation
      regions={regions}
      newName={newName}
      renamingId={renamingId}
      renameValue={renameValue}
      onNewNameChange={setNewName}
      onCreateRegion={() => run(async () => {
        await api.createRegion(newName);
        setNewName("");
      })}
      onPlayRegion={(id) => run(() => api.playRegion(id))}
      onStartRename={(id, currentName) => { setRenamingId(id); setRenameValue(currentName); }}
      onRenameValueChange={setRenameValue}
      onSaveRename={(id) => run(async () => {
        await api.renameRegion(id, renameValue);
        setRenamingId(null);
      })}
      onCancelRename={() => setRenamingId(null)}
    />
  );
}
