import { useState } from "react";
import { useStore } from "../store";

export function SongForm() {
  const sections = useStore((s) => s.sections);
  const songForm = useStore((s) => s.songForm);
  const setForm = useStore((s) => s.setSongForm);
  const writeForm = useStore((s) => s.writeSongForm);
  const setError = useStore((s) => s.setError);

  const [regionName, setRegionName] = useState("");
  const [writing, setWriting] = useState(false);

  const byId = Object.fromEntries(sections.map((s) => [s.id, s]));

  const totalBars = songForm.sectionIds.reduce((acc, id) => {
    const s = byId[id];
    return acc + (s ? s.rows.reduce((a, r) => a + r.bars, 0) : 0);
  }, 0);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: any) {
      setError(String(err.message ?? err));
    }
  };

  const append = (id: string) => run(() => setForm([...songForm.sectionIds, id]));
  const remove = (idx: number) =>
    run(() => setForm(songForm.sectionIds.filter((_, i) => i !== idx)));
  const clear = () => run(() => setForm([]));

  const write = async () => {
    if (songForm.sectionIds.length === 0) {
      setError("Add at least one section before writing.");
      return;
    }
    setWriting(true);
    try {
      await writeForm(regionName.trim() || undefined);
      setRegionName("");
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setWriting(false);
    }
  };

  return (
    <>
      <h2>Song Form</h2>

      <div className="card">
        <label>Form Sequence</label>
        <div>
          {songForm.sectionIds.length === 0 ? (
            <span className="chip empty">(empty — tap a section below to add)</span>
          ) : (
            songForm.sectionIds.map((id, i) => {
              const s = byId[id];
              return (
                <span key={i} className="chip" onClick={() => remove(i)}
                  title="Tap to remove">
                  {s ? s.name : "?"} ×
                </span>
              );
            })
          )}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {totalBars} bars total
        </div>
        {songForm.sectionIds.length > 0 && (
          <button className="secondary" onClick={clear} style={{ marginTop: 10 }}>
            Clear
          </button>
        )}
      </div>

      <div className="card">
        <label>Sections (tap to append)</label>
        <div>
          {sections.length === 0 && (
            <span className="muted">Create sections first.</span>
          )}
          {sections.map((s) => (
            <span key={s.id} className="chip" onClick={() => append(s.id)}>
              + {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <label>Region name (optional)</label>
        <input
          type="text"
          value={regionName}
          onChange={(e) => setRegionName(e.target.value)}
          placeholder="Take 1"
        />
        <div className="spacer" />
        <button
          className="primary"
          onClick={write}
          disabled={writing || songForm.sectionIds.length === 0}
        >
          {writing ? "Writing…" : "Write to Project"}
        </button>
      </div>

      <div className="muted">
        Writing inserts tempo + time-signature markers and a new region
        starting at the current playhead. The region is open-ended — stop
        recording when you're done.
      </div>
    </>
  );
}
