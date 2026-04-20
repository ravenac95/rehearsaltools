// server/tests/flatten.test.ts
// Tests for the flattenForm pure function.

import { describe, it, expect } from "vitest";
import { flattenForm } from "../src/flatten.js";
import type { Song } from "../src/store/song.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSong(overrides?: Partial<Song>): Song {
  return {
    id: "s1",
    name: "Test",
    activeFormId: "f1",
    sections: [
      {
        letter: "A",
        stanzas: [
          { bars: 8, num: 4, denom: 4 },
          { bars: 4, num: 6, denom: 8 },
        ],
      },
      {
        letter: "B",
        stanzas: [{ bars: 16, num: 4, denom: 4 }],
      },
    ],
    songForms: [
      {
        id: "f1",
        name: "1",
        bpm: 80,
        note: "q",
        pattern: ["A", "B", "A"],
      },
    ],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("flattenForm", () => {
  it("returns empty result for empty pattern", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: [] }],
    };
    const result = flattenForm(song, "f1");
    expect(result.rows).toHaveLength(0);
    expect(result.effectiveNotes).toHaveLength(0);
    expect(result.totalBars).toBe(0);
  });

  it("produces correct barOffsets across sections", () => {
    const song = makeSong();
    const result = flattenForm(song, "f1");
    // A: stanza[0] at bar 0 (4/4 @80), stanza[1] at bar 8 (6/8 @80)
    // B: 4/4 @80 — new marker at bar 12 (differs from 6/8)
    // A (2nd): stanza[0] 4/4@80 — same as B's row? B is 4/4@80, A[0] is 4/4@80 → same, collapsed
    //          stanza[1] 6/8@80 — differs from 4/4@80, new marker at bar 36
    expect(result.rows.map((r) => r.barOffset)).toEqual([0, 8, 12, 36]);
    expect(result.totalBars).toBe(8 + 4 + 16 + 8 + 4); // = 40
  });

  it("collapses consecutive stanzas with identical num/denom/bpm", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [
        {
          letter: "A",
          stanzas: [
            { bars: 8, num: 4, denom: 4 },
            { bars: 8, num: 4, denom: 4 }, // identical — should be collapsed
          ],
        },
      ],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: ["A"] }],
    };
    const result = flattenForm(song, "f1");
    expect(result.rows).toHaveLength(1);
    expect(result.totalBars).toBe(16);
  });

  it("does not collapse stanzas that differ in bpm only", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [
        {
          letter: "A",
          stanzas: [
            { bars: 8, num: 4, denom: 4, bpm: 80 },
            { bars: 8, num: 4, denom: 4, bpm: 120 }, // different bpm
          ],
        },
      ],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: ["A"] }],
    };
    const result = flattenForm(song, "f1");
    expect(result.rows).toHaveLength(2);
  });

  it("BPM inheritance: stanza > section > form", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [
        {
          letter: "A",
          bpm: 90,
          stanzas: [
            { bars: 8, num: 4, denom: 4 },               // inherits section bpm=90
            { bars: 8, num: 4, denom: 4, bpm: 110 },      // stanza override
          ],
        },
        {
          letter: "B",
          stanzas: [
            { bars: 8, num: 4, denom: 4 }, // inherits form bpm=100
          ],
        },
      ],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: ["A", "B"] }],
    };
    const result = flattenForm(song, "f1");
    const bpms = result.rows.map((r) => r.bpm);
    // A[0] → 90 (section), A[1] → 110 (stanza), B[0] → 100 (form)
    expect(bpms).toEqual([90, 110, 100]);
  });

  it("note inheritance: stanza > section > form (in effectiveNotes)", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [
        {
          letter: "A",
          note: "h",
          stanzas: [
            { bars: 8, num: 4, denom: 4 },                // inherits section note="h"
            { bars: 8, num: 3, denom: 4, note: "e" },     // stanza override
          ],
        },
      ],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: ["A"] }],
    };
    const result = flattenForm(song, "f1");
    expect(result.effectiveNotes[0]).toBe("h");
    expect(result.effectiveNotes[1]).toBe("e");
  });

  it("rows never contain a note field", () => {
    const song = makeSong();
    const result = flattenForm(song, "f1");
    for (const row of result.rows) {
      expect("note" in row).toBe(false);
    }
  });

  it("totalBars sums correctly including pattern repeats", () => {
    const song = makeSong();
    // pattern = A B A; A has 8+4=12 bars, B has 16 bars
    // total = 12 + 16 + 12 = 40
    const result = flattenForm(song, "f1");
    expect(result.totalBars).toBe(40);
  });

  it("throws when a letter in pattern has no matching section", () => {
    const song: Song = {
      id: "s1",
      name: "T",
      activeFormId: "f1",
      sections: [],
      songForms: [{ id: "f1", name: "1", bpm: 100, note: "q", pattern: ["X"] }],
    };
    expect(() => flattenForm(song, "f1")).toThrow(/section not found/);
  });

  it("throws when formId is not found", () => {
    const song = makeSong();
    expect(() => flattenForm(song, "nonexistent")).toThrow(/form not found/);
  });
});
