import { useState } from "react";
import { useStore } from "../store";
import type { Section, SectionRow } from "../api/client";

const EMPTY_ROW: SectionRow = { bars: 8, num: 4, denom: 4, bpm: 120 };

export function Sections() {
  const sections = useStore((s) => s.sections);
  const create = useStore((s) => s.createSection);
  const update = useStore((s) => s.updateSection);
  const remove = useStore((s) => s.deleteSection);
  const setError = useStore((s) => s.setError);

  const [editing, setEditing] = useState<Section | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRows, setDraftRows] = useState<SectionRow[]>([{ ...EMPTY_ROW }]);

  const startNew = () => {
    setEditing({ id: "", name: "", rows: [{ ...EMPTY_ROW }] });
    setDraftName("");
    setDraftRows([{ ...EMPTY_ROW }]);
  };

  const startEdit = (s: Section) => {
    setEditing(s);
    setDraftName(s.name);
    setDraftRows(s.rows.map((r) => ({ ...r })));
  };

  const setRow = (i: number, patch: Partial<SectionRow>) => {
    setDraftRows((rows) => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const addRow = () => setDraftRows((rows) => [...rows, { ...EMPTY_ROW }]);
  const removeRow = (i: number) =>
    setDraftRows((rows) => rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows);

  const save = async () => {
    try {
      if (!draftName.trim()) throw new Error("Name is required");
      if (editing && editing.id) {
        await update(editing.id, draftName, draftRows);
      } else {
        await create(draftName, draftRows);
      }
      setEditing(null);
    } catch (err: any) {
      setError(String(err.message ?? err));
    }
  };

  const del = async () => {
    if (!editing || !editing.id) return;
    if (!confirm(`Delete section "${editing.name}"?`)) return;
    try {
      await remove(editing.id);
      setEditing(null);
    } catch (err: any) {
      setError(String(err.message ?? err));
    }
  };

  if (editing) {
    return (
      <>
        <h2>{editing.id ? "Edit Section" : "New Section"}</h2>
        <div className="card">
          <label>Name</label>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
        </div>

        <div className="card">
          <label>Rows</label>
          <table>
            <thead>
              <tr>
                <th>Bars</th><th>Num</th><th>Denom</th><th>BPM</th><th></th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row, i) => (
                <tr key={i}>
                  <td><input type="number" min="1" value={row.bars}
                    onChange={(e) => setRow(i, { bars: parseInt(e.target.value, 10) || 0 })} /></td>
                  <td><input type="number" min="1" max="64" value={row.num}
                    onChange={(e) => setRow(i, { num: parseInt(e.target.value, 10) || 0 })} /></td>
                  <td>
                    <select value={row.denom}
                      onChange={(e) => setRow(i, { denom: parseInt(e.target.value, 10) })}
                      style={{ minHeight: 48, padding: 12, background: "#1d1d22", color: "#eee", border: "1px solid #333", borderRadius: 8 }}>
                      {[1,2,4,8,16,32,64].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td><input type="number" min="20" max="999" value={row.bpm}
                    onChange={(e) => setRow(i, { bpm: parseFloat(e.target.value) || 0 })} /></td>
                  <td>
                    <button className="secondary" onClick={() => removeRow(i)}
                      style={{ minHeight: 40, padding: "6px 12px" }}>–</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="spacer" />
          <button className="secondary" onClick={addRow}>+ Add row</button>
        </div>

        <div className="row">
          <button className="primary" onClick={save}>Save</button>
          <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
          {editing.id && <button className="danger" onClick={del}>Delete</button>}
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Sections</h2>
      {sections.length === 0 && (
        <div className="muted">No sections yet. Create one to build your song form.</div>
      )}
      {sections.map((s) => {
        const totalBars = s.rows.reduce((a, r) => a + r.bars, 0);
        return (
          <button key={s.id} className="card" onClick={() => startEdit(s)}
            style={{ cursor: "pointer", width: "100%", textAlign: "left", border: "none", font: "inherit", color: "inherit" }}>
            <strong>{s.name}</strong>
            <div className="muted">
              {s.rows.length} row{s.rows.length !== 1 ? "s" : ""} · {totalBars} bars
            </div>
          </button>
        );
      })}
      <div className="spacer" />
      <button className="primary" onClick={startNew}>+ New Section</button>
    </>
  );
}
