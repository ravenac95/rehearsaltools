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
