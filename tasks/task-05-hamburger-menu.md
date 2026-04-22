# Task 05: HamburgerMenu — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/HamburgerMenu.tsx` into `HamburgerMenuPresentation` (pure) + `HamburgerMenu` (thin container) and add stories.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/HamburgerMenuPresentation.tsx`
- **New:** `web/src/components/rehearsal/HamburgerMenuPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/HamburgerMenu.tsx` — thin container

## Implementation

### `HamburgerMenuPresentation.tsx`

The local `showAdvanced` state stays inside the presentation component — it's UI-only, no store involvement. Keep `useState(false)` there.

Props:
```ts
export interface HamburgerMenuPresentationProps {
  open: boolean;
  onClose: () => void;
  themeToggle: ReactNode;    // slot — container passes <ThemeToggle/>, stories pass <ThemeTogglePresentation .../>
}
```

Replace `<ThemeToggle />` with `{themeToggle}`. Keep `onClose` wired to both the overlay click and the close-X button and the "Main View" button (which today calls `setMenuOpen(false)`).

### `HamburgerMenu.tsx` (container)

```tsx
export function HamburgerMenu() {
  const open = useStore((s) => s.menuOpen);
  const setMenuOpen = useStore((s) => s.setMenuOpen);
  return (
    <HamburgerMenuPresentation
      open={open}
      onClose={() => setMenuOpen(false)}
      themeToggle={<ThemeToggle />}
    />
  );
}
```

### Stories

- `title: "Rehearsal/HamburgerMenu"`
- `parameters: { layout: "fullscreen" }`
- Import `ThemeTogglePresentation` from `../ui/ThemeToggle` for the slot
- baseArgs: open=true, onClose=noop, themeToggle=`<ThemeTogglePresentation pref="system" onCycle={noop} />`
- Stories:
  - `Open` (default, pref=`"system"`)
  - `Closed` — open=false (renders nothing)
  - `OpenLightTheme` — themeToggle with pref=`"light"`
  - `OpenDarkTheme` — themeToggle with pref=`"dark"`

Note: The "ADVANCED" expand/collapse is local state — user interaction works automatically in each story.

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/HamburgerMenu.test.tsx` still passes unchanged
- Stories render; clicking "ADVANCED" expands in the Open story
