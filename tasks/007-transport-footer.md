# Task 007: Frontend — TransportFooter Component

## Objective

Implement `web/src/components/rehearsal/TransportFooter.tsx` — the fixed bottom action bar containing the primary action button (contextual label/behavior) and the always-visible metronome toggle.

## Context

The transport footer is fixed at `bottom: takes.length > 0 ? 28 : 0` (shifts up when the playback drawer pull tab is visible). It has `z-index: 100`.

The metronome button state mirrors `store.transport.metronome` (Q6: reflective, not optimistic). Tapping it calls `api.toggleMetronome()` directly (no store action needed — WS feedback updates the store).

The action button behavior depends on `rehearsalStatus`:
- `idle` → "Start Rehearsal" → calls `store.startRehearsal()`
- `discussion` → "Start Take" → calls `store.setCategory('take')`
- `take` → "End Take" → calls `store.setCategory('discussion')`
- `playback` → "Stop" → calls `store.stopPlayback()`

## Requirements

### `web/src/components/rehearsal/TransportFooter.tsx`

```tsx
export function TransportFooter() { ... }
```

**Outer div:**
```css
position: fixed; bottom: {takes.length > 0 ? 28 : 0}px;
left: 0; right: 0; z-index: 100;
background: var(--surface-raised);
border-top: 1px solid var(--rule);
box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
transition: bottom 0.3s ease;
```

**Action row:**
```css
display: flex; align-items: center; gap: 8px; padding: 8px 16px 12px;
```

**Main action button (flex: 1):**

| status | label | icon | bg |
|--------|-------|------|----|
| idle | "Start Rehearsal" | mic SVG | `var(--accent)` |
| discussion | "Start Take" | metronome SVG | `var(--accent)` |
| take | "End Take" | stop SVG | `var(--ink)` |
| playback | "Stop" | stop SVG | `var(--green)` |

Base style: `min-height: 48px; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; color: #fff; border: none; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-family: var(--font-body);`

Use the existing SVG icon patterns from the prototype (inline SVG elements or extracted icon components). Do NOT import from an external library — define minimal SVG inline or in a local `icons.tsx` helper.

**Data testid:** `data-testid="action-button"`

**Metronome toggle (always visible):**
- `width: 48px; height: 48px; border-radius: var(--radius-md); flex-shrink: 0`
- Active: `background: var(--accent-soft); border: 1px solid var(--accent); color: var(--accent)`
- Inactive: `background: var(--surface-alt); border: 1px solid var(--rule); color: var(--muted)`
- State: `store.transport.metronome ?? false`
- On click: call `api.toggleMetronome()` (imported directly from `web/src/api/client.ts`)
- `data-testid="metronome-toggle"`
- Shows a metronome SVG icon (active state tilts the pendulum visually as in prototype)

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/app.jsx` lines 432–477 — reference implementation
- `/home/user/rehearsaltools/designs/2026-04-20/components.jsx` lines 78–84 — `IconMetronome` SVG definition
- `/home/user/rehearsaltools/web/src/api/client.ts` — `api.toggleMetronome()`, `api.stop()`
- `/home/user/rehearsaltools/web/src/store.ts` — `rehearsalStatus`, `takes`, `transport.metronome`

## Implementation Details

- The `bottom` offset uses CSS transition — compute as a Zustand selector: `const bottomOffset = takes.length > 0 ? 28 : 0`
- Icon SVGs: copy the minimal SVG paths from the prototype's `components.jsx` (IconMic, IconStop, IconMetronome, IconPlay are all defined there as simple SVG elements)
- Create a local `web/src/components/rehearsal/icons.tsx` file with the 4 icons as React components; import from there in TransportFooter

## Acceptance Criteria

- [ ] Footer is fixed at bottom with correct z-index
- [ ] When `takes` array has items, footer is offset by 28px upward
- [ ] Action button shows "Start Rehearsal" when idle
- [ ] Action button shows "Start Take" when discussion
- [ ] Action button shows "End Take" when take
- [ ] Action button shows "Stop" when playback
- [ ] Clicking action button calls correct store action
- [ ] Metronome toggle reflects `transport.metronome` from store (no local state)
- [ ] Clicking metronome calls `api.toggleMetronome()`
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/TransportFooter.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **idle state**: action button reads "Start Rehearsal"
2. **discussion state**: action button reads "Start Take"
3. **take state**: action button reads "End Take"
4. **playback state**: action button reads "Stop"
5. **start rehearsal click**: sets `rehearsalStatus` (mock `store.startRehearsal` and assert it's called)
6. **end take click**: mock `store.setCategory`, assert called with `'discussion'`
7. **metronome toggle off**: button has inactive styling when `transport.metronome = false`
8. **metronome toggle on**: button has active styling when `transport.metronome = true`
9. **metronome click**: spy on `api.toggleMetronome`, click button, assert spy called
10. **drawer offset**: when `takes` has 1 item, footer has `bottom: 28px` style

### TDD Process

1. Write failing tests
2. Implement component
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store), 005 (App structure, stub replaced here)
- Blocks: Nothing hard

## Parallelism

Can run in parallel with 006, 008, 009, 010, 011.
