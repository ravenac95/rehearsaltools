# Task 10: Song editor primitive components

## Objective

Create all song-editor-specific UI primitive components in `web/src/components/song/` — LetterBadge, TimeSigStack, NoteGlyph, TempoEditor, StanzaCompact, StanzaExpanded, FormTabs, FormStringEditor, RunBar, and a section color map.

## Dependencies

- task-06-theme-system
- task-07-shared-ui-primitives
- task-09-pattern-parser

## Files

- **Create** `web/src/components/song/colors.ts`
- **Create** `web/src/components/song/LetterBadge.tsx`
- **Create** `web/src/components/song/TimeSigStack.tsx`
- **Create** `web/src/components/song/NoteGlyph.tsx`
- **Create** `web/src/components/song/TempoEditor.tsx`
- **Create** `web/src/components/song/StanzaCompact.tsx`
- **Create** `web/src/components/song/StanzaExpanded.tsx`
- **Create** `web/src/components/song/FormTabs.tsx`
- **Create** `web/src/components/song/FormStringEditor.tsx`
- **Create** `web/src/components/song/RunBar.tsx`
- **Create** `web/src/components/song/index.ts`

## Context

Read `designs/Song Form Editor — Wireframes.html` to understand the wireframe visual style (paper surfaces, sketch aesthetic, compact cards). Read the PRD sections on WF2 layout and component descriptions.

All components use the CSS variables from task-06 (`var(--surface-alt)`, `var(--ink)`, `var(--rule)`, etc.) and the shared UI primitives from task-07 where appropriate.

Type imports: import `NoteValue`, `Stanza`, `SongForm`, `Section` from `"../../api/client"`.

## Requirements

### `web/src/components/song/colors.ts`

```ts
export const LETTER_COLORS: Record<string, { bg: string; ink: string }> = {
  A: { bg: "var(--letter-A-bg)", ink: "var(--letter-A-ink)" },
  B: { bg: "var(--letter-B-bg)", ink: "var(--letter-B-ink)" },
  C: { bg: "var(--letter-C-bg)", ink: "var(--letter-C-ink)" },
  D: { bg: "var(--letter-D-bg)", ink: "var(--letter-D-ink)" },
  E: { bg: "var(--letter-E-bg)", ink: "var(--letter-E-ink)" },
  F: { bg: "var(--letter-F-bg)", ink: "var(--letter-F-ink)" },
  G: { bg: "var(--letter-G-bg)", ink: "var(--letter-G-ink)" },
  H: { bg: "var(--letter-H-bg)", ink: "var(--letter-H-ink)" },
  I: { bg: "var(--letter-I-bg)", ink: "var(--letter-I-ink)" },
  J: { bg: "var(--letter-J-bg)", ink: "var(--letter-J-ink)" },
  K: { bg: "var(--letter-K-bg)", ink: "var(--letter-K-ink)" },
  L: { bg: "var(--letter-L-bg)", ink: "var(--letter-L-ink)" },
  M: { bg: "var(--letter-M-bg)", ink: "var(--letter-M-ink)" },
  N: { bg: "var(--letter-N-bg)", ink: "var(--letter-N-ink)" },
  O: { bg: "var(--letter-O-bg)", ink: "var(--letter-O-ink)" },
  P: { bg: "var(--letter-P-bg)", ink: "var(--letter-P-ink)" },
  Q: { bg: "var(--letter-Q-bg)", ink: "var(--letter-Q-ink)" },
  R: { bg: "var(--letter-R-bg)", ink: "var(--letter-R-ink)" },
  S: { bg: "var(--letter-S-bg)", ink: "var(--letter-S-ink)" },
  T: { bg: "var(--letter-T-bg)", ink: "var(--letter-T-ink)" },
  U: { bg: "var(--letter-U-bg)", ink: "var(--letter-U-ink)" },
  V: { bg: "var(--letter-V-bg)", ink: "var(--letter-V-ink)" },
  W: { bg: "var(--letter-W-bg)", ink: "var(--letter-W-ink)" },
  X: { bg: "var(--letter-X-bg)", ink: "var(--letter-X-ink)" },
  Y: { bg: "var(--letter-Y-bg)", ink: "var(--letter-Y-ink)" },
  Z: { bg: "var(--letter-Z-bg)", ink: "var(--letter-Z-ink)" },
};

export function getLetterColor(letter: string): { bg: string; ink: string } {
  return LETTER_COLORS[letter] ?? { bg: "var(--surface-alt)", ink: "var(--ink)" };
}
```

