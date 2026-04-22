// web/src/components/rehearsal/HamburgerMenuPresentation.tsx
// Pure presentation component for the slide-in hamburger menu panel.

import { useState } from "react";
import type { ReactNode } from "react";

export interface HamburgerMenuPresentationProps {
  open: boolean;
  onClose: () => void;
  themeToggle: ReactNode; // slot — container passes <ThemeToggle/>, stories pass <ThemeTogglePresentation .../>
}

export function HamburgerMenuPresentation({
  open,
  onClose,
  themeToggle,
}: HamburgerMenuPresentationProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!open) return null;

  return (
    <div
      data-testid="hamburger-menu-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.4)",
      }}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        data-testid="hamburger-menu-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 260,
          height: "100%",
          background: "var(--surface-raised)",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflowY: "auto",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>Menu</span>
          <button
            data-testid="menu-close-button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--ink)",
              padding: "4px 8px",
              fontFamily: "var(--font-body)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Main View button */}
        <button
          data-testid="menu-main-view"
          onClick={onClose}
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          🎵 Main View
        </button>

        {/* Theme toggle */}
        <div
          data-testid="menu-theme-toggle"
          style={{ marginTop: 4 }}
        >
          {themeToggle}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--rule)", margin: "8px 0" }} />

        {/* Advanced section header */}
        <button
          data-testid="menu-advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--muted)",
            textAlign: "left",
            padding: "12px 14px",
            cursor: "pointer",
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{showAdvanced ? "▼" : "▶"}</span> ADVANCED
        </button>

        {/* Advanced items */}
        {showAdvanced && (
          <div style={{ paddingLeft: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              data-testid="menu-transport"
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--ink)",
                width: "100%",
              }}
            >
              Transport
            </button>
            <button
              data-testid="menu-debug-log"
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--ink)",
                width: "100%",
              }}
            >
              Debug Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
