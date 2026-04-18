// server/tests/sections.test.ts
// Tests for the store + flatten logic.

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  SectionsStore,
  flattenSongForm,
  validateSectionBody,
  totalBars,
} from "../src/store/sections.js";

let tmpFile: string;
let store: SectionsStore;

beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rt-"));
  tmpFile = path.join(dir, "store.json");
  store = new SectionsStore(tmpFile);
  await store.load();
});

describe("validateSectionBody", () => {
  it("accepts a valid section", () => {
    const body = { name: "A", rows: [{ bars: 8, num: 4, denom: 4, bpm: 120 }] };
    expect(validateSectionBody(body)).toEqual(body);
  });
  it("rejects empty name", () => {
    expect(() => validateSectionBody({ name: "", rows: [{ bars: 1, num: 4, denom: 4, bpm: 120 }] }))
      .toThrow(/name is required/);
  });
  it("rejects empty rows", () => {
    expect(() => validateSectionBody({ name: "A", rows: [] })).toThrow(/non-empty/);
  });
  it("rejects non-pow2 denom", () => {
    expect(() => validateSectionBody({ name: "A", rows: [{ bars: 1, num: 4, denom: 3, bpm: 120 }] }))
      .toThrow(/denom/);
  });
  it("rejects bpm out of range", () => {
    expect(() => validateSectionBody({ name: "A", rows: [{ bars: 1, num: 4, denom: 4, bpm: 5 }] }))
      .toThrow(/bpm/);
  });
});

describe("SectionsStore CRUD", () => {
  it("creates, updates, deletes a section", async () => {
    const a = await store.createSection("A", [{ bars: 8, num: 4, denom: 4, bpm: 80 }]);
    expect(store.listSections()).toHaveLength(1);
    expect(a.id).toBeTruthy();

    const updated = await store.updateSection(a.id, "A-rev", [
      { bars: 16, num: 3, denom: 4, bpm: 90 },
    ]);
    expect(updated.name).toBe("A-rev");
    expect(updated.rows[0].bars).toBe(16);

    await store.deleteSection(a.id);
    expect(store.listSections()).toHaveLength(0);
  });

  it("persists across instances", async () => {
    await store.createSection("A", [{ bars: 8, num: 4, denom: 4, bpm: 80 }]);
    const s2 = new SectionsStore(tmpFile);
    await s2.load();
    expect(s2.listSections()).toHaveLength(1);
    expect(s2.listSections()[0].name).toBe("A");
  });

  it("strips deleted sections from song form", async () => {
    const a = await store.createSection("A", [{ bars: 4, num: 4, denom: 4, bpm: 100 }]);
    const b = await store.createSection("B", [{ bars: 4, num: 4, denom: 4, bpm: 100 }]);
    await store.setSongForm([a.id, b.id, a.id]);
    await store.deleteSection(a.id);
    expect(store.getSongForm().sectionIds).toEqual([b.id]);
  });

  it("setSongForm rejects unknown ids", async () => {
    await expect(store.setSongForm(["nope"])).rejects.toThrow(/unknown section/);
  });
});

describe("flattenSongForm", () => {
  it("produces bar offsets relative to form start", async () => {
    const a = await store.createSection("A", [
      { bars: 8, num: 4, denom: 4, bpm: 80 },
      { bars: 4, num: 6, denom: 8, bpm: 80 },
    ]);
    const b = await store.createSection("B", [
      { bars: 16, num: 4, denom: 4, bpm: 80 },
    ]);
    await store.setSongForm([a.id, b.id, a.id]);
    const flat = flattenSongForm(store.getSongForm(), store.listSections());
    // A: rows at bar 0, 8  (4/4 @ 80, 6/8 @ 80)
    // B: 16 bars of 4/4 @ 80 → but B's params match A's LAST row? No:
    //   A last: num=6, denom=8, bpm=80
    //   B:      num=4, denom=4, bpm=80
    //   → different params, so B emits a marker at bar 12 (8 A-bars of 4/4 + 4 A-bars of 6/8)
    // A (second rep):
    //   A[0]: num=4, denom=4, bpm=80 — different from prev (4/4 80) vs B (4/4 80)
    //   ACTUALLY same params → merged. So first A row of the 2nd rep is skipped.
    //   A[1]: num=6, denom=8, bpm=80 — different from prior (4/4 80) → emits at bar 36
    expect(flat.map((r) => r.barOffset)).toEqual([0, 8, 12, 36]);
  });

  it("collapses consecutive identical markers", async () => {
    const a = await store.createSection("A", [
      { bars: 4, num: 4, denom: 4, bpm: 120 },
      { bars: 4, num: 4, denom: 4, bpm: 120 },
    ]);
    await store.setSongForm([a.id]);
    const flat = flattenSongForm(store.getSongForm(), store.listSections());
    expect(flat).toHaveLength(1);
    expect(flat[0].barOffset).toBe(0);
  });

  it("empty form → empty flat", () => {
    const flat = flattenSongForm({ sectionIds: [] }, []);
    expect(flat).toEqual([]);
  });
});

describe("totalBars", () => {
  it("sums bars across the form", async () => {
    const a = await store.createSection("A", [{ bars: 8, num: 4, denom: 4, bpm: 80 }]);
    const b = await store.createSection("B", [{ bars: 16, num: 4, denom: 4, bpm: 80 }]);
    await store.setSongForm([a.id, b.id, a.id]);
    expect(totalBars(store.getSongForm(), store.listSections())).toBe(8 + 16 + 8);
  });
});
