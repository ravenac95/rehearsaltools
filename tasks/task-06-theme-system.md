# Task 06: Theme system — CSS variables, fonts, light/dark toggle

## Objective

Introduce the hand-drawn wireframe visual theme across the entire app: Google Fonts, CSS variable palette, `web/src/theme.ts` hook, and `ThemeToggle` component.

## Dependencies

- task-05-frontend-types-store-api (store must exist for clean build)

## Files

- **Modify** `web/index.html`
- **Modify** `web/src/styles.css` (complete rewrite)
- **Create** `web/src/theme.ts`
- **Create** `web/src/components/ui/ThemeToggle.tsx`
- **Create** `web/src/components/ui/` (directory — create first component here)

## Context

Read `web/src/styles.css` and `web/index.html` in full before starting. The current CSS is a dark-only system-font UI. The new CSS must:
- Use CSS custom properties driven by `[data-theme="light"]` / `[data-theme="dark"]` on `<html>`.
- Remove all hardcoded dark colours from the global rules.
- Preserve the structural rules that are still valid (box-sizing, `.app`, `.tabs`, `.screen`, `.status-bar` layout shapes) but retheme them with the new variables.
- Keep `.transport`, `.row`, `.stack`, `.spacer`, `.hr`, `.muted`, `table`/`th`/`td` rules but retheme with variables.

The existing screens (Dashboard, Regions, Mixdown) use `className="card"`, `className="chip"`, `className="primary"` etc. Those CSS class rules must continue to work after this task (they will be cleaned up per-screen in task-08).

## Requirements

### `web/index.html` — add Google Fonts

Add before `</head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

Also update `<meta name="theme-color">` to `#fbf8f1` (light default).

### `web/src/styles.css` — full rewrite with CSS variables

**Root / shared variables** (not inside any `[data-theme]`):
```css
:root {
  --font-hand:   'Kalam', 'Comic Sans MS', cursive;
  --font-marker: 'Caveat', 'Comic Sans MS', cursive;
  --font-mono:   'JetBrains Mono', 'Courier New', monospace;

  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-pill: 999px;

  --shadow-sketch: 2px 3px 0 rgba(0,0,0,0.12);
  --shadow-card:   3px 4px 0 rgba(0,0,0,0.10);
  --spacing-xs:    4px;
  --spacing-sm:    8px;
  --spacing-md:    16px;
  --spacing-lg:    24px;
}
```

**Light theme** (paper palette):
```css
[data-theme="light"] {
  --surface:     #fbf8f1;
  --surface-alt: #f3efe4;
  --surface-raised: #fff;
  --ink:         #1e1b16;
  --ink-soft:    #3a3630;
  --muted-color: #807a70;
  --faint:       #b8b2a5;
  --rule:        #cfc8b8;
  --accent:      #c73a1d;
  --accent-soft: rgba(199,58,29,0.12);

  /* Letter swatches — light-mode ink is dark */
  --letter-A-bg: #ff8a6b; --letter-A-ink: #5a1a00;
  --letter-B-bg: #5fb8b0; --letter-B-ink: #003c38;
  --letter-C-bg: #f5c147; --letter-C-ink: #4a3000;
  --letter-D-bg: #a08ad6; --letter-D-ink: #1e0050;
  --letter-E-bg: #9cc48a; --letter-E-ink: #1a3a10;
  --letter-F-bg: #e89abf; --letter-F-ink: #500030;
  --letter-G-bg: #7ec8e3; --letter-G-ink: #002a3a;
  --letter-H-bg: #f4a261; --letter-H-ink: #4a1a00;
  --letter-I-bg: #d9d2c2; --letter-I-ink: #3a3020;
  --letter-J-bg: #c9b1e0; --letter-J-ink: #1e0050;
  --letter-K-bg: #a8d8a8; --letter-K-ink: #0a2a0a;
  --letter-L-bg: #ffd6a5; --letter-L-ink: #4a2a00;
  --letter-M-bg: #b5ead7; --letter-M-ink: #003020;
  --letter-N-bg: #ffb7b2; --letter-N-ink: #500010;
  --letter-O-bg: #e2c9a6; --letter-O-ink: #3a2000;
  --letter-P-bg: #c7ceea; --letter-P-ink: #1e2050;
  --letter-Q-bg: #b5d5c5; --letter-Q-ink: #0a2a1a;
  --letter-R-bg: #f0c4d4; --letter-R-ink: #500030;
  --letter-S-bg: #d4e6f1; --letter-S-ink: #002040;
  --letter-T-bg: #fce4d6; --letter-T-ink: #4a1a00;
  --letter-U-bg: #e8daef; --letter-U-ink: #2a0050;
  --letter-V-bg: #d5f5e3; --letter-V-ink: #003020;
  --letter-W-bg: #fdebd0; --letter-W-ink: #4a2000;
  --letter-X-bg: #d6eaf8; --letter-X-ink: #002040;
  --letter-Y-bg: #f9e79f; --letter-Y-ink: #4a3000;
  --letter-Z-bg: #d7bde2; --letter-Z-ink: #200040;
}
```

