import { describe, it, expect } from "vitest";
import { parsePattern, serialisePattern } from "../src/components/song/pattern";

describe("parsePattern", () => {
  it("parses a simple uppercase sequence", () => {
    expect(parsePattern("ABC")).toEqual({ letters: ["A", "B", "C"] });
  });

  it("auto-uppercases lowercase letters", () => {
    expect(parsePattern("aabac")).toEqual({ letters: ["A", "A", "B", "A", "C"] });
  });

  it("drops whitespace", () => {
    expect(parsePattern("A B C")).toEqual({ letters: ["A", "B", "C"] });
  });

  it("drops digits", () => {
    expect(parsePattern("A1B2C")).toEqual({ letters: ["A", "B", "C"] });
  });

  it("drops × and digits (old multiplier syntax no longer supported)", () => {
    expect(parsePattern("A×2")).toEqual({ letters: ["A"] });
  });

  it("returns empty letters for empty input", () => {
    expect(parsePattern("")).toEqual({ letters: [] });
  });

  it("returns empty letters for symbols-only input", () => {
    expect(parsePattern("!@#$")).toEqual({ letters: [] });
  });
});

describe("serialisePattern", () => {
  it("joins letters with no separator", () => {
    expect(serialisePattern(["A", "A", "B", "A"])).toBe("AABA");
  });

  it("returns empty string for empty array", () => {
    expect(serialisePattern([])).toBe("");
  });
});
