import { useState, useEffect, useRef } from "react";
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
  const deleteSection = useStore((s) => s.deleteSection);
  const updateSongName = useStore((s) => s.updateSongName);
  const writeActiveForm = useStore((s) => s.writeActiveForm);
  const setError = useStore((s) => s.setError);
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  const [running, setRunning] = useState(false);
  const [nameDraft, setNameDraft] = useState(song.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-clear toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  // Sync name draft from store when not focused (snapshot updates, form loads)
  useEffect(() => {
    if (document.activeElement === nameInputRef.current) return;
    setNameDraft(song.name);
  }, [song.name]);

  // Debounce name commit while typing
  useEffect(() => {
    if (nameDraft === song.name) return;
    const t = setTimeout(() => {
      run(() => updateSongName(nameDraft));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameDraft]);

  const commitName = () => {
    if (nameDraft !== song.name) run(() => updateSongName(nameDraft));
  };

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

  const sectionsByLetter = Object.fromEntries(song.sections.map((s) => [s.letter, s]));
  const definedLetters = song.sections.map((s) => s.letter);
  const unresolvedLetters = activeForm.pattern.filter((l) => !sectionsByLetter[l]);
  const hasUnresolved = unresolvedLetters.length > 0;

  // Total bars (unresolved letters contribute 0)
  const totalBars = activeForm.pattern.reduce((acc, letter) => {
    const sec = sectionsByLetter[letter];
    if (!sec) return acc;
    return acc + sec.stanzas.reduce((a, st) => a + st.bars, 0);
  }, 0);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const nextLetter = ALPHABET.find((l) => !definedLetters.includes(l));
  const canAddSection = nextLetter !== undefined;

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

  const handleAddSection = () => {
    if (!nextLetter) return;
    run(() => upsertSection(nextLetter, [{ bars: 8, num: 4, denom: 4 }]));
  };

  const handleDeleteSection = (letter: string) => {
    run(() => deleteSection(letter));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Song name */}
      <div style={{ padding: "8px var(--spacing-md)", borderBottom: "1px solid var(--rule)" }}>
        <input
          ref={nameInputRef}
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === "Enter") { commitName(); e.currentTarget.blur(); } }}
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
          definedLetters={definedLetters}
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

        {/* Total bars + unresolved notice */}
        <div style={{ color: "var(--muted-color)", fontSize: 13, fontFamily: "var(--font-mono)", marginBottom: 12 }}>
          {totalBars} bars total
          {hasUnresolved && (
            <span style={{ marginLeft: 8, color: "var(--accent)" }}>
              · unresolved: {Array.from(new Set(unresolvedLetters)).join(" ")}
            </span>
          )}
        </div>

        {/* Sections library — always visible, independent of pattern */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 11, letterSpacing: 1, color: "var(--muted-color)",
            fontFamily: "var(--font-mono)", marginBottom: 8, textTransform: "uppercase",
          }}>
            Sections
          </div>

          {song.sections.length === 0 && (
            <div style={{
              padding: 10, border: "1px dashed var(--rule)",
              borderRadius: "var(--radius-md)", marginBottom: 8,
              color: "var(--muted-color)", fontSize: 13, fontFamily: "var(--font-hand)",
            }}>
              No sections yet — tap "+ section" to add one.
            </div>
          )}

          {song.sections.map((section) => (
            <SectionRow
              key={section.letter}
              section={section}
              form={activeForm}
              onUpdate={(stanzas, bpm, note) => handleSectionUpdate(section.letter, stanzas, bpm, note)}
              onDelete={() => handleDeleteSection(section.letter)}
            />
          ))}

          <button
            className="chip"
            onClick={handleAddSection}
            disabled={!canAddSection}
            title={canAddSection ? `Add section ${nextLetter}` : "all 26 letters used"}
            style={{ marginTop: 4 }}
          >
            + section{canAddSection ? ` ${nextLetter}` : ""}
          </button>
        </div>

        <div style={{ height: 80 }} /> {/* spacer above RunBar */}
      </div>

      <RunBar
        onRun={handleRun}
        loading={running}
        disabled={activeForm.pattern.length === 0 || hasUnresolved}
      />
    </div>
  );
}
