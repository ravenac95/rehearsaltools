# Task 10: Final verification pass

## Objective

Run `pnpm --filter web build`, `pnpm --filter web test`, and `pnpm --filter web build-storybook` to confirm all acceptance criteria pass; document any warnings; make no source changes.

## Dependencies

- Depends on: task-09-split-songeditor (all prior tasks must be complete)

## Files to create/modify

None — this task makes no source changes. It is a pure verification gate.

## Implementation notes

Run each command in sequence from the monorepo root and capture the output:

```sh
cd /home/user/rehearsaltools

# 1. TypeScript + Vite build (catches type errors across the whole app)
pnpm --filter web build

# 2. Vitest suite (existing tests must still pass)
pnpm --filter web test

# 3. Storybook static build (compiles all story files)
pnpm --filter web build-storybook
```

### What to check in `build-storybook` output

- Count the number of story files compiled. Expect at least 19:
  - UI primitives: Button, Card, Chip, Stepper, ThemeTogglePresentation (5)
  - Simple song components: LetterBadge, NoteGlyph, TimeSigStack, RunBar, FormTabs,
    StanzaCompact, TempoEditor, StanzaExpanded (8)
  - Stateful song components: SectionRow, FormStringEditor (2)
  - Screen presentations: DashboardPresentation, RegionsPresentation,
    MixdownPresentation, SongEditorPresentation (4)
  - Total: 19

- If `build-storybook` exits non-zero: read the error message, identify which story file
  or config file is causing the failure, fix it, and re-run.

### Acceptable warnings (do not treat as failures)

- Storybook peer-dependency version mismatches in pnpm output (common with Storybook 8 + Vite)
- Storybook warnings about `@storybook/blocks` not being used if no MDX docs are written
- Vite/Rollup chunk size warnings (pre-existing, not introduced by this work)

### Unacceptable results (must fix before marking task complete)

- Any TypeScript type error in `pnpm --filter web build`
- Any failing test in `pnpm --filter web test`
- Non-zero exit code from `pnpm --filter web build-storybook`
- Fewer than 19 story files compiled

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0
- [ ] `pnpm --filter web test` exits 0
- [ ] `pnpm --filter web build-storybook` exits 0
- [ ] At least 19 story files appear in the Storybook build output
- [ ] No new TypeScript `any` casts introduced anywhere in the codebase
