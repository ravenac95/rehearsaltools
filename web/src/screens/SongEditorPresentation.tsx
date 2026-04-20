import { FormTabs } from "../components/song/FormTabs";
import { FormStringEditor } from "../components/song/FormStringEditor";
import { TempoEditor } from "../components/song/TempoEditor";
import { SectionRow } from "../components/song/SectionRow";
import { RunBar } from "../components/song/RunBar";
import { UndoToast } from "../components/ui/UndoToast";
import type { Song, SongForm, NoteValue, Stanza } from "../api/client";

interface SongEditorPresentationProps {
  // Data
  song: Song;
  activeForm: SongForm | undefined;
  nameDraft: string;
  toast: string | null;
  running: boolean;
  // Derived (computed in container)
  definedLetters: string[];
  unresolvedLetters: string[];
  hasUnresolved: boolean;
  totalBars: number;
  nextLetter: string | undefined;
  canAddSection: boolean;
  // Callbacks
  onNameChange: (v: string) => void;
  onNameFocus: () => void;   // container sets nameFocused = true
  onNameBlur: () => void;    // container sets nameFocused = false, then commits if dirty
  onSelectForm: (id: string) => void;
  onCreateForm: () => void;
  onDeleteForm: (id: string) => void;
  pendingDeleteForm: SongForm | null;
  onUndoDeleteForm: () => void;
  onDismissUndo: () => void;
  onPatternChange: (letters: string[]) => void;
  onFormBpmChange: (bpm: number) => void;
  onFormNoteChange: (note: NoteValue) => void;
  onSectionUpdate: (letter: string, stanzas: Stanza[], bpm?: number, note?: NoteValue) => void;
  onAddSection: () => void;
  onDeleteSection: (letter: string) => void;
  onRun: () => void;
}

export function SongEditorPresentation({
  song,
  activeForm,
  nameDraft,
  toast,
  running,
  definedLetters,
  unresolvedLetters,
  hasUnresolved,
  totalBars,
  nextLetter,
  canAddSection,
  onNameChange,
  onNameFocus,
  onNameBlur,
  onSelectForm,
  onCreateForm,
  onDeleteForm,
  pendingDeleteForm,
  onUndoDeleteForm,
  onDismissUndo,
  onPatternChange,
  onFormBpmChange,
  onFormNoteChange,
  onSectionUpdate,
  onAddSection,
  onDeleteSection,
  onRun,
}: SongEditorPresentationProps) {
  if (!activeForm) {
    return (
      <>
        <div style={{ padding: "var(--spacing-md)", color: "var(--muted-color)" }}>
          No song forms yet.
          <button className="chip" onClick={onCreateForm} style={{ marginLeft: 8 }}>
            + Create form
          </button>
        </div>
        {pendingDeleteForm && (
          <UndoToast
            message={`Deleted form "${pendingDeleteForm.name}"`}
            onUndo={onUndoDeleteForm}
            onDismiss={onDismissUndo}
          />
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Song name */}
      <div style={{ padding: "8px var(--spacing-md)", borderBottom: "1px solid var(--rule)" }}>
        <input
          type="text"
          value={nameDraft}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={onNameFocus}
          onBlur={onNameBlur}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
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
          onSelect={onSelectForm}
          onCreate={onCreateForm}
          onDelete={onDeleteForm}
        />

        {/* Pattern string editor */}
        <FormStringEditor
          pattern={activeForm.pattern}
          onChange={onPatternChange}
          definedLetters={definedLetters}
        />

        {/* Form-level tempo */}
        <div style={{ margin: "12px 0" }}>
          <TempoEditor
            bpm={activeForm.bpm}
            note={activeForm.note}
            bpmOverridden={true}   // form always has an explicit BPM
            noteOverridden={true}  // form always has an explicit note
            onBpmChange={onFormBpmChange}
            onNoteChange={onFormNoteChange}
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
              onUpdate={(stanzas, bpm, note) => onSectionUpdate(section.letter, stanzas, bpm, note)}
              onDelete={() => onDeleteSection(section.letter)}
            />
          ))}

          <button
            className="chip"
            onClick={onAddSection}
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
        onRun={onRun}
        loading={running}
        disabled={activeForm.pattern.length === 0 || hasUnresolved}
      />

      {pendingDeleteForm && (
        <UndoToast
          message={`Deleted form "${pendingDeleteForm.name}"`}
          onUndo={onUndoDeleteForm}
          onDismiss={onDismissUndo}
        />
      )}
    </div>
  );
}
