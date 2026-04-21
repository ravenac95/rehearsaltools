// web/tests/HamburgerMenu.test.tsx
// TDD tests for HamburgerMenu.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HamburgerMenu } from "../src/components/rehearsal/HamburgerMenu";
import { useStore } from "../src/store";

afterEach(cleanup);

const setMenuState = (overrides: Record<string, any>) => {
  useStore.setState({
    menuOpen: false,
    setMenuOpen: vi.fn(),
    ...overrides,
  } as any);
};

describe("HamburgerMenu", () => {
  it("hidden when menuOpen false", () => {
    setMenuState({ menuOpen: false });
    render(<HamburgerMenu />);
    expect(screen.queryByTestId("hamburger-menu-panel")).toBeNull();
  });

  it("visible when menuOpen true", () => {
    setMenuState({ menuOpen: true });
    render(<HamburgerMenu />);
    expect(screen.getByTestId("hamburger-menu-panel")).toBeDefined();
  });

  it("close on overlay click calls setMenuOpen(false)", () => {
    const setMenuOpen = vi.fn();
    setMenuState({ menuOpen: true, setMenuOpen });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("hamburger-menu-overlay"));
    expect(setMenuOpen).toHaveBeenCalledWith(false);
  });

  it("close on X click calls setMenuOpen(false)", () => {
    const setMenuOpen = vi.fn();
    setMenuState({ menuOpen: true, setMenuOpen });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("menu-close-button"));
    expect(setMenuOpen).toHaveBeenCalledWith(false);
  });

  it("Main View click closes menu", () => {
    const setMenuOpen = vi.fn();
    setMenuState({ menuOpen: true, setMenuOpen });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("menu-main-view"));
    expect(setMenuOpen).toHaveBeenCalledWith(false);
  });

  it("Advanced collapsed by default — Transport not visible", () => {
    setMenuState({ menuOpen: true });
    render(<HamburgerMenu />);
    expect(screen.queryByTestId("menu-transport")).toBeNull();
  });

  it("Advanced expand shows Transport and Debug Log", () => {
    setMenuState({ menuOpen: true });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("menu-advanced-toggle"));
    expect(screen.getByTestId("menu-transport")).toBeDefined();
    expect(screen.getByTestId("menu-debug-log")).toBeDefined();
  });

  it("No Regions button after expanding Advanced", () => {
    setMenuState({ menuOpen: true });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("menu-advanced-toggle"));
    expect(screen.queryByText("Regions")).toBeNull();
  });

  it("No Mixdown button", () => {
    setMenuState({ menuOpen: true });
    render(<HamburgerMenu />);
    fireEvent.click(screen.getByTestId("menu-advanced-toggle"));
    expect(screen.queryByText("Mixdown")).toBeNull();
  });
});
