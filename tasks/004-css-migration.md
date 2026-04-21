# Task 004: CSS Migration — Replace styles.css with New Token System

## Objective

Replace `web/src/styles.css` entirely with a new stylesheet that introduces the new design tokens (`--font-body: 'DM Sans'`, `--font-display: 'Caveat'`, `--green`, `--amber`, `--amber-soft`, `--green-soft`, `@keyframes pulse`) while preserving all existing component rules that are still needed (`.chip`, `.card`, `.wf-shake`, `.wf-caret`, `button.primary`, etc.) and dropping the dead rules for the old tab/screen/status-bar layout.

## Context

The current file is `/home/user/rehearsaltools/web/src/styles.css`. It defines the full visual language. The app currently renders with `--font-hand: 'Kalam'` as the primary typeface. After this task, the primary body typeface becomes `'DM Sans'`.

Existing components (FormTabs, SectionRow, TempoEditor, etc.) use `.chip`, `.chip.solid`, `.chip.ghost`, `button.primary`, `.card`, `.wf-shake`, `.wf-caret`, `.undo-toast`, `.row`, `.stack`, `.spacer`, `.hr`, `.muted`, `input`, `select`, `label`, `table` rules — all of these must survive.

The new components (tasks 005–011) will use CSS variables and inline styles following the prototype, so this task only needs to ensure the token layer is correct.

## Requirements

### File to rewrite: `web/src/styles.css`

**Top of file — Google Fonts import:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&family=Caveat:wght@700&display=swap');
```

**`:root` block — keep all existing spacing/radius variables; rename/add font variables:**
```css
:root {
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-display: 'Caveat', cursive;
  --font-mono:    'DM Mono', 'JetBrains Mono', 'Courier New', monospace;
  --font-music:   'Noto Music', 'Bravura Text', serif;

  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-pill: 999px;

  --shadow-sm:   0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:   0 2px 8px rgba(0,0,0,0.08);
  --shadow-sketch: 2px 3px 0 rgba(0,0,0,0.12);   /* keep for SectionRow */
  --shadow-card:   3px 4px 0 rgba(0,0,0,0.10);   /* keep for SectionRow */

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}
```

Note: `--radius-lg` changes from `20px` to `16px` to match the design prototype.

**`[data-theme="light"]` — keep all existing variables; add:**
```css
--green:      #2d8a4e;
--green-soft: rgba(45,138,78,0.10);
--amber:      #b8860b;
--amber-soft: rgba(184,134,11,0.10);
--muted:      #8a8478;
```
Keep `--muted-color: #807a70` for backward compatibility with components that already use it (SectionRow stories, etc.).

**`[data-theme="dark"]` — keep all existing variables; add:**
```css
--green:      #4ac46a;
--green-soft: rgba(74,196,106,0.12);
--amber:      #d4a017;
--amber-soft: rgba(212,160,23,0.12);
--muted:      #948c7e;
```

**Global reset — update `font-family` to `var(--font-body)`:**
```css
html, body, #root {
  ...
  font-family: var(--font-body);
  ...
}
```
Remove references to `var(--font-hand)`.

**`.app` class — keep** (still used by the App wrapper div):
```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}
```

**Drop entirely:**
- `.app-header`, `.app-header__title`
- `.tabs`, `.tabs button`, `.tabs button.active`
- `.status-bar`, `.status-bar .dot`, `.status-bar .dot.playing`, etc.
- `.screen`
- `.transport` grid
- `--font-hand` from `:root`

**Keep as-is** (just update `font-family` references from `var(--font-hand)` to `var(--font-body)` where present):
- `button.primary`, `button.secondary`, `button.danger`
- `.chip`, `.chip.solid`, `.chip.ghost`, `.chip.empty`
- `.card`
- `.row`, `.stack`, `.spacer`, `.hr`, `.muted`
- `label`, `input[type="text"]`, `input[type="number"]`, `select`
- `table`, `th`, `td`
- `.undo-toast`, `.undo-toast__msg`
- `@keyframes wf-shake`, `.wf-shake`
- `@keyframes wf-caret-blink`, `.wf-caret`
- `input[type="range"].wf-slider` and thumb rules
- All 26 `--letter-*-bg` / `--letter-*-ink` variables (unchanged)

**New `@keyframes pulse`:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

## Existing Code References

- `/home/user/rehearsaltools/web/src/styles.css` — the file to replace
- `/home/user/rehearsaltools/designs/2026-04-20/Rehearsal Flow.html` — visual reference for tokens
- `/home/user/rehearsaltools/web/src/components/song/` — components consuming `.chip`, `.card`, `button.primary`

## Implementation Details

- This is a **complete file replacement** — write the whole file fresh, don't try to patch
- Test by verifying Storybook still renders SectionRow, FormTabs, TempoEditor correctly after the change
- The `--radius-lg` change from 20px → 16px is intentional (matches design prototype)
- Do NOT add new component-specific CSS rules in this file — new components use inline styles

## Acceptance Criteria

- [ ] `--font-body`, `--font-display`, `--font-mono` defined in `:root`
- [ ] `--green`, `--green-soft`, `--amber`, `--amber-soft` defined in both `[data-theme="light"]` and `[data-theme="dark"]`
- [ ] `@keyframes pulse` defined
- [ ] `.chip`, `.chip.solid`, `.chip.ghost` rules present and use `var(--font-body)`
- [ ] `button.primary` rule present
- [ ] `.wf-shake` and `.wf-caret` rules present
- [ ] `.tabs`, `.status-bar`, `.app-header` rules are gone
- [ ] `--font-hand` is not referenced anywhere in the file
- [ ] App still renders in the browser (no console CSS errors)
- [ ] Existing Vitest tests still pass (`pnpm -F web test`)

## TDD Mode

CSS has no unit tests. Instead write a **visual smoke test** to confirm token availability:

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/css-tokens.test.ts`
- **Test framework:** Vitest (jsdom)
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **Token smoke test**: import the CSS file and assert `getComputedStyle(document.documentElement).getPropertyValue('--font-body')` is not empty after injecting the stylesheet. (Note: jsdom CSS support is limited — test presence of token strings in the raw CSS file content using a file read + regex instead.)
   - Read `web/src/styles.css` as a string
   - Assert it includes `--font-body`
   - Assert it includes `--green`
   - Assert it includes `--amber-soft`
   - Assert it includes `@keyframes pulse`
   - Assert it does NOT include `--font-hand`
   - Assert it does NOT include `.tabs {`
   - Assert it does NOT include `.status-bar {`

### TDD Process

1. Write the smoke test first — it will FAIL against the old file
2. Replace `styles.css`
3. Test passes

## Dependencies

- Depends on: None
- Blocks: All frontend component tasks benefit from correct tokens but can proceed in parallel using inline styles

## Parallelism

Can run fully in parallel with 001, 002, 003.
