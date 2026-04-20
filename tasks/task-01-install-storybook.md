# Task 1: Install Storybook and configure addon-themes

## Objective

Install Storybook 8 with the React-Vite builder, addon-themes, and addon-interactions into the `web` package, and write the `.storybook/` config so `pnpm --filter web build-storybook` runs cleanly.

## Dependencies

None

## Files to create/modify

- `/home/user/rehearsaltools/web/package.json` — add devDeps + scripts
- `/home/user/rehearsaltools/web/.storybook/main.ts` — Storybook config
- `/home/user/rehearsaltools/web/.storybook/preview.tsx` — global decorator + CSS import
- `/home/user/rehearsaltools/web/.storybook/preview-head.html` — Google Fonts injection

## Implementation notes

### package.json additions

Add to `devDependencies`:

```json
"@storybook/react-vite": "^8.0.0",
"@storybook/addon-essentials": "^8.0.0",
"@storybook/addon-interactions": "^8.0.0",
"@storybook/addon-themes": "^8.0.0",
"@storybook/blocks": "^8.0.0",
"storybook": "^8.0.0"
```

Add to `scripts`:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
```

### `.storybook/preview.tsx`

Use `withThemeByDataAttribute` from `@storybook/addon-themes`. The app applies themes via `data-theme` on `<html>` (see `web/src/theme.ts` — `document.documentElement.setAttribute("data-theme", effective)`). The decorator must target `html`, not a wrapper `<div>`, so the CSS custom properties cascade correctly.

Import the app's global CSS so all CSS custom properties and component class styles are available in stories.

```tsx
import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "../src/index.css"; // adjust path if the main CSS file is elsewhere

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-theme",
      // Target the html element — matches how theme.ts applies themes
      parentSelector: "html",
    }),
  ],
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
```

**Important**: Find the actual main CSS file by checking `web/src/main.tsx` and the `<link>` in `web/index.html`. Import whichever file contains the CSS custom properties (`--ink`, `--surface`, `--rule`, etc.) and component class definitions (`.chip`, `.card`, `.primary`, `.secondary`, etc.).

### `.storybook/preview-head.html`

Check `web/index.html` for the existing Google Fonts `<link>` block and copy it verbatim:

```html
<!-- Copy the <link rel="preconnect"> and <link href="https://fonts.googleapis.com/..."> tags from web/index.html -->
```

## Acceptance criteria

- [ ] `pnpm --filter web build-storybook` exits 0 (zero stories is acceptable at this stage — Storybook will warn but not error)
- [ ] `pnpm --filter web build` still exits 0 (app build unaffected)
- [ ] `pnpm --filter web test` still exits 0 (Vitest unaffected)
- [ ] `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview-head.html` all exist
- [ ] Theme switcher toolbar appears when running `pnpm --filter web storybook` (manual verification note only — not blocking CI)
