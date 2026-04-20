# Task 09: Update Storybook stories for the new component APIs

## Objective

Update the Storybook stories for the components that changed so that Storybook still builds and the interactive stories still make sense.

## Dependencies

- Task 01 (pattern parser API changed — no more errors field)
- Task 04 (FormStringEditor has different internal interactions)
- Task 05 (TempoEditor is now a slider)
- Task 06 (StanzaCompact is the two-column box)
- Task 07 (StanzaExpanded leads with StanzaCompact)
- Task 08 (SectionRow is WF2 compact)

## Files to review / modify

- `web/src/components/song/FormStringEditor.stories.tsx` — remove any story that exercises `A×2` / `Ax2` input. Add stories for: empty, typical `AABAC`, with `definedLetters` that mark some unresolved letters. Drop any `play()` that uses `userEvent.type(...)` with digits (those now shake).
- `web/src/components/song/TempoEditor.stories.tsx` — ensure the slider renders; adjust any `play()` that clicks the old +/- buttons.
- `web/src/components/song/StanzaCompact.stories.tsx` — ensure arg shape still matches (include `effectiveNote`).
- `web/src/components/song/StanzaExpanded.stories.tsx` — no prop changes expected; just verify it still renders.
- `web/src/components/song/SectionRow.stories.tsx` — no prop changes expected.
- `web/src/screens/SongEditorPresentation.stories.tsx` — smoke check.

## Implementation

Open each story file; if it imports anything that no longer exists or passes args the component no longer accepts, fix the imports/args. Prefer removing dead `play()` assertions over rewriting them unless they test behavior that still applies.

## Verification

```bash
cd web && pnpm build
```

Storybook compile must succeed.

```bash
cd web && pnpm test
```

Test suite still passes.
