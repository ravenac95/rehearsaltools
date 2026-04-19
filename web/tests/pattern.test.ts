import { describe, it, expect } from "vitest";
import { parsePattern, serialisePattern } from "../src/components/song/pattern";

describe("parsePattern", () => {
  it("parses a simple sequence", () => {
    const { letters, errors } = parsePattern("A B C");
    expect(letters).toEqual(["A", "B", "C"]);
    expect(errors).toHaveLength(0);
  });

  it("expands ×N shorthand (×)", () => {
    const { letters, errors } = parsePattern("A×2 B A×3");
    expect(letters).toEqual(["A","A","B","A","A","A"]);
    expect(errors).toHaveLength(0);
  });

  it("expands xN shorthand (x)", () => {
    const { letters } = parsePattern("Ax2 B");
    expect(letters).toEqual(["A","A","B"]);
  });

  it("returns empty letters and no errors for empty input", () => {
    const { letters, errors } = parsePattern("   ");
    expect(letters).toEqual([]);
    expect(errors).toHaveLength(0);
  });

  it("reports error for lowercase token", () => {
    const { letters, errors } = parsePattern("a B");
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("a");
    expect(letters).toEqual(["B"]);  // valid token still parsed
  });

  it("reports error for multi-char token", () => {
    const { errors } = parsePattern("AB C");
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("AB");
  });

  it("reports error for multiplier of 0", () => {
    const { errors } = parsePattern("A×0");
    expect(errors).toHaveLength(1);
  });

  it("handles mixed valid and invalid tokens, collects all errors", () => {
    const { letters, errors } = parsePattern("A 1 B ab C");
    expect(letters).toEqual(["A","B","C"]);
    expect(errors).toHaveLength(2);  // "1" and "ab"
  });

  it("allows large multipliers", () => {
    const { letters, errors } = parsePattern("A×10");
    expect(letters).toHaveLength(10);
    expect(errors).toHaveLength(0);
  });
});

describe("serialisePattern", () => {
  it("joins letters with spaces", () => {
    expect(serialisePattern(["A","A","B","A"])).toBe("A A B A");
  });

  it("returns empty string for empty array", () => {
    expect(serialisePattern([])).toBe("");
  });

  it("does not collapse repeated letters", () => {
    expect(serialisePattern(["A","A","A"])).toBe("A A A");
  });
});
