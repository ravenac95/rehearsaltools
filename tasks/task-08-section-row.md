# Task 08: Update SectionRow to WF2 compact collapsible row

## Objective

Update `SectionRow` to match WF2: a compact header row (letter badge + clipped stanza strip + compact BPM readout + chevron) with an active state, and an inline expanded editor below.

## Dependencies

- Task 06 (StanzaCompact uses the two-column box)

## Files to modify

- `web/src/components/song/SectionRow.tsx`

## Implementation

Keep the existing logic (state for `expanded`, `expandedStanzaIdx`, update/delete/duplicate/add stanza handlers). Restyle the header and frame:

- Outer container: `border: "1.5px solid var(--rule)"` when collapsed, `"1.5px solid var(--ink)"` when expanded. `borderRadius: 10`, `background: var(--surface)`, `overflow: "hidden"`. When expanded add `boxShadow: "2px 2px 0 var(--ink)"`.

- Header row (clickable, toggles `expanded`):
  - `display: "flex"`, `alignItems: "center"`, `gap: 10`, `padding: "8px 10px"`, `borderBottom: expanded ? "1.5px solid var(--rule)" : "none"`, `cursor: "pointer"`.
  - `<LetterBadge letter={section.letter} size={32} />`
  - Middle: a stanza strip wrapped in a relative container so we can fade the right edge:
    - Inner strip: `display: "flex"`, `gap: 4`, `flexWrap: "nowrap"`, `overflow: "hidden"`, `flex: 1`, `minWidth: 0`. Render `<StanzaCompact />` for each stanza (pass `effectiveBpm`, `effectiveNote`, `bpmInherited`).
    - Right fade overlay: `position: "absolute"`, right/top/bottom 0, `width: 18`, `background: "linear-gradient(to right, transparent, var(--surface))"`, `pointerEvents: "none"`.
  - Compact section BPM readout: flex row, mono 10px, `NoteGlyph` at size 12 + `={section.bpm ?? form.bpm}`. Bold ink when `section.bpm !== undefined`, else `--faint`.
  - Chevron: hand font 18px muted. `▾` when expanded, `▸` when collapsed.

- Expanded body (when `expanded`):
  - Padding `8px 10px 10px`.
  - Label: `EDITING {section.letter}` in mono 9px muted.
  - Existing content: `<TempoEditor />` for section override, divider, stanza list (each with label + `<StanzaExpanded />` when selected), `+ stanza` button, `× delete section` button.

Do not change the component's prop signature.

## Verification

```bash
cd web && pnpm build
```

In Storybook, verify `SectionRow` shows:
1. Collapsed header with WF2 layout.
2. Fade gradient on the right when stanzas overflow.
3. Active/expanded state with heavier border + shadow.