### `web/src/components/song/LetterBadge.tsx`

Colored square tile showing the section letter.

```tsx
interface LetterBadgeProps {
  letter: string;
  size?: number;  // default 36
}

export function LetterBadge({ letter, size = 36 }: LetterBadgeProps) {
  const { bg, ink } = getLetterColor(letter);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 6,
      background: bg, color: ink,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-marker)", fontWeight: 700,
      fontSize: size * 0.55,
      flexShrink: 0,
      boxShadow: "var(--shadow-sketch)",
    }}>
      {letter}
    </div>
  );
}
```

### `web/src/components/song/TimeSigStack.tsx`

Vertical fraction display: numerator over denominator with a dividing rule.

```tsx
interface TimeSigStackProps { num: number; denom: number; size?: "sm" | "md"; }

export function TimeSigStack({ num, denom, size = "md" }: TimeSigStackProps) {
  const fs = size === "sm" ? 13 : 17;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "var(--font-mono)", fontWeight: 700, lineHeight: 1, gap: 1,
    }}>
      <span style={{ fontSize: fs }}>{num}</span>
      <div style={{ width: "100%", height: 1, background: "var(--ink-soft)", margin: "1px 0" }} />
      <span style={{ fontSize: fs }}>{denom}</span>
    </div>
  );
}
```

### `web/src/components/song/NoteGlyph.tsx`

Renders a note-value as a text glyph. Unicode approximations are fine (this is a sketch UI):

| NoteValue | Glyph |
|-----------|-------|
| `w` | `𝅝` or `○` |
| `h` | `𝅗𝅥` or `◑` |
| `q` | `♩` |
| `e` | `♪` |
| `s` | `♬` |

```tsx
import type { NoteValue } from "../../api/client";

const GLYPHS: Record<NoteValue, string> = {
  w: "○", h: "◑", q: "♩", e: "♪", s: "♬",
};
const NAMES: Record<NoteValue, string> = {
  w: "whole", h: "half", q: "quarter", e: "eighth", s: "sixteenth",
};

interface NoteGlyphProps {
  note: NoteValue;
  inherited?: boolean;  // if true, render faint (inherited value)
  size?: number;
}

export function NoteGlyph({ note, inherited = false, size = 18 }: NoteGlyphProps) {
  return (
    <span
      title={NAMES[note]}
      style={{
        fontSize: size,
        color: inherited ? "var(--faint)" : "var(--ink)",
        fontWeight: inherited ? 400 : 700,
        lineHeight: 1,
        cursor: "default",
        userSelect: "none",
      }}
    >
      {GLYPHS[note]}
    </span>
  );
}
```

### `web/src/components/song/TempoEditor.tsx`

BPM stepper + note-type cycle button. Used at form, section, and stanza scope.

```tsx
import type { NoteValue } from "../../api/client";
import { Stepper } from "../ui/Stepper";
import { NoteGlyph } from "./NoteGlyph";

const NOTE_ORDER: NoteValue[] = ["w", "h", "q", "e", "s"];

interface TempoEditorProps {
  bpm: number;                // the current value (effective — may be inherited)
  note: NoteValue;            // the current value (effective)
  bpmOverridden: boolean;     // true if this level has an explicit override
  noteOverridden: boolean;    // true if this level has an explicit override
  onBpmChange: (bpm: number) => void;
  onNoteChange: (note: NoteValue) => void;
  onBpmClear?: () => void;    // if provided, shows an "×" to remove override
  onNoteClear?: () => void;
}

export function TempoEditor({
  bpm, note, bpmOverridden, noteOverridden,
  onBpmChange, onNoteChange, onBpmClear, onNoteClear,
}: TempoEditorProps) {
  const cycleNote = () => {
    const idx = NOTE_ORDER.indexOf(note);
    onNoteChange(NOTE_ORDER[(idx + 1) % NOTE_ORDER.length]);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <Stepper
        label="BPM"
        value={bpm}
        min={20} max={999}
        mono
        onChange={onBpmChange}
      />
      {bpmOverridden && onBpmClear && (
        <button className="chip ghost" onClick={onBpmClear}
          style={{ fontSize: 11, minHeight: 28, padding: "2px 8px" }}
          title="Remove BPM override">×</button>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>Note</label>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="chip" onClick={cycleNote}
            style={{ minHeight: 36, padding: "4px 10px" }}>
            <NoteGlyph note={note} inherited={!noteOverridden} />
          </button>
          {noteOverridden && onNoteClear && (
            <button className="chip ghost" onClick={onNoteClear}
              style={{ fontSize: 11, minHeight: 28, padding: "2px 8px" }}
              title="Remove note override">×</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### `web/src/components/song/StanzaCompact.tsx`

Small card shown in the collapsed section row strip.

```tsx
interface StanzaCompactProps {
  stanza: Stanza;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  bpmInherited: boolean;
}

