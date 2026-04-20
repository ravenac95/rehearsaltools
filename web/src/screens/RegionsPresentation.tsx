import type { Region } from "../api/client";

interface RegionsPresentationProps {
  regions: Region[];
  newName: string;
  renamingId: number | null;
  renameValue: string;
  onNewNameChange: (value: string) => void;
  onCreateRegion: () => void;
  onPlayRegion: (id: number) => void;
  onStartRename: (id: number, currentName: string) => void;
  onRenameValueChange: (value: string) => void;
  onSaveRename: (id: number) => void;
  onCancelRename: () => void;
}

export function RegionsPresentation({
  regions,
  newName,
  renamingId,
  renameValue,
  onNewNameChange,
  onCreateRegion,
  onPlayRegion,
  onStartRename,
  onRenameValueChange,
  onSaveRename,
  onCancelRename,
}: RegionsPresentationProps) {
  return (
    <>
      <h2>Regions</h2>

      <div className="card">
        <label>Create region at current playhead</label>
        <div className="row">
          <input
            type="text"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="Region name"
          />
          <button className="primary" onClick={onCreateRegion}>Create</button>
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
                  onChange={(e) => onRenameValueChange(e.target.value)}
                />
                <div className="spacer" />
                <div className="row">
                  <button className="primary" onClick={() => onSaveRename(r.id)}>Save</button>
                  <button className="secondary" onClick={onCancelRename}>Cancel</button>
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
                  <button className="primary" onClick={() => onPlayRegion(r.id)}>Play</button>
                  <button className="secondary"
                    onClick={() => onStartRename(r.id, r.name)}>Rename</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </>
  );
}
