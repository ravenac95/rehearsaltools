# Task 07: Update StanzaExpanded to mirror WF2 layout

## Objective

Update the expanded stanza editor to lead with the WF2 two-column box as a live preview, followed by the editing controls (Bars / Num / Denom / Tempo / Actions).

## Dependencies

- Task 02 (Stepper accepts typed input)
- Task 05 (TempoEditor uses slider)
- Task 06 (StanzaCompact renders two-column box)

## Files to modify

- `web/src/components/song/StanzaExpanded.tsx`

## Implementation

At the top of the render:

- Render a `<StanzaCompact />` as a read-only summary using the current stanza values (`effectiveBpm`, `effectiveNote`, and `bpmInherited = stanza.bpm === undefined`).

Below the summary, keep the existing controls with these adjustments:

- `Bars` Stepper: no changes needed (Stepper now accepts typed input per Task 02).
- `Num` Stepper: unchanged.
- `Denom` select: unchanged.
- `TempoEditor`: unchanged call site (it now uses a slider internally per Task 05).
- Duplicate / Delete buttons: unchanged.

No prop signature change.

## Verification

```bash
cd web && pnpm build
```

Visually confirm in Storybook `StanzaExpanded` that:
1. The two-column box appears at the top and reflects the edited values live.
2. Typing in the Bars field updates the summary.
3. Dragging the BPM slider updates the summary.