export function StanzaCompact({ stanza, effectiveBpm, effectiveNote, bpmInherited }: StanzaCompactProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 2, padding: "6px 8px",
      background: "var(--surface-raised)", border: "1px solid var(--rule)",
      borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-sketch)",
      minWidth: 52, flexShrink: 0,
    }}>
      <TimeSigStack num={stanza.num} denom={stanza.denom} size="sm" />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-color)" }}>
        {stanza.bars}×
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: bpmInherited ? "var(--faint)" : "var(--ink-soft)",
      }}>
        {effectiveBpm}
      </span>
    </div>
  );
}
```

### `web/src/components/song/StanzaExpanded.tsx`

Inline editor for a single stanza shown in the expanded section row. Note type editing is optional for the first version.

```tsx
interface StanzaExpandedProps {
  stanza: Stanza;
  index: number;
  effectiveBpm: number;
  effectiveNote: NoteValue;
  formBpm: number;
  sectionBpm?: number;
  onChange: (updated: Stanza) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function StanzaExpanded({
  stanza, effectiveBpm, effectiveNote, formBpm, sectionBpm,
  onChange, onDelete, onDuplicate,
}: StanzaExpandedProps) {
  const DENOMS = [1,2,4,8,16,32,64];

  return (
    <div style={{
      padding: 12, background: "var(--surface-alt)",
      border: "1px solid var(--rule)", borderRadius: "var(--radius-md)",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Bars + time sig row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Stepper label="Bars" value={stanza.bars} min={1} onChange={(v) => onChange({ ...stanza, bars: v })} />
        <Stepper label="Num" value={stanza.num} min={1} max={64}
          onChange={(v) => onChange({ ...stanza, num: v })} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>Denom</label>
          <select
            value={stanza.denom}
            onChange={(e) => onChange({ ...stanza, denom: parseInt(e.target.value, 10) })}
            style={{
              padding: "8px 12px", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--rule)", background: "var(--surface)",
              color: "var(--ink)", fontFamily: "var(--font-mono)", minHeight: 44,
            }}
          >
            {DENOMS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Tempo override row */}
      <TempoEditor
        bpm={effectiveBpm}
        note={effectiveNote}
        bpmOverridden={stanza.bpm !== undefined}
        noteOverridden={stanza.note !== undefined}
        onBpmChange={(v) => onChange({ ...stanza, bpm: v })}
        onNoteChange={(v) => onChange({ ...stanza, note: v })}
        onBpmClear={() => onChange({ ...stanza, bpm: undefined })}
        onNoteClear={() => onChange({ ...stanza, note: undefined })}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="chip" onClick={onDuplicate}
          style={{ fontSize: 13, minHeight: 36, padding: "6px 12px" }}>Duplicate</button>
        <button className="chip" onClick={onDelete}
          style={{ fontSize: 13, minHeight: 36, padding: "6px 12px", borderColor: "var(--accent)", color: "var(--accent)" }}>
          Delete
        </button>
      </div>
    </div>
  );
}
```

### `web/src/components/song/FormTabs.tsx`

Horizontal scrollable list of form tabs plus a `+` chip.

```tsx
interface FormTabsProps {
  forms: SongForm[];
  activeFormId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function FormTabs({ forms, activeFormId, onSelect, onCreate }: FormTabsProps) {
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto", padding: "8px 0",
      borderBottom: "1px solid var(--rule)",
    }}>
      {forms.map((f) => {
        const active = f.id === activeFormId;
        return (
          <button
            key={f.id}
            className={active ? "chip solid" : "chip"}
            onClick={() => onSelect(f.id)}
            style={{ flexShrink: 0 }}
          >
            {f.name}
          </button>
        );
      })}
      <button className="chip ghost" onClick={onCreate}
        style={{ flexShrink: 0 }}>+</button>
    </div>
  );
}
```

### `web/src/components/song/FormStringEditor.tsx`

The type-string pattern editor. Shows pill tokens for each letter in the current pattern, with a hidden input for typing.

```tsx
import { useState, useRef } from "react";
import { parsePattern, serialisePattern } from "./pattern";
import { LetterBadge } from "./LetterBadge";

