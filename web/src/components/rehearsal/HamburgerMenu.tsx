// web/src/components/rehearsal/HamburgerMenu.tsx
// Thin container — reads store and delegates all rendering to HamburgerMenuPresentation.

import { useStore } from "../../store";
import { ThemeToggle } from "../ui/ThemeToggle";
import { HamburgerMenuPresentation } from "./HamburgerMenuPresentation";

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
