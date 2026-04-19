# Task 08: Retheme existing screens and app shell to wireframe style

## Objective

Update `App.tsx`, `Dashboard.tsx`, `Regions.tsx`, and `Mixdown.tsx` to use the new theme variables and shared UI primitives, and add the `ThemeToggle` to the persistent header.

## Dependencies

- task-06-theme-system
- task-07-shared-ui-primitives

## Files

- **Modify** `web/src/App.tsx`
- **Modify** `web/src/screens/Dashboard.tsx`
- **Modify** `web/src/screens/Regions.tsx`
- **Modify** `web/src/screens/Mixdown.tsx`

## Context

Read all four files before starting. The goal is a visual retheme — the functional logic stays identical. Replace raw `className` strings with the shared `Card`, `Button`, `Chip`, `Stepper` components where it makes the code cleaner, but you may also just rely on the updated CSS classes if that is simpler. The key requirements are:

1. The `ThemeToggle` appears in the header on every screen.
2. Body text uses `var(--font-hand)` (already set globally in task-06's `styles.css`).
3. Numeric/tech values use `var(--font-mono)`.
4. Card surfaces use `var(--surface-alt)` / `--shadow-card`.
5. All hardcoded colour strings in `style={{}}` props are removed and replaced with CSS variable references.

At this point `Sections.tsx` and `SongForm.tsx` are still in the codebase (deleted in task-11). The `App.tsx` still imports them. Leave those imports and tab entries intact for now — they will be removed in task-11.

## Requirements

### `web/src/App.tsx`

1. Import `ThemeToggle` from `../components/ui` (or direct path).
2. Add a persistent header bar above `.tabs` that contains the app name on the left and `<ThemeToggle />` on the right:

```tsx
<div className="app-header">
  <span className="app-header__title">RehearsalTools</span>
  <ThemeToggle />
</div>
```

Add to `styles.css`:
```css
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px var(--spacing-md);
  background: var(--surface-alt);
  border-bottom: 1px solid var(--rule);
}
.app-header__title {
  font-family: var(--font-marker);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
```

3. Remove hardcoded `style={{ color: "#e54" }}` from the error span — replace with `style={{ color: "var(--accent)" }}`.
4. The tab bar, screen, and status-bar remain structurally the same; the CSS in task-06 already rethemed them. No other changes needed.

### `web/src/screens/Dashboard.tsx`

Goals: remove all hardcoded colour strings; optionally use `<Card>`, `<Button>`, `<Stepper>`.

Specific changes:
- Replace `style={{ minHeight: 40, padding: "6px 12px" }}` etc. on inner buttons with variant props.
- The inline `style={{ color: "#e54" }}` or similar hardcoded colours → use `var(--accent)` or `var(--muted-color)`.
- The `<div className="card">` blocks can stay as-is (CSS handles them).
- The tempo input: use `var(--font-mono)` for the numeric input if desired: `style={{ fontFamily: "var(--font-mono)" }}`.
- No functional changes.

### `web/src/screens/Regions.tsx`

Goals: remove hardcoded inline colour strings.

Specific changes:
- No inline colours in the current file (it uses className only) — but review for any hardcoded values.
- Ensure the `<input>` and region card styling is visually consistent with the paper theme (CSS already handles `.card`, `.row`, `.primary`).
- No functional changes.

### `web/src/screens/Mixdown.tsx`

Goals: remove hardcoded inline colour strings.

Specific changes:
- No inline colours in the current file — review and confirm.
- No functional changes.

## Existing Code References

- `web/src/App.tsx` — add header, ThemeToggle, remove hardcoded colour
- `web/src/screens/Dashboard.tsx` — remove hardcoded colours from `style={{}}` props
- `web/src/components/ui/index.ts` (task-07) — import Chip, Card, Button, ThemeToggle
- `web/src/styles.css` (task-06) — add `.app-header` and `.app-header__title` rules

## Acceptance Criteria

- [ ] `pnpm -F web build` compiles without errors.
- [ ] The `ThemeToggle` chip is visible in the top bar on every screen.
- [ ] Tapping the toggle cycles the theme; paper/night-paper palette applies immediately.
- [ ] No hardcoded colour strings (`#0b0b0d`, `#18181c`, `#e54`, `#2a2a30`, etc.) remain in any `style={{}}` prop on these four files.
- [ ] Transport, Regions, and Mixdown remain fully functional (all buttons work).
- [ ] The tab bar still shows all five tabs (Song, Sections, Transport, Regions, Mixdown — Sections tab is removed in task-11).
