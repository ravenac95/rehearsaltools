// web/tests/css-tokens.test.ts
// Smoke test: verify the new CSS token system is present in styles.css

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Build the path indirectly so Vite doesn't rewrite `new URL(..., import.meta.url)`
// as a dev-server asset URL.
const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "../src/styles.css");
const css = readFileSync(cssPath, "utf8");

describe("CSS token smoke tests", () => {
  it("includes --font-body", () => {
    expect(css).toContain("--font-body");
  });

  it("includes --green", () => {
    expect(css).toContain("--green");
  });

  it("includes --amber-soft", () => {
    expect(css).toContain("--amber-soft");
  });

  it("includes @keyframes pulse", () => {
    expect(css).toContain("@keyframes pulse");
  });

  it("does NOT include --font-hand", () => {
    expect(css).not.toContain("--font-hand");
  });

  it("does NOT include .tabs {", () => {
    expect(css).not.toMatch(/\.tabs\s*\{/);
  });

  it("does NOT include .status-bar {", () => {
    expect(css).not.toMatch(/\.status-bar\s*\{/);
  });
});
