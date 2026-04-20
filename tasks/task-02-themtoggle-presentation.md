# Task 2: Refactor ThemeToggle into container + presentation

## Objective

Split `ThemeToggle` into a pure `ThemeTogglePresentation` component and a thin container, both exported from `components/ui/index.ts`.

## Dependencies

- Depends on: task-01-install-storybook (Storybook config must be in place before we add co-located stories in task 3)

## Files to create/modify

- `/home/user/rehearsaltools/web/src/components/ui/ThemeToggle.tsx` — add `ThemeTogglePresentation` export alongside existing `ThemeToggle`
- `/home/user/rehearsaltools/web/src/components/ui/index.ts` — add `ThemeTogglePresentation` to exports

## Implementation notes

### ThemeToggle.tsx — after refactor

The file stays at the same path; both components live in the same file.

```tsx
import { useState } from "react";
import { cycleTheme, getThemePreference, type ThemePreference } from "../../theme";

const LABELS: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};
const ICONS: Record<ThemePreference, string> = {
  system: "◐",
  light: "☀",
  dark: "☾",
};

// ── Presentation ──────────────────────────────────────────────────────────────

interface ThemeTogglePresentationProps {
  pref: ThemePreference;
  onCycle: () => void;
}

export function ThemeTogglePresentation({ pref, onCycle }: ThemeTogglePresentationProps) {
  return (
    <button
      className="chip"
      onClick={onCycle}
      title={`Theme: ${LABELS[pref]} — tap to cycle`}
      style={{ fontSize: 13, minHeight: 36, padding: "6px 12px" }}
    >
      {ICONS[pref]} {LABELS[pref]}
    </button>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference);
  const handleClick = () => {
    const next = cycleTheme();
    setPref(next);
  };
  return <ThemeTogglePresentation pref={pref} onCycle={handleClick} />;
}
```

### index.ts — add new export

```ts
export { ThemeTogglePresentation } from "./ThemeToggle";
```

Add it on the line after the existing `ThemeToggle` export.

## Acceptance criteria

- [ ] `pnpm --filter web build` exits 0 — no type errors
- [ ] `pnpm --filter web test` exits 0 — existing suites unaffected
- [ ] `ThemeTogglePresentation` is importable from `components/ui`
- [ ] `ThemeToggle` still works in the app (the container re-export is unchanged)
- [ ] No `any` casts introduced