**Dark theme** (night-paper palette):
```css
[data-theme="dark"] {
  --surface:     #1a1814;
  --surface-alt: #24221d;
  --surface-raised: #2e2b24;
  --ink:         #f3ece0;
  --ink-soft:    #d9d0bf;
  --muted-color: #948c7e;
  --faint:       #5a534a;
  --rule:        #3a3630;
  --accent:      #f08a4a;
  --accent-soft: rgba(240,138,74,0.15);

  /* Letter swatches — dark-mode ink is lighter */
  --letter-A-bg: #8b3a20; --letter-A-ink: #ffe0d0;
  --letter-B-bg: #2a6060; --letter-B-ink: #c0f0ee;
  --letter-C-bg: #7a5e00; --letter-C-ink: #fff0c0;
  --letter-D-bg: #4a3a80; --letter-D-ink: #e0d8ff;
  --letter-E-bg: #3a5c28; --letter-E-ink: #d0f0c0;
  --letter-F-bg: #6a2a50; --letter-F-ink: #ffd8ee;
  --letter-G-bg: #1e5060; --letter-G-ink: #c0eeff;
  --letter-H-bg: #7a3a00; --letter-H-ink: #ffe8c0;
  --letter-I-bg: #4a4438; --letter-I-ink: #e8e0d0;
  --letter-J-bg: #503070; --letter-J-ink: #e8d8ff;
  --letter-K-bg: #2a5020; --letter-K-ink: #c8f0c8;
  --letter-L-bg: #6a4800; --letter-L-ink: #ffe8c0;
  --letter-M-bg: #1a4838; --letter-M-ink: #c0f0e0;
  --letter-N-bg: #6a2030; --letter-N-ink: #ffd0d8;
  --letter-O-bg: #5a3810; --letter-O-ink: #f0e0c0;
  --letter-P-bg: #2a3068; --letter-P-ink: #d0d8ff;
  --letter-Q-bg: #2a4838; --letter-Q-ink: #c0e8d8;
  --letter-R-bg: #6a2840; --letter-R-ink: #ffd0e8;
  --letter-S-bg: #1e3850; --letter-S-ink: #c0e0ff;
  --letter-T-bg: #6a2a10; --letter-T-ink: #ffe0d0;
  --letter-U-bg: #3a1860; --letter-U-ink: #e8d0ff;
  --letter-V-bg: #1a4028; --letter-V-ink: #c0f0d8;
  --letter-W-bg: #5a3808; --letter-W-ink: #f8e8c8;
  --letter-X-bg: #1e3050; --letter-X-ink: #c0dcff;
  --letter-Y-bg: #5a4800; --letter-Y-ink: #fff0a0;
  --letter-Z-bg: #3a1850; --letter-Z-ink: #e0c8f8;
}
```

