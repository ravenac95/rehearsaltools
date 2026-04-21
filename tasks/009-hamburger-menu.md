# Task 009: Frontend — HamburgerMenu Component

## Objective

Implement `web/src/components/rehearsal/HamburgerMenu.tsx` — the slide-in panel from the right with nav items and a collapsible Advanced section (Transport and Debug Log stubs only; Regions and Mixdown are out of scope and must not appear).

## Context

The menu slides in from the right, 260px wide, with a dark overlay. The ThemeToggle component already exists at `web/src/components/ui/ThemeToggle.tsx`. The Advanced section shows only Transport and Debug Log as stub buttons (no functionality). Regions and Mixdown are explicitly omitted.

The menu closes when:
1. User taps the overlay backdrop
2. User taps "✕" close button
3. User taps "Main View" (just closes menu, no navigation needed)

## Requirements

### `web/src/components/rehearsal/HamburgerMenu.tsx`

```tsx
export function HamburgerMenu() { ... }
```

**Visibility:** render nothing (return null) when `store.menuOpen === false`.

**Overlay:**
```css
position: fixed; inset: 0; z-index: 200;
background: rgba(0,0,0,0.4);
```
Click on overlay (not panel) → `store.setMenuOpen(false)`

**Panel:**
```css
position: absolute; top: 0; right: 0;
width: 260px; height: 100%;
background: var(--surface-raised);
box-shadow: -4px 0 20px rgba(0,0,0,0.1);
padding: 16px;
display: flex; flex-direction: column; gap: 4px;
overflow-y: auto;
```

**Header row:**
```
"Menu" (font-weight: 700, font-size: 16px) + "✕" button (right-aligned)
```
"✕" click → `store.setMenuOpen(false)`

**Menu items:**

1. **Main View button:**
   ```css
   background: var(--accent-soft); border: 1px solid var(--accent);
   color: var(--accent); font-weight: 700; font-size: 14px;
   padding: 12px 14px; border-radius: var(--radius-md); width: 100%;
   text-align: left; cursor: pointer;
   ```
   Label: "🎵 Main View"
   On click: `store.setMenuOpen(false)`
   `data-testid="menu-main-view"`

2. **Theme toggle:** Use existing `ThemeToggle` component from `web/src/components/ui/ThemeToggle.tsx`, OR replicate its behavior inline as a button:
   ```
   Reads theme from localStorage / store; toggles data-theme on documentElement
   Label: theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'
   ```
   Check how `ThemeToggle` works currently — if it's a self-contained component with its own state, use it directly. If it needs props, wire it appropriately.
   `data-testid="menu-theme-toggle"`

3. **Divider:** `<div style={{ height: 1, background: 'var(--rule)', margin: '8px 0' }} />`

4. **ADVANCED header (collapsible):**
   ```css
   background: transparent; border: none;
   font-size: 12px; font-family: var(--font-mono);
   color: var(--muted); text-align: left;
   padding: 12px 14px; cursor: pointer; width: 100%;
   display: flex; align-items: center; gap: 6px;
   ```
   Label: chevron + "ADVANCED"
   Local state `showAdvanced` (useState) controls expansion — this is UI-only state, not in the global store.
   `data-testid="menu-advanced-toggle"`

5. **Advanced items** (when `showAdvanced = true`, indented 8px):
   - "Transport" stub button (calls nothing; `data-testid="menu-transport"`)
   - "Debug Log" stub button (calls nothing; `data-testid="menu-debug-log"`)
   Both styled as secondary/ghost buttons.
   **Do NOT include Regions or Mixdown buttons.**

## Existing Code References

- `/home/user/rehearsaltools/designs/2026-04-20/app.jsx` lines 565–629 — reference implementation (ignore Regions/Mixdown items)
- `/home/user/rehearsaltools/web/src/components/ui/ThemeToggle.tsx` — existing theme toggle
- `/home/user/rehearsaltools/web/src/store.ts` — `menuOpen`, `setMenuOpen`

## Implementation Details

- `showAdvanced` is `useState(false)` inside the component (not in global store)
- The panel slide-in animation is optional for MVP (static position is fine as long as overlay/panel appear correctly)
- Import `ThemeToggle` from `../ui/ThemeToggle` — read the current component first to understand its props

## Acceptance Criteria

- [ ] Menu is not rendered when `menuOpen === false`
- [ ] Menu renders overlay + panel when `menuOpen === true`
- [ ] Tapping overlay closes menu
- [ ] "✕" button closes menu
- [ ] "Main View" button closes menu
- [ ] Theme toggle works (toggles `data-theme` attribute)
- [ ] ADVANCED section is collapsed by default
- [ ] Clicking ADVANCED expands it to show Transport and Debug Log buttons
- [ ] Regions and Mixdown buttons do NOT appear
- [ ] Existing tests still pass

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/HamburgerMenu.test.tsx`
- **Test framework:** Vitest + @testing-library/react
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **hidden when menuOpen false**: set store `menuOpen: false`, render — menu not in DOM
2. **visible when menuOpen true**: set `menuOpen: true`, menu panel in DOM
3. **close on overlay click**: click overlay div, assert `store.setMenuOpen` called with false
4. **close on X click**: click "✕", assert `store.setMenuOpen(false)`
5. **Main View click**: closes menu
6. **Advanced collapsed by default**: Transport button not visible initially
7. **Advanced expand**: click ADVANCED toggle, Transport and Debug Log buttons appear
8. **No Regions button**: after expanding Advanced, no button with text "Regions" exists
9. **No Mixdown button**: no button with text "Mixdown" exists

### TDD Process

1. Write failing tests
2. Implement component
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 003 (store), 005 (stub replaced here)
- Blocks: Nothing hard

## Parallelism

Can run in parallel with 006, 007, 008, 010, 011.
