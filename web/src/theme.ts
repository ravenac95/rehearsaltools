// web/src/theme.ts
// Hand-drawn wireframe theme: light/dark/system toggle, localStorage persist.

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
