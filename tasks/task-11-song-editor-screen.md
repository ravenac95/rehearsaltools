# Task 11: SongEditor screen, App.tsx tab cleanup, delete old screens

## Objective

Create `web/src/screens/SongEditor.tsx`, remove the Sections tab from `App.tsx`, and delete the now-superseded `Sections.tsx` and `SongForm.tsx` screen files.

## Dependencies

- task-05-frontend-types-store-api
- task-08-retheme-existing-screens
- task-10-song-editor-primitives

## Files

- **Create** `web/src/screens/SongEditor.tsx`
- **Create** `web/src/components/song/SectionRow.tsx`
- **Modify** `web/src/App.tsx`
- **Delete** `web/src/screens/Sections.tsx`
- **Delete** `web/src/screens/SongForm.tsx`

## Context

Read the following files before starting:
- `web/src/App.tsx` — current tab list and screen routing
- `web/src/store.ts` (task-05) — the new `song`, `upsertSection`, `deleteSection`, `createForm`, `updateForm`, `deleteForm`, `writeActiveForm` actions
- All components in `web/src/components/song/` (task-10)
- `web/src/screens/SongForm.tsx` — to understand the existing write flow before deleting

The SongEditor screen implements the WF2 layout from the PRD. It is the sole entry point for all song authoring.

## Requirements

### `web/src/components/song/SectionRow.tsx`

A collapsible row for one section. Collapsed state shows a compact strip; expanded shows the stanza inline editor.

```tsx
import { useState } from "react";
import type { Section, Stanza, NoteValue, SongForm } from "../../api/client";
import { LetterBadge } from "./LetterBadge";
import { StanzaCompact } from "./StanzaCompact";
import { StanzaExpanded } from "./StanzaExpanded";
import { TempoEditor } from "./TempoEditor";

interface SectionRowProps {
  section: Section;
  form: SongForm;              // needed for effective BPM/note computation
  onUpdate: (stanzas: Stanza[], bpm?: number, note?: NoteValue) => void;
}

function effectiveBpm(stanza: Stanza, section: Section, form: SongForm): number {
  return stanza.bpm ?? section.bpm ?? form.bpm;
}
function effectiveNote(stanza: Stanza, section: Section, form: SongForm): NoteValue {
  return stanza.note ?? section.note ?? form.note;
}

export function SectionRow({ section, form, onUpdate }: SectionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedStanzaIdx, setExpandedStanzaIdx] = useState<number | null>(null);

  const updateStanza = (idx: number, updated: Stanza) => {
    const next = section.stanzas.map((s, i) => i === idx ? updated : s);
    onUpdate(next, section.bpm, section.note);
  };

  const deleteStanza = (idx: number) => {
    if (section.stanzas.length <= 1) return; // keep at least one
    const next = section.stanzas.filter((_, i) => i !== idx);
    onUpdate(next, section.bpm, section.note);
  };

  const duplicateStanza = (idx: number) => {
    const next = [...section.stanzas];
    next.splice(idx + 1, 0, { ...section.stanzas[idx] });
    onUpdate(next, section.bpm, section.note);
  };

  const addStanza = () => {
    const last = section.stanzas[section.stanzas.length - 1] ?? { bars: 8, num: 4, denom: 4 };
    onUpdate([...section.stanzas, { bars: last.bars, num: last.num, denom: last.denom }],
      section.bpm, section.note);
  };

  return (
    <div style={{
      border: "1px solid var(--rule)", borderRadius: "var(--radius-md)",
      marginBottom: 8, overflow: "hidden",
    }}>
      {/* Collapsed header — always visible */}
      <div
        onClick={() => setExpanded((x) => !x)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", cursor: "pointer",
          background: "var(--surface-alt)",
        }}
      >
        <LetterBadge letter={section.letter} size={32} />

        {/* Compact stanza strip */}
        <div style={{
          flex: 1, display: "flex", gap: 6, overflow: "hidden",
          maskImage: "linear-gradient(to right, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 80%, transparent 100%)",
        }}>
          {section.stanzas.map((st, i) => (
            <StanzaCompact
              key={i}
              stanza={st}
              effectiveBpm={effectiveBpm(st, section, form)}
              effectiveNote={effectiveNote(st, section, form)}
              bpmInherited={st.bpm === undefined}
            />
          ))}
        </div>

        {/* Effective section tempo readout */}
        <span style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {section.bpm ?? form.bpm} BPM
        </span>

        <span style={{ color: "var(--faint)", flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
      </div>

      {/* Expanded stanza editor */}
      {expanded && (
        <div style={{ padding: 12, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Section-level tempo override */}
          <TempoEditor
            bpm={section.bpm ?? form.bpm}
            note={section.note ?? form.note}
            bpmOverridden={section.bpm !== undefined}
            noteOverridden={section.note !== undefined}
            onBpmChange={(v) => onUpdate(section.stanzas, v, section.note)}
            onNoteChange={(v) => onUpdate(section.stanzas, section.bpm, v)}
            onBpmClear={() => onUpdate(section.stanzas, undefined, section.note)}
            onNoteClear={() => onUpdate(section.stanzas, section.bpm, undefined)}
          />

          <div style={{ height: 1, background: "var(--rule)", margin: "4px 0" }} />

          {/* Stanzas */}
          {section.stanzas.map((st, i) => (
            <div key={i}>
              <div
                style={{ fontSize: 12, color: "var(--muted-color)", marginBottom: 4, cursor: "pointer" }}
                onClick={() => setExpandedStanzaIdx(expandedStanzaIdx === i ? null : i)}
              >
                Stanza {i + 1} — {st.bars} bars {st.num}/{st.denom} {expandedStanzaIdx === i ? "▾" : "▸"}
              </div>
              {expandedStanzaIdx === i && (
                <StanzaExpanded
                  stanza={st}
                  index={i}
                  effectiveBpm={effectiveBpm(st, section, form)}
                  effectiveNote={effectiveNote(st, section, form)}
                  formBpm={form.bpm}
                  sectionBpm={section.bpm}
                  onChange={(updated) => updateStanza(i, updated)}
                  onDelete={() => deleteStanza(i)}
                  onDuplicate={() => duplicateStanza(i)}
                />
              )}
            </div>
          ))}

          {/* Add stanza */}
          <button className="chip" onClick={addStanza}
            style={{ alignSelf: "flex-start", fontSize: 13 }}>
            + stanza
          </button>
        </div>
      )}
    </div>
  );
}
```

