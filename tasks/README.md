# Task Plan: Sync Storybook with the rehearsal redesign

Source of truth: `/root/.claude/plans/the-previous-commit-did-proud-oasis.md`.

Each task refactors a single rehearsal component into a `<Name>Presentation.tsx` (pure) + container pattern and adds a co-located `<Name>Presentation.stories.tsx`.

Tasks 01–09 touch disjoint files and can run in any order. They all share the `web/src/components/rehearsal/` directory. Since the orchestrator runs sequentially, execute them in numeric order.

## Conventions (apply to every task)

1. Container file keeps its name (`<Name>.tsx`) and its public export symbol — `web/src/App.tsx` and the barrel `web/src/components/rehearsal/index.ts` must not need changes.
2. Presentation file is `<Name>Presentation.tsx` in the same directory; it exports `<Name>Presentation` and has **no `useStore`, no `useEffect` for data, no direct `api` calls** — pure render + props.
3. Story file is `<Name>Presentation.stories.tsx`, co-located. Follow the pattern in `web/src/screens/SongEditorPresentation.stories.tsx`:
   - `const noop = () => {};`
   - Fixture constants at top
   - `const meta = { title: "Rehearsal/<Name>", component: <Name>Presentation, parameters: { layout: "fullscreen" }, args: { ...baseArgs } } satisfies Meta<typeof <Name>Presentation>;`
   - Export multiple `Story`s as `args` overrides
4. The container re-renders identically for users — same DOM, same behavior. Existing tests under `web/tests/` must keep passing without modification. If a test imports something from the presentation file (it shouldn't — tests import the container symbol), adjust only the import path.
5. Storybook's `layout: "fullscreen"` works for most rehearsal components because they use `position: fixed`. When a component is an inline block, use default `layout: "padded"`.
6. **Do not** remove any components, barrel exports, or orphan code in this build.
