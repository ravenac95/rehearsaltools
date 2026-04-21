# Task 006: Frontend — RehearsalHeader and StatusBadge Components

## Objective

Implement `RehearsalHeader` and `StatusBadge` as production-quality React components, replacing the stubs created in task 005. These live in `web/src/components/rehearsal/`.

## Context

The header is a horizontal flex bar, sticky at the top (`z-index: 50`), containing:
1. **Rehearsal Type Pill** — left, flex-shrink 0, taps to open `RehearsalTypeSheet`
2. **StatusBadge** — flex: 1, centered, tappable when `discussion` or `take` to toggle category
3. **Hamburger button** — right, flex-shrink 0, taps to open `HamburgerMenu`

The `StatusBadge` is the tappable status indicator. Tapping it when in `discussion` state calls `store.setCategory('take')`; tapping when in `take` state calls `store.setCategory('discussion')`. The badge toggle does NOT start a new take/discussion — it re-tags the currently-recording segment by closing the open segment and opening a new one of the flipped category (this is handled by the server; the badge just calls `set-category`).

All state comes from `useStore`. No local state in `RehearsalHeader` except `menuOpen` which is already in the store.

## Requirements

### `web/src/components/rehearsal/RehearsalHeader.tsx`

```tsx
// Reads from store:
// - rehearsalType, setTypePickerOpen, setMenuOpen
// Renders: rehearsal type pill + StatusBadge + hamburger button

export function RehearsalHeader() { ... }
```

**Layout:**
```css
display: flex; align-items: center; gap: 8px;
padding: 10px 16px;
border-bottom: 1px solid var(--rule);
background: var(--surface);
position: sticky; top: 0; z-index: 50;
```

**Rehearsal Type Pill:**
- `background: var(--surface-alt)`, `border: 1px solid var(--rule)`, `border-radius: var(--radius-pill)`
- `padding: 7px 12px`, `font-size: 13px`, `font-weight: 600`
- Shows: `{rehearsalType?.emoji ?? '🎸'} {rehearsalType?.name ?? 'Full Band'} ▾`
- Calls `store.setTypePickerOpen(true)` on click
- `data-testid="rehearsal-type-pill"`

**Hamburger button:**
- No background, no border, `font-size: 22px`, `cursor: pointer`
- Shows `☰`
- Calls `store.setMenuOpen(true)` on click
- `data-testid="hamburger-button"`

### `web/src/components/rehearsal/StatusBadge.tsx`

```tsx
// Reads from store:
// - rehearsalStatus, transport.position, currentSegmentStart
// - setCategory (action)
// Computes: elapsed, label, colors

export function StatusBadge() { ... }
```

**Status config:**
```ts
const STATUS = {
  idle:       { bg: 'var(--surface-alt)',  color: 'var(--muted)',  border: 'var(--rule)',  dot: 'var(--faint)', label: 'Not started', pulse: false },
  discussion: { bg: 'var(--amber-soft)',   color: 'var(--amber)',  border: 'var(--amber)', dot: 'var(--amber)', label: 'Discussion',  pulse: '2s'  },
  take:       { bg: 'var(--accent-soft)',  color: 'var(--accent)', border: 'var(--accent)',dot: 'var(--accent)',label: 'Take',        pulse: '1.5s'},
  playback:   { bg: 'var(--green-soft)',   color: 'var(--green)',  border: 'var(--green)', dot: 'var(--green)', label: 'Playback',   pulse: false },
};
```

**Elapsed computation:**
```ts
const position = useStore(s => s.transport.position ?? 0);
const currentSegmentStart = useStore(s => s.currentSegmentStart);
const elapsed = currentSegmentStart !== null
  ? Math.max(0, position - currentSegmentStart)
  : 0;
```

**Format time:** `m:ss` (e.g. "1:05")

**Pill layout:**
- `flex: 1`, `padding: 7px 12px`, `border-radius: var(--radius-pill)`
- `display: flex; align-items: center; justify-content: center; gap: 6px`
- Background, border-color, text color from status config
- `border-width: 1.5px; border-style: solid`
- Tappable (cursor: pointer) when status is `discussion` or `take`; cursor: default otherwise
- `data-testid="status-badge"`

**Dot:**
- `width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0`
- Background from status config
- `animation: pulse {config.pulse} ease infinite` when pulse is set; `animation: none` otherwise

**Content:**
- Idle: just "Not started"
- Discussion/Take/Playback: dot + label + elapsed time (mono font, `font-size: 11px`, `opacity: 0.7`)
- Take label shows "Take" (not "Take N" — the number tracking is per the takes array, not local state)

**On click:**
```ts
const onClick = (rehearsalStatus === 'discussion')
  ? () => store.setCategory('take')
  : (rehearsalStatus === 'take')
  ? () => store.setCategory('discussion')
  : undefined;
```

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/app.jsx` lines 190–240 — reference implementation
- `/home/user/rehearsaltools/web/src/store.ts` — after task 003
- `/home/user/rehearsaltools/web/src/components/ui/` — existing button patterns

## Implementation Details

- Both components are pure presentational wrappers around `useStore` selectors — no props needed
- `StatusBadge` is a `<button>` element (or `<div>` with `role="button"` and `onClick`) for full accessibility
- Use `data-testid` attributes for test targeting
- The `pulse` animation class is defined in `styles.css` (task 004 adds `@keyframes pulse`)

## Acceptance Criteria

- [ ] `RehearsalHeader` renders type pill, StatusBadge, and hamburger
- [ ] Type pill opens the type picker sheet on click
- [ ] Hamburger opens the menu on click
- [ ] `StatusBadge` shows "Not started" when `rehearsalStatus === 'idle'`
- [ ] `StatusBadge` shows amber styling when `rehearsalStatus === 'discussion'`
- [ ] `StatusBadge` shows accent styling when `rehearsalStatus === 'take'`
- [ ] `StatusBadge` shows green styling when `rehearsalStatus === 'playback'`
- [ ] Elapsed time shown in `m:ss` format when status is not idle
- [ ] Badge tap calls `setCategory('take')` when in discussion state
- [ ] Badge tap calls `setCategory('discussion')` when in take state
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/StatusBadge.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **idle state**: renders "Not started", no elapsed time visible
2. **discussion state**: has amber background token class/style, shows "Discussion"
3. **take state**: shows "Take", has accent color style
4. **playback state**: shows "Playback", has green color style
5. **elapsed computation**: set `transport.position = 65`, `currentSegmentStart = 5`; assert "1:00" shown
6. **tap in discussion state**: calls `store.setCategory` with `'take'`
7. **tap in take state**: calls `store.setCategory` with `'discussion'`
8. **tap in idle state**: no action taken (no error)
9. **tap in playback state**: no action taken

### TDD Process

1. Write failing tests
2. Implement components
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store), 004 (CSS tokens for pulse animation), 005 (stub replaced here)
- Blocks: nothing hard; App.tsx already imports from this path

## Parallelism

Can run in parallel with 007, 008, 009, 010, 011 (all component tasks in same wave).
