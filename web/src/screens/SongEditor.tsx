import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { SongEditorPresentation } from "./SongEditorPresentation";
import type { NoteValue, Stanza, SongForm } from "../api/client";

export function SongEditor() {
  const song = useStore((s) => s.song);
  const createForm = useStore((s) => s.createForm);
  const setActiveForm = useStore((s) => s.setActiveForm);
  const updateForm = useStore((s) => s.updateForm);
  const deleteForm = useStore((s) => s.deleteForm);
  const upsertSection = useStore((s) => s.upsertSection);
  const deleteSection = useStore((s) => s.deleteSection);
  const updateSongName = useStore((s) => s.updateSongName);
  const writeActiveForm = useStore((s) => s.writeActiveForm);
  const setError = useStore((s) => s.setError);
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  const [running, setRunning] = useState(false);
  const [nameDraft, setNameDraft] = useState(song.name);
  const [pendingDeleteForm, setPendingDeleteForm] = useState<SongForm | null>(null);
  const nameFocusedRef = useRef(false);

  // Auto-clear toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 4000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  // Sync name draft from store when not focused.
  // Read focus from a ref so a blur doesn't trigger this effect mid-debounce
  // (which would clobber the draft before updateSongName resolves).
  useEffect(() => {
    if (nameFocusedRef.current) return;
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

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (err: unknown) { setError(String((err as Error).message ?? err)); }
  };

  const activeForm = song.songForms.find((f) => f.id === song.activeFormId)
    ?? song.songForms[0];

  const sectionsByLetter = Object.fromEntries(song.sections.map((s) => [s.letter, s]));
  const definedLetters = song.sections.map((s) => s.letter);
  const unresolvedLetters = activeForm
    ? activeForm.pattern.filter((l) => !sectionsByLetter[l])
    : [];
  const hasUnresolved = unresolvedLetters.length > 0;
  const totalBars = activeForm
    ? activeForm.pattern.reduce((acc, letter) => {
        const sec = sectionsByLetter[letter];
        return acc + (sec ? sec.stanzas.reduce((a, st) => a + st.bars, 0) : 0);
      }, 0)
    : 0;
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const nextLetter = ALPHABET.find((l) => !definedLetters.includes(l));
  const canAddSection = nextLetter !== undefined;

  return (
    <SongEditorPresentation
      song={song}
      activeForm={activeForm}
      nameDraft={nameDraft}
      toast={toast}
      running={running}
      definedLetters={definedLetters}
      unresolvedLetters={unresolvedLetters}
      hasUnresolved={hasUnresolved}
      totalBars={totalBars}
      nextLetter={nextLetter}
      canAddSection={canAddSection}
      onNameChange={setNameDraft}
      onNameFocus={() => { nameFocusedRef.current = true; }}
      onNameBlur={() => {
        nameFocusedRef.current = false;
        commitName();
      }}
      onSelectForm={(id) => run(() => setActiveForm(id))}
      onCreateForm={() => run(createForm)}
      onDeleteForm={(id) => {
        const form = song.songForms.find((f) => f.id === id);
        if (!form) return;
        setPendingDeleteForm(form);
        run(() => deleteForm(id));
      }}
      pendingDeleteForm={pendingDeleteForm}
      onUndoDeleteForm={async () => {
        const form = pendingDeleteForm;
        if (!form) return;
        setPendingDeleteForm(null);
        try {
          await createForm();
          // The new form is appended; recover its id from the freshest store snapshot.
          const fresh = useStore.getState().song;
          const restored = fresh.songForms[fresh.songForms.length - 1];
          if (restored) {
            await updateForm(restored.id, {
              name: form.name, bpm: form.bpm, note: form.note, pattern: form.pattern,
            });
          }
        } catch (err: unknown) {
          setError(String((err as Error).message ?? err));
        }
      }}
      onDismissUndo={() => setPendingDeleteForm(null)}
      onPatternChange={(letters) => run(() => updateForm(activeForm!.id, { pattern: letters }))}
      onFormBpmChange={(bpm) => run(() => updateForm(activeForm!.id, { bpm }))}
      onFormNoteChange={(note: NoteValue) => run(() => updateForm(activeForm!.id, { note }))}
      onSectionUpdate={(letter, stanzas, bpm, note) => run(() => upsertSection(letter, stanzas, bpm, note))}
      onAddSection={() => {
        if (!nextLetter) return;
        run(() => upsertSection(nextLetter, [{ bars: 8, num: 4, denom: 4 }]));
      }}
      onDeleteSection={(letter) => run(() => deleteSection(letter))}
      onRun={async () => {
        setRunning(true);
        try { await writeActiveForm(); }
        catch (err: unknown) { setError(String((err as Error).message ?? err)); }
        finally { setRunning(false); }
      }}
    />
  );
}
