# Task 06: Rewrite StanzaCompact as two-column WF2 box

## Objective

Replace the vertical stanza card with a WF2 two-column box: time signature on the left, bars count + BPM readout on the right.

## Dependencies

None.

## Files to modify

- `web/src/components/song/StanzaCompact.tsx`

## Implementation

Update the `StanzaCompact` prop signature to also receive `effectiveNote` (already present) and render:

```
┌────┬──────────┐
│ 4  │  16×     │
│ ── │          │
│ 4  │  ♩=100   │
└────┴──────────┘
```

- Outer `<div>`: `display: "flex"`, `border: "1.5px solid var(--ink)"`, `borderRadius: 8`, `background: var(--surface)`, `overflow: "hidden"`, `boxShadow: "2px 2px 0 var(--ink-soft)"`, `minWidth: 78`, `flexShrink: 0`.
- Left column: `padding: "6px 7px"`, `borderRight: "1.5px solid var(--rule)"`, `display: "flex"`, `alignItems: "center"`, `background: var(--surface-alt)`. Contains `<TimeSigStack num={stanza.num} denom={stanza.denom} size="md" />`.
- Right column: `padding: "5px 9px 5px 8px"`, `display: "flex"`, `flexDirection: "column"`, `justifyContent: "center"`, `gap: 1`, `minWidth: 44`.
  - Top line: `{stanza.bars}×` — `var(--font-hand)`, fontSize 16, fontWeight 700, lineHeight 1, color `var(--ink)`.
  - Bottom line: `<NoteGlyph note={effectiveNote} inherited={bpmInherited} size={11} /> ={effectiveBpm}` — wrapping `<div>` with mono 10px, fontWeight bold when not inherited, color `var(--ink)` or `var(--faint)` accordingly. Render the `=` and BPM number together.

Keep the existing props interface (`stanza`, `effectiveBpm`, `effectiveNote`, `bpmInherited`) — `effectiveNote` is already passed.

## Verification

```bash
cd web && pnpm build
```

In the Storybook story `StanzaCompact`, verify the two-column layout matches WF2's `StanzaCompact` component.
