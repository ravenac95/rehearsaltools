// web/src/theme.ts
// Hand-drawn wireframe theme: light/dark/system toggle, localStorage persist.

export type ThemePreference = "light" | "dark" | "system";

const KEY = "rt-theme";
const VALID_PREFS: ThemePreference[] = ["light", "dark", "system"];

let systemMql: MediaQueryList | null = null;
let systemListener: (() => void) | null = null;

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (VALID_PREFS as string[]).includes(value);
}

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

function bindSystemListener() {
  if (systemListener) return;
  systemMql = window.matchMedia("(prefers-color-scheme: dark)");
  systemListener = () => applyTheme("system");
  systemMql.addEventListener("change", systemListener);
}

function unbindSystemListener() {
  if (systemListener && systemMql) {
    systemMql.removeEventListener("change", systemListener);
  }
  systemListener = null;
  systemMql = null;
}

export function getThemePreference(): ThemePreference {
  const raw = localStorage.getItem(KEY);
  return isThemePreference(raw) ? raw : "system";
}

export function initTheme(): void {
  const stored = getThemePreference();
  applyTheme(stored);
  if (stored === "system") bindSystemListener();
}

export function cycleTheme(): ThemePreference {
  const current = getThemePreference();
  const next: ThemePreference =
    current === "system" ? "light" : current === "light" ? "dark" : "system";
  localStorage.setItem(KEY, next);
  applyTheme(next);
  if (next === "system") bindSystemListener();
  else unbindSystemListener();
  return next;
}