interface FormStringEditorProps {
  pattern: string[];
  onChange: (letters: string[]) => void;  // called only when pattern is valid
}

export function FormStringEditor({ pattern, onChange }: FormStringEditorProps) {
  const [draft, setDraft] = useState(serialisePattern(pattern));
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (value: string) => {
    setDraft(value);
    const { letters, errors: errs } = parsePattern(value);
    if (errs.length === 0) {
      onChange(letters);
      setErrors([]);
    } else {
      setErrors(errs.map((e) => e.message));
    }
  };

  // Keep draft in sync when pattern changes from outside (e.g. section deleted)
  const serialised = serialisePattern(pattern);
  if (draft !== serialised && errors.length === 0) {
    // Only sync when not mid-edit (no errors means valid committed state)
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)", display: "block", marginBottom: 4 }}>
        Pattern (type letters, use A×2 for repeats)
      </label>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. I A A B A C"
        style={{
          width: "100%", padding: "10px 12px",
          fontFamily: "var(--font-mono)", fontSize: 16,
          background: "var(--surface)", color: "var(--ink)",
          border: `1px solid ${errors.length ? "var(--accent)" : "var(--rule)"}`,
          borderRadius: "var(--radius-sm)", minHeight: 44,
        }}
      />
      {errors.length > 0 && (
        <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 4, fontFamily: "var(--font-hand)" }}>
          {errors[0]}
        </div>
      )}
      {/* Token pills (visual echo) */}
      {pattern.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {pattern.map((letter, i) => (
            <LetterBadge key={i} letter={letter} size={28} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### `web/src/components/song/RunBar.tsx`

Sticky bottom bar with the "RUN" button.

```tsx
interface RunBarProps {
  onRun: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function RunBar({ onRun, disabled, loading }: RunBarProps) {
  return (
    <div style={{
      position: "sticky", bottom: 0,
      background: "var(--surface-alt)",
      borderTop: "1px solid var(--rule)",
      padding: "12px var(--spacing-md)",
      display: "flex", justifyContent: "center",
    }}>
      <button
        className="primary"
        onClick={onRun}
        disabled={disabled || loading}
        style={{ width: "100%", maxWidth: 360, fontSize: 18, minHeight: 56 }}
      >
        {loading ? "Writing…" : "RUN ▸ play w/ click"}
      </button>
    </div>
  );
}
```

### `web/src/components/song/index.ts`

```ts
export { LetterBadge } from "./LetterBadge";
export { TimeSigStack } from "./TimeSigStack";
export { NoteGlyph } from "./NoteGlyph";
export { TempoEditor } from "./TempoEditor";
export { StanzaCompact } from "./StanzaCompact";
export { StanzaExpanded } from "./StanzaExpanded";
export { FormTabs } from "./FormTabs";
export { FormStringEditor } from "./FormStringEditor";
export { RunBar } from "./RunBar";
export { getLetterColor, LETTER_COLORS } from "./colors";
```

## Existing Code References

- `web/src/api/client.ts` (task-05) — `NoteValue`, `Stanza`, `SongForm`, `Section` types
- `web/src/components/ui/index.ts` (task-07) — `Stepper`, `Chip` imports
- `web/src/components/song/pattern.ts` (task-09) — `parsePattern`, `serialisePattern`
- `designs/Song Form Editor — Wireframes.html` — visual reference for the compact card and expanded stanza layout

## Implementation Details

- All components use inline styles + existing global CSS classes; no new CSS files needed.
- Import `Stanza`, `SongForm`, `Section`, `NoteValue` from `"../../api/client"` (not from store).
- `StanzaExpanded` imports `Stepper` from `"../ui/Stepper"` and `TempoEditor` from `"./TempoEditor"`.
- `FormStringEditor` imports `parsePattern` and `serialisePattern` from `"./pattern"`.

## Acceptance Criteria

- [ ] `pnpm -F web build` compiles without TypeScript errors.
- [ ] All 10 component files exist under `web/src/components/song/`.
- [ ] `colors.ts` exports `LETTER_COLORS` with all 26 letters using CSS variable references.
- [ ] `TempoEditor` shows the note glyph faint when `noteOverridden` is false, bold when true.
- [ ] `FormStringEditor` shows a red border when `parsePattern` returns errors.
- [ ] `RunBar` is `position: sticky; bottom: 0`.
- [ ] `FormTabs` renders active tab with `className="chip solid"`, inactive with `"chip"`.
