import { useState, useEffect } from "react";
import { useStore } from "../store";
import { FormTabs } from "../components/song/FormTabs";
import { FormStringEditor } from "../components/song/FormStringEditor";
import { TempoEditor } from "../components/song/TempoEditor";
import { SectionRow } from "../components/song/SectionRow";
import { RunBar } from "../components/song/RunBar";
import type { NoteValue, Stanza } from "../api/client";

export function SongEditor() {
  const song = useStore((s) => s.song);
  const createForm = useStore((s) => s.createForm);
  const setActiveForm = useStore((s) => s.setActiveForm);
  const updateForm = useStore((s) => s.updateForm);
  const upsertSection = useStore((s) => s.upsertSection);
  const writeActiveForm = useStore((s) => s.writeActiveForm);
  const setError = useStore((s) => s.setError);
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  const [running, setRunning] = useState(false);

  // Auto-clear toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  const activeForm = song.songForms.find((f) => f.id === song.activeFormId)
    ?? song.songForms[0];

  if (!activeForm) {
    return (
      <div style={{ padding: "var(--spacing-md)", color: "var(--muted-color)" }}>
        No song forms yet.
        <button className="chip" onClick={() => createForm()} style={{ marginLeft: 8 }}>
          + Create form
        </button>
      </div>
    );
  }

  // Unique letters in active form pattern (first-appearance order)
  const uniqueLetters = Array.from(new Set(activeForm.pattern));

  // Sections present in the library for the letters in this form
  const sectionsByLetter = Object.fromEntries(song.sections.map((s) => [s.letter, s]));

  // Total bars
  const totalBars = activeForm.pattern.reduce((acc, letter) => {
    const sec = sectionsByLetter[letter];
    if (!sec) return acc;
    return acc + sec.stanzas.reduce((a, st) => a + st.bars, 0);
  }, 0);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (err: any) { setError(String(err.message ?? err)); }
  };

  const handleRun = async () => {
    setRunning(true);
    try { await writeActiveForm(); }
    catch (err: any) { setError(String(err.message ?? err)); }
    finally { setRunning(false); }
  };

  const handlePatternChange = (letters: string[]) => {
    run(() => updateForm(activeForm.id, { pattern: letters }));
  };

  const handleFormBpmChange = (bpm: number) => {
    run(() => updateForm(activeForm.id, { bpm }));
  };

  const handleFormNoteChange = (note: NoteValue) => {
    run(() => updateForm(activeForm.id, { note }));
  };

  const handleSectionUpdate = (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) => {
    run(() => upsertSection(letter, stanzas, bpm, note));
  };

  const handleAddMissingSection = (letter: string) => {
    // Create a default section for a letter that is in the pattern but not yet defined
    run(() => upsertSection(letter, [{ bars: 8, num: 4, denom: 4 }]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Song name */}
      <div style={{ padding: "8px var(--spacing-md)", borderBottom: "1px solid var(--rule)" }}>
        <input
          type="text"
          value={song.name}
          onChange={(e) => run(() => useStore.getState().updateSongName(e.target.value))}
          style={{
            width: "100%", background: "transparent", border: "none",
            fontFamily: "var(--font-marker)", fontSize: 22, fontWeight: 700,
            color: "var(--ink)", padding: "4px 0",
          }}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: "8px var(--spacing-md)", background: "var(--accent-soft)",
          borderBottom: "1px solid var(--rule)",
          color: "var(--accent)", fontSize: 13, fontFamily: "var(--font-hand)",
        }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "0 var(--spacing-md)", flex: 1 }}>
        {/* Form tabs */}
        <FormTabs
          forms={song.songForms}
          activeFormId={song.activeFormId}
          onSelect={(id) => run(() => setActiveForm(id))}
          onCreate={() => run(createForm)}
        />

        {/* Pattern string editor */}
        <FormStringEditor
          pattern={activeForm.pattern}
          onChange={handlePatternChange}
        />

        {/* Form-level tempo */}
        <div style={{ margin: "12px 0" }}>
          <TempoEditor
            bpm={activeForm.bpm}
            note={activeForm.note}
            bpmOverridden={true}   // form always has an explicit BPM
            noteOverridden={true}  // form always has an explicit note
            onBpmChange={handleFormBpmChange}
            onNoteChange={handleFormNoteChange}
          />
        </div>

        {/* Total bars */}
        <div style={{ color: "var(--muted-color)", fontSize: 13, fontFamily: "var(--font-mono)", marginBottom: 12 }}>
          {totalBars} bars total
        </div>

        {/* Section rows */}
        {uniqueLetters.map((letter) => {
          const section = sectionsByLetter[letter];
          if (!section) {
            // Letter is in pattern but section not yet defined
            return (
              <div key={letter} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: 10, border: "1px dashed var(--rule)",
                borderRadius: "var(--radius-md)", marginBottom: 8,
                color: "var(--muted-color)",
              }}>
                <span style={{ fontFamily: "var(--font-marker)", fontWeight: 700, fontSize: 18 }}>{letter}</span>
                <span>— not defined yet</span>
                <button className="chip" onClick={() => handleAddMissingSection(letter)}
                  style={{ marginLeft: "auto", fontSize: 13 }}>
                  + Add section {letter}
                </button>
              </div>
            );
          }
          return (
            <SectionRow
              key={letter}
              section={section}
              form={activeForm}
              onUpdate={(stanzas, bpm, note) => handleSectionUpdate(letter, stanzas, bpm, note)}
            />
          );
        })}

        <div style={{ height: 80 }} /> {/* spacer above RunBar */}
      </div>

      <RunBar onRun={handleRun} loading={running} disabled={activeForm.pattern.length === 0} />
    </div>
  );
}