### `web/src/screens/SongEditor.tsx`

Full WF2 screen layout. Read the PRD "New `web/src/screens/SongEditor.tsx`" section carefully.

```tsx
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
```

### `web/src/App.tsx` — update tabs and routing

1. Remove the `"sections"` tab entry from `TABS`.
2. Rename the `"songform"` tab to `"song"` and change its label from `"Song Form"` to `"Song"`.
3. Import `SongEditor` from `./screens/SongEditor`.
4. Remove the import of `Sections` and `SongForm`.
5. Replace `{tab === "sections" && <Sections />}` and `{tab === "songform" && <SongForm />}` with `{tab === "song" && <SongEditor />}`.
6. Update the `Tab` type to remove `"sections"` and rename `"songform"` to `"song"`.

Updated `TABS`:
```ts
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "Transport" },
  { id: "song",      label: "Song"      },
  { id: "regions",   label: "Regions"   },
  { id: "mixdown",   label: "Mixdown"   },
];
```

### Delete superseded files

After verifying no remaining imports:
- Delete `web/src/screens/Sections.tsx`
- Delete `web/src/screens/SongForm.tsx`

## Existing Code References

- `web/src/App.tsx` — full file; update tab list and routing
- `web/src/store.ts` (task-05) — `song`, `upsertSection`, `deleteSection`, `writeActiveForm`, `toast`, `clearToast`
- `web/src/components/song/` (task-10) — all song primitives
- `web/src/screens/SongForm.tsx` — understand the write flow before deleting

## Acceptance Criteria

- [ ] `pnpm -F web build` compiles without TypeScript errors.
- [ ] `pnpm -F web test` — all tests still pass.
- [ ] App.tsx has 4 tabs: Transport, Song, Regions, Mixdown. No Sections tab.
- [ ] `web/src/screens/Sections.tsx` and `web/src/screens/SongForm.tsx` are deleted.
- [ ] `web/src/screens/SongEditor.tsx` and `web/src/components/song/SectionRow.tsx` exist.
- [ ] Song tab renders `SongEditor` with the form tabs, pattern editor, section rows, and sticky RunBar.
- [ ] Section rows collapse by default; tapping header expands to show stanza editor.
- [ ] `FormStringEditor` with invalid tokens shows red border and error message.
- [ ] Missing sections (in pattern but not defined) show a "not defined" placeholder with an Add button.
- [ ] Toast notification appears when `deleteSection` returns a warning and auto-clears after ~4s.
- [ ] RUN button is disabled when `activeForm.pattern` is empty.
