# Task 03: Add WF2-specific CSS (shake animation + slider thumb)

## Objective

Add the small set of global styles needed by the new components: a shake keyframe, a range-input thumb style, and any missing color tokens.

## Dependencies

None.

## Files to modify

- `web/src/styles.css`

## Implementation

Append these rules to `web/src/styles.css` (the existing light/dark themes already define `--surface`, `--surface-alt`, `--ink`, `--faint`, `--rule`, so no new color tokens are needed).

```css
/* ── WF2 pattern-editor shake ───────────────────────────────────────────── */

@keyframes wf-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-3px); }
  80%      { transform: translateX(2px); }
}

.wf-shake { animation: wf-shake 0.22s ease-in-out; }

/* ── Pattern-editor blinking caret ──────────────────────────────────────── */

@keyframes wf-caret-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0; }
}

.wf-caret {
  display: inline-block;
  width: 2px;
  background: var(--ink);
  animation: wf-caret-blink 1s step-end infinite;
}

/* ── BPM slider (native range styled to match WF2) ──────────────────────── */

input[type="range"].wf-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--surface-alt);
  border-radius: 2px;
  outline: none;
}

input[type="range"].wf-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
  border: 2px solid var(--surface);
  cursor: pointer;
}

input[type="range"].wf-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--ink);
  border: 2px solid var(--surface);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 0 2px var(--surface);
}
```

## Verification

```bash
cd web && pnpm build
```

Build succeeds. Classes will be consumed by the components added in later tasks.
