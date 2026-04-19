# Task 07: Shared UI primitives — Chip, Card, Button, Stepper

## Objective

Create the shared UI component library at `web/src/components/ui/` using the new theme variables established in task-06.

## Dependencies

- task-06-theme-system

## Files

- **Create** `web/src/components/ui/Chip.tsx`
- **Create** `web/src/components/ui/Card.tsx`
- **Create** `web/src/components/ui/Button.tsx`
- **Create** `web/src/components/ui/Stepper.tsx`
- `web/src/components/ui/ThemeToggle.tsx` already created in task-06 (do not re-create)

## Context

Read `web/src/styles.css` (updated in task-06) to understand the CSS variable palette. These primitives wrap the existing CSS class names and the new variables into typed React components so later tasks can import them instead of using raw `className`.

All components live in `web/src/components/ui/`. They use plain inline styles or existing global CSS classes — no new CSS files.

## Requirements

### `web/src/components/ui/Chip.tsx`

Pill button. Used for section letters in the form-string editor, form tabs, action triggers.

```tsx
interface ChipProps {
  children: React.ReactNode;
  variant?: "dashed" | "solid" | "ghost";  // dashed = default
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function Chip({ children, variant = "dashed", onClick, disabled, className = "", style, title }: ChipProps) {
  const cls = ["chip", variant === "solid" ? "solid" : variant === "ghost" ? "ghost" : "", className]
    .filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style} title={title}>
      {children}
    </button>
  );
}
```

Add `.chip.ghost` to `styles.css` (or inline style):
```css
.chip.ghost {
  background: transparent;
  border: 1.5px dashed var(--faint);
  color: var(--faint);
}
```

### `web/src/components/ui/Card.tsx`

Simple surface wrapper with the paper/sketch aesthetic.

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = "", style, onClick }: CardProps) {
  return (
    <div
      className={["card", className].filter(Boolean).join(" ")}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

### `web/src/components/ui/Button.tsx`

Wraps the existing `button.primary` / `button.secondary` / `button.danger` classes.

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
  className?: string;
}

export function Button({
  children,
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
  style,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[variant, className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
```

### `web/src/components/ui/Stepper.tsx`

Numeric stepper: label + `–` button + value display + `+` button. Used for BPM and bar counts.

```tsx
interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;         // e.g. "BPM" displayed after value
  mono?: boolean;        // use --font-mono for the value
}

export function Stepper({ label, value, min, max, step = 1, onChange, unit, mono = false }: StepperProps) {
  const dec = () => {
    const next = value - step;
    if (min === undefined || next >= min) onChange(next);
  };
  const inc = () => {
    const next = value + step;
    if (max === undefined || next <= max) onChange(next);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="chip" onClick={dec} style={{ minHeight: 36, padding: "4px 12px" }}>–</button>
        <span style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-hand)",
          fontSize: 18, minWidth: 48, textAlign: "center",
          color: "var(--ink)",
        }}>
          {value}{unit ? <span style={{ fontSize: 13, color: "var(--muted-color)", marginLeft: 2 }}>{unit}</span> : null}
        </span>
        <button className="chip" onClick={inc} style={{ minHeight: 36, padding: "4px 12px" }}>+</button>
      </div>
    </div>
  );
}
```

### Barrel export

Create `web/src/components/ui/index.ts`:
```ts
export { Chip } from "./Chip";
export { Card } from "./Card";
export { Button } from "./Button";
export { Stepper } from "./Stepper";
export { ThemeToggle } from "./ThemeToggle";
```

## Existing Code References

- `web/src/styles.css` (task-06) — CSS variables in use (e.g. `var(--surface-alt)`, `var(--rule)`, `var(--accent)`)
- `web/src/screens/Dashboard.tsx` — existing use of `className="card"`, `className="chip"`, `className="primary"` / `className="secondary"` to understand what the classes look like in practice

## Acceptance Criteria

- [ ] `pnpm -F web build` compiles without errors.
- [ ] `web/src/components/ui/index.ts` barrel exists and exports all five components.
- [ ] `Chip` renders with correct class names for each `variant`.
- [ ] `Stepper` respects `min`/`max` bounds (does not go below min or above max).
- [ ] `Button` maps `variant` prop to correct CSS class.
- [ ] No hardcoded colour strings — all styling uses CSS variables or `var(--...)` inline styles.
