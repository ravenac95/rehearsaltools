import { useState } from "react";
import { api } from "../api/client";
import { useStore } from "../store";

export function Regions() {
  const regions = useStore((s) => s.regions);
  const refresh = useStore((s) => s.refreshRegions);
  const setError = useStore((s) => s.setError);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err: any) {
      setError(String(err.message ?? err));
    }
  };

  return (
    <>
      <h2>Regions</h2>

      <div className="card">
        <label>Create region at current playhead</label>
        <div className="row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Region name"
          />
          <button className="primary"
            onClick={() => run(async () => {
              await api.createRegion(newName); setNewName("");
            })}>Create</button>
        </div>
      </div>

      {regions.length === 0 ? (
        <div className="muted">No regions yet.</div>
      ) : (
        regions.map((r) => (
          <div key={r.id} className="card">
            {renamingId === r.id ? (
              <>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                />
                <div className="spacer" />
                <div className="row">
                  <button className="primary"
                    onClick={() => run(async () => {
                      await api.renameRegion(r.id, renameValue);
                      setRenamingId(null);
                    })}>Save</button>
                  <button className="secondary"
                    onClick={() => setRenamingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <strong>{r.name || "(unnamed)"}</strong>
                <div className="muted">
                  #{r.id} · starts {r.start.toFixed(2)}s
                </div>
                <div className="spacer" />
                <div className="row">
                  <button className="primary"
                    onClick={() => run(() => api.playRegion(r.id))}>Play</button>
                  <button className="secondary"
                    onClick={() => {
                      setRenamingId(r.id); setRenameValue(r.name);
                    }}>Rename</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}
