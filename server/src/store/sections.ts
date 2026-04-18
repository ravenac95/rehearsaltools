// server/src/store/sections.ts
// Persistent, server-owned store for named sections + the current song form.
// Persisted to a JSON file on disk. Single-file, atomic-ish writes (temp file
// rename) to survive abrupt shutdown.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface SectionRow {
  bars: number;
  num: number;
  denom: number;
  bpm: number;
}

export interface Section {
  id: string;
  name: string;
  rows: SectionRow[];
}

export interface SongForm {
  sectionIds: string[];
}

export interface StoreShape {
  sections: Section[];
  songForm: SongForm;
}

const EMPTY: StoreShape = {
  sections: [],
  songForm: { sectionIds: [] },
};

// ── Validation helpers ──────────────────────────────────────────────────────

function isPowerOfTwo(n: number): boolean {
  return [1, 2, 4, 8, 16, 32, 64].includes(n);
}

export function validateSectionRow(row: unknown, idx: number): SectionRow {
  if (typeof row !== "object" || row === null) throw new Error(`row ${idx}: must be object`);
  const r = row as Record<string, unknown>;
  if (!Number.isInteger(r.bars) || (r.bars as number) < 1) {
    throw new Error(`row ${idx}: bars must be a positive integer`);
  }
  if (!Number.isInteger(r.num) || (r.num as number) < 1 || (r.num as number) > 64) {
    throw new Error(`row ${idx}: num must be integer 1..64`);
  }
  if (!isPowerOfTwo(r.denom as number)) {
    throw new Error(`row ${idx}: denom must be power of 2`);
  }
  if (typeof r.bpm !== "number" || r.bpm < 20 || r.bpm > 999) {
    throw new Error(`row ${idx}: bpm must be 20..999`);
  }
  return { bars: r.bars as number, num: r.num as number, denom: r.denom as number, bpm: r.bpm };
}

export function validateSectionBody(body: unknown): { name: string; rows: SectionRow[] } {
  if (typeof body !== "object" || body === null) throw new Error("body must be an object");
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || b.name.length === 0) throw new Error("name is required");
  if (!Array.isArray(b.rows) || b.rows.length === 0) throw new Error("rows must be a non-empty array");
  const rows = b.rows.map((r, i) => validateSectionRow(r, i));
  return { name: b.name, rows };
}

// ── Store ────────────────────────────────────────────────────────────────────

export class SectionsStore {
  private data: StoreShape = { sections: [], songForm: { sectionIds: [] } };
  private loaded = false;

  constructor(private filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      this.data = {
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        songForm: parsed.songForm ?? { sectionIds: [] },
      };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.data = { ...EMPTY, sections: [], songForm: { sectionIds: [] } };
      } else {
        throw err;
      }
    }
    this.loaded = true;
  }

  private ensureLoaded() {
    if (!this.loaded) throw new Error("store not loaded");
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  // ── Sections CRUD ─────────────────────────────────────────────────────────

  listSections(): Section[] {
    this.ensureLoaded();
    return this.data.sections.map((s) => ({
      ...s,
      rows: s.rows.map((r) => ({ ...r })),
    }));
  }

  getSection(id: string): Section | undefined {
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) return undefined;
    return { ...s, rows: s.rows.map((r) => ({ ...r })) };
  }

  async createSection(name: string, rows: SectionRow[]): Promise<Section> {
    this.ensureLoaded();
    const section: Section = { id: randomUUID(), name, rows };
    this.data.sections.push(section);
    await this.persist();
    return section;
  }

  async updateSection(id: string, name: string, rows: SectionRow[]): Promise<Section> {
    this.ensureLoaded();
    const s = this.data.sections.find((x) => x.id === id);
    if (!s) throw new Error(`section not found: ${id}`);
    s.name = name;
    s.rows = rows;
    await this.persist();
    return s;
  }

  async deleteSection(id: string): Promise<void> {
    this.ensureLoaded();
    const before = this.data.sections.length;
    this.data.sections = this.data.sections.filter((s) => s.id !== id);
    if (this.data.sections.length === before) throw new Error(`section not found: ${id}`);
    // Also strip from song form
    this.data.songForm.sectionIds = this.data.songForm.sectionIds.filter((x) => x !== id);
    await this.persist();
  }

  // ── Song form ─────────────────────────────────────────────────────────────

  getSongForm(): SongForm {
    this.ensureLoaded();
    return { sectionIds: [...this.data.songForm.sectionIds] };
  }

  async setSongForm(sectionIds: string[]): Promise<SongForm> {
    this.ensureLoaded();
    // All referenced ids must exist.
    for (const id of sectionIds) {
      if (!this.data.sections.some((s) => s.id === id)) {
        throw new Error(`song form references unknown section: ${id}`);
      }
    }
    this.data.songForm.sectionIds = [...sectionIds];
    await this.persist();
    return this.getSongForm();
  }
}

// ── Flatten ──────────────────────────────────────────────────────────────────

export interface FlatRow {
  barOffset: number;
  num: number;
  denom: number;
  bpm: number;
}

/**
 * Expand a song form into rows annotated with cumulative bar offsets from
 * bar 1 of the form.
 *
 * Merges consecutive rows with identical num/denom/bpm across section
 * boundaries — no need to emit redundant markers.
 */
export function flattenSongForm(
  form: SongForm,
  sections: Section[]
): FlatRow[] {
  const byId = new Map(sections.map((s) => [s.id, s]));

  // First pass: emit raw rows with bar counts
  const raw: (SectionRow & { barOffset: number })[] = [];
  let barCursor = 0;
  for (const sid of form.sectionIds) {
    const s = byId.get(sid);
    if (!s) throw new Error(`unknown section id in form: ${sid}`);
    for (const row of s.rows) {
      raw.push({ ...row, barOffset: barCursor });
      barCursor += row.bars;
    }
  }

  // Second pass: collapse consecutive rows with identical params.
  const out: FlatRow[] = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && last.num === r.num && last.denom === r.denom && last.bpm === r.bpm) {
      continue;  // skip — same marker would produce no change
    }
    out.push({ barOffset: r.barOffset, num: r.num, denom: r.denom, bpm: r.bpm });
  }

  return out;
}

/** Total bar count of the flattened form, for UI display. */
export function totalBars(form: SongForm, sections: Section[]): number {
  const byId = new Map(sections.map((s) => [s.id, s]));
  let bars = 0;
  for (const sid of form.sectionIds) {
    const s = byId.get(sid);
    if (!s) continue;
    for (const row of s.rows) bars += row.bars;
  }
  return bars;
}