**Global element rules** (update to use variables):
```css
html, body, #root {
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-hand);
  /* keep existing: margin: 0; padding: 0; width: 100%; min-height: 100vh; etc. */
}

body { font-size: 17px; line-height: 1.35; }

.tabs {
  background: var(--surface-alt);
  border-bottom: 1px solid var(--rule);
  /* keep existing structural rules */
}
.tabs button { color: var(--muted-color); /* keep other structural rules */ }
.tabs button.active { color: var(--ink); border-bottom-color: var(--accent); }

.card {
  background: var(--surface-alt);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--rule);
  padding: 14px;
  margin-bottom: 10px;
}

.chip {
  background: var(--surface-raised);
  color: var(--ink);
  border: 1.5px dashed var(--rule);
  border-radius: var(--radius-pill);
  font-family: var(--font-hand);
  /* keep structural: display, padding, margin, min-height, cursor, font-weight */
}
.chip.solid { border-style: solid; background: var(--accent); color: #fff; border-color: var(--accent); }
.chip.empty { color: var(--faint); }

button.primary    { background: var(--accent); color: #fff; }
button.secondary  { background: var(--surface-alt); color: var(--ink); border: 1px solid var(--rule); }
button.danger     { background: #923; color: #fff; }

label { color: var(--muted-color); }

input[type="text"], input[type="number"] {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--rule);
  font-family: var(--font-hand);
  /* keep structural rules */
}

table th { color: var(--muted-color); }
table td, table th { border-bottom: 1px solid var(--rule); }

.hr { background: var(--rule); }
.muted { color: var(--muted-color); }

.status-bar {
  background: var(--surface-alt);
  border-top: 1px solid var(--rule);
  color: var(--muted-color);
}
.status-bar .dot.playing   { background: #4c6; }
.status-bar .dot.recording { background: var(--accent); }
.status-bar .dot.stopped   { background: var(--faint); }
```

### `web/src/theme.ts`

```ts
export type ThemePreference = "light" | "dark" | "system";

const KEY = "rt-theme";

function getEffectiveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function applyTheme(pref: ThemePreference) {
  const effective = getEffectiveTheme(pref);
  document.documentElement.setAttribute("data-theme", effective);
}

export function initTheme(): void {
  const stored = (localStorage.getItem(KEY) as ThemePreference | null) ?? "system";
  applyTheme(stored);
  if (stored === "system") {
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => applyTheme("system"));
  }
}

export function getThemePreference(): ThemePreference {
  return (localStorage.getItem(KEY) as ThemePreference | null) ?? "system";
}

export function cycleTheme(): ThemePreference {
  const current = getThemePreference();
  const next: ThemePreference =
    current === "system" ? "light" : current === "light" ? "dark" : "system";
  localStorage.setItem(KEY, next);
  applyTheme(next);
  // Re-attach system listener if needed
  if (next === "system") {
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => applyTheme("system"));
  }
  return next;
}
```

Call `initTheme()` in `web/src/main.tsx` before the React render.

### `web/src/components/ui/ThemeToggle.tsx`

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

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference);
  const handleClick = () => {
    const next = cycleTheme();
    setPref(next);
  };
  return (
    <button
      className="chip"
      onClick={handleClick}
      title={`Theme: ${LABELS[pref]} — tap to cycle`}
      style={{ fontSize: 13, minHeight: 36, padding: "6px 12px" }}
    >
      {ICONS[pref]} {LABELS[pref]}
    </button>
  );
}
```

### `web/src/main.tsx` — call `initTheme()`

Add `import { initTheme } from "./theme"` and call `initTheme()` before `ReactDOM.createRoot(...)`.

## Existing Code References

- `web/index.html` — add font links in `<head>`
- `web/src/styles.css` — rewrite entirely; preserve structural rules
- `web/src/main.tsx` — add `initTheme()` call

## Acceptance Criteria

- [ ] `pnpm -F web build` compiles without errors.
- [ ] `web/index.html` has the three Google Fonts `<link>` tags.
- [ ] `web/src/theme.ts` exports `initTheme`, `cycleTheme`, `getThemePreference`.
- [ ] `main.tsx` calls `initTheme()` before render.
- [ ] `[data-theme="light"]` is applied to `<html>` in a light-mode OS.
- [ ] `[data-theme="dark"]` is applied to `<html>` in a dark-mode OS when preference is "system".
- [ ] Cycling through `system → light → dark → system` works; preference is stored in `localStorage["rt-theme"]`.
- [ ] All 26 `--letter-X-bg` / `--letter-X-ink` variables are defined in both themes.
- [ ] The app remains visually functional (no blank/broken screens) — all existing screen class names (`.card`, `.chip`, `.primary`, etc.) still render with the new variables.
