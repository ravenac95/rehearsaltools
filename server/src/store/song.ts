// server/src/store/song.ts
// Persistent store for Song / SongForm / Section / Stanza data model with
// a 25-revision ring buffer. Atomic-write pattern (temp-file + rename) copied
// from store/sections.ts.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NoteValue = "w" | "h" | "q" | "e" | "s";

export interface Stanza {
  bars: number;        // >= 1
  num: number;         // 1-64
  denom: number;       // 1, 2, 4, 8, 16, 32, 64 (powers of 2)
  bpm?: number;        // 20-999 if set; overrides section tempo
  note?: NoteValue;    // overrides section note if set
}

export interface Section {
  letter: string;      // single char matching /^[A-Z]$/
  stanzas: Stanza[];
  bpm?: number;        // overrides form tempo if set
  note?: NoteValue;    // overrides form note if set
}

export interface SongForm {
  id: string;
  name: string;        // default "1", "2", ... (editable)
  bpm: number;         // default tempo (20-999)
  note: NoteValue;     // default note-type, defaults to "q"
  pattern: string[];   // flat, explicit list of section letters e.g. ["A","A","B"]
}

export interface Song {
  id: string;
  name: string;
  sections: Section[];
  songForms: SongForm[];
  activeFormId: string | null;
}

export interface Revision {
  id: string;
  at: string;          // ISO-8601
  reason: string;      // e.g. "write", "restore", "upsertSection" etc.
  song: Song;
}

export interface StoreShape {
  song: Song;
  revisions: Revision[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_DENOMS = new Set([1, 2, 4, 8, 16, 32, 64]);
const VALID_NOTES = new Set<string>(["w", "h", "q", "e", "s"]);

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function emptySong(): Song {
  const formId = randomUUID();
  return {
    id: randomUUID(),
    name: "Untitled",
    sections: [],
    songForms: [{ id: formId, name: "1", bpm: 100, note: "q", pattern: [] }],
    activeFormId: formId,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateStanza(s: unknown, idx: number): Stanza {
  if (typeof s !== "object" || s === null) throw new Error(`stanza ${idx}: must be object`);
  const r = s as Record<string, unknown>;

  if (!Number.isInteger(r.bars) || (r.bars as number) < 1) {
    throw new Error(`stanza ${idx}: bars must be a positive integer`);
  }
  if (!Number.isInteger(r.num) || (r.num as number) < 1 || (r.num as number) > 64) {
    throw new Error(`stanza ${idx}: num must be integer 1..64`);
  }
  if (!VALID_DENOMS.has(r.denom as number)) {
    throw new Error(`stanza ${idx}: denom must be one of [1,2,4,8,16,32,64]`);
  }
  if (r.bpm !== undefined) {
    if (typeof r.bpm !== "number" || r.bpm < 20 || r.bpm > 999) {
      throw new Error(`stanza ${idx}: bpm must be 20..999`);
    }
  }
  if (r.note !== undefined) {
    if (!VALID_NOTES.has(r.note as string)) {
      throw new Error(`stanza ${idx}: note must be one of w,h,q,e,s`);
    }
  }

  const result: Stanza = {
    bars: r.bars as number,
    num: r.num as number,
    denom: r.denom as number,
  };
  if (r.bpm !== undefined) result.bpm = r.bpm as number;
  if (r.note !== undefined) result.note = r.note as NoteValue;
  return result;
}

export function validateSection(s: unknown): { letter: string; stanzas: Stanza[]; bpm?: number; note?: NoteValue } {
  if (typeof s !== "object" || s === null) throw new Error("section must be object");
  const r = s as Record<string, unknown>;

  if (typeof r.letter !== "string" || !/^[A-Z]$/.test(r.letter)) {
    throw new Error("letter must be a single uppercase character A-Z");
  }
  if (!Array.isArray(r.stanzas) || r.stanzas.length === 0) {
    throw new Error("stanzas must be a non-empty array");
  }
  const stanzas = r.stanzas.map((st, i) => validateStanza(st, i));

  const result: { letter: string; stanzas: Stanza[]; bpm?: number; note?: NoteValue } = {
    letter: r.letter,
    stanzas,
  };

  if (r.bpm !== undefined) {
    if (typeof r.bpm !== "number" || r.bpm < 20 || r.bpm > 999) {
      throw new Error("section bpm must be 20..999");
    }
    result.bpm = r.bpm as number;
  }
  if (r.note !== undefined) {
    if (!VALID_NOTES.has(r.note as string)) {
      throw new Error("section note must be one of w,h,q,e,s");
    }
    result.note = r.note as NoteValue;
  }

  return result;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const MAX_REVISIONS = 25;

export class SongStore {
  private data: StoreShape = { song: emptySong(), revisions: [] };
  private loaded = false;

  constructor(private filePath: string) { }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      if (!("song" in parsed)) {
        // Legacy shape — rename and start fresh
        const legacyPath = this.filePath + ".legacy.json";
        await fs.rename(this.filePath, legacyPath);
        this.data = { song: emptySong(), revisions: [] };
        await this.persist();
      } else {
        this.data = {
          song: parsed.song as Song,
          revisions: Array.isArray(parsed.revisions) ? (parsed.revisions as Revision[]) : [],
        };
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.data = { song: emptySong(), revisions: [] };
      } else {
        throw err;
      }
    }
    this.loaded = true;
  }

  private ensureLoaded(): void {
    if (!this.loaded) throw new Error("store not loaded");
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  private captureRevision(reason: string): void {
    const revision: Revision = {
      id: randomUUID(),
      at: new Date().toISOString(),
      reason,
      song: deepCopy(this.data.song),
    };
    this.data.revisions.unshift(revision);
    if (this.data.revisions.length > MAX_REVISIONS) {
      this.data.revisions = this.data.revisions.slice(0, MAX_REVISIONS);
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  getSong(): Song {
    this.ensureLoaded();
    return deepCopy(this.data.song);
  }

  listRevisions(): Array<{ id: string; at: string; reason: string }> {
    this.ensureLoaded();
    return this.data.revisions.map(({ id, at, reason }) => ({ id, at, reason }));
  }

  getRevision(id: string): Revision | undefined {
    this.ensureLoaded();
    const rev = this.data.revisions.find((r) => r.id === id);
    return rev ? deepCopy(rev) : undefined;
  }

  // ── Song-level mutations ──────────────────────────────────────────────────

  async updateSong(partial: Partial<Pick<Song, "name" | "activeFormId">>): Promise<Song> {
    this.ensureLoaded();
    this.captureRevision("updateSong");
    if (partial.name !== undefined) this.data.song.name = partial.name;
    if (partial.activeFormId !== undefined) this.data.song.activeFormId = partial.activeFormId;
    await this.persist();
    return this.getSong();
  }

  // ── SongForm mutations ────────────────────────────────────────────────────

  async createSongForm(): Promise<SongForm> {
    this.ensureLoaded();
    this.captureRevision("createSongForm");

    // Auto-name: smallest positive integer (as string) not already in use
    const usedNames = new Set(this.data.song.songForms.map((f) => f.name));
    let n = 1;
    while (usedNames.has(`Form ${n}`)) n++;

    const form: SongForm = {
      id: randomUUID(),
      name: `Form ${n}`,
      bpm: 100,
      note: "q",
      pattern: [],
    };
    this.data.song.songForms.push(form);
    await this.persist();
    return deepCopy(form);
  }

  async updateSongForm(
    id: string,
    partial: Partial<Pick<SongForm, "name" | "bpm" | "pattern" | "note">>
  ): Promise<SongForm> {
    this.ensureLoaded();
    const form = this.data.song.songForms.find((f) => f.id === id);
    if (!form) throw new Error(`form not found: ${id}`);

    if (partial.bpm !== undefined) {
      if (typeof partial.bpm !== "number" || partial.bpm < 20 || partial.bpm > 999) {
        throw new Error("form bpm must be 20..999");
      }
    }
    if (partial.note !== undefined && !VALID_NOTES.has(partial.note)) {
      throw new Error("form note must be one of w,h,q,e,s");
    }
    if (partial.pattern !== undefined) {
      if (!Array.isArray(partial.pattern)) throw new Error("pattern must be an array");
      for (const entry of partial.pattern) {
        if (typeof entry !== "string" || !/^[A-Z]$/.test(entry)) {
          throw new Error("pattern entries must be single uppercase letters A-Z");
        }
      }
    }

    this.captureRevision("updateSongForm");
    if (partial.name !== undefined) form.name = partial.name;
    if (partial.bpm !== undefined) form.bpm = partial.bpm;
    if (partial.pattern !== undefined) form.pattern = partial.pattern;
    if (partial.note !== undefined) form.note = partial.note;
    await this.persist();
    return deepCopy(form);
  }

  async deleteSongForm(id: string): Promise<void> {
    this.ensureLoaded();
    const before = this.data.song.songForms.length;
    this.data.song.songForms = this.data.song.songForms.filter((f) => f.id !== id);
    if (this.data.song.songForms.length === before) throw new Error(`form not found: ${id}`);

    this.captureRevision("deleteSongForm");
    // If the deleted form was active, switch to first remaining (or null)
    if (this.data.song.activeFormId === id) {
      this.data.song.activeFormId = this.data.song.songForms[0]?.id ?? null;
    }
    await this.persist();
  }

  async setActiveFormId(id: string): Promise<Song> {
    this.ensureLoaded();
    if (!this.data.song.songForms.some((f) => f.id === id)) {
      throw new Error(`form not found: ${id}`);
    }
    this.captureRevision("setActiveFormId");
    this.data.song.activeFormId = id;
    await this.persist();
    return this.getSong();
  }

  // ── Section mutations ─────────────────────────────────────────────────────

  async upsertSection(
    letter: string,
    stanzas: Stanza[],
    bpm?: number,
    note?: NoteValue
  ): Promise<Section> {
    this.ensureLoaded();
    // Validate
    const validated = validateSection({ letter, stanzas, bpm, note });

    this.captureRevision("upsertSection");
    const existing = this.data.song.sections.find((s) => s.letter === letter);
    if (existing) {
      existing.stanzas = validated.stanzas;
      existing.bpm = validated.bpm;
      existing.note = validated.note;
    } else {
      this.data.song.sections.push({
        letter: validated.letter,
        stanzas: validated.stanzas,
        bpm: validated.bpm,
        note: validated.note,
      });
    }
    await this.persist();
    return deepCopy(this.data.song.sections.find((s) => s.letter === letter)!);
  }

  async deleteSection(letter: string): Promise<{ affectedForms: string[] }> {
    this.ensureLoaded();
    if (typeof letter !== "string" || !/^[A-Z]$/.test(letter)) {
      throw new Error("letter must be a single uppercase character A-Z");
    }
    if (!this.data.song.sections.some((s) => s.letter === letter)) {
      throw new Error(`section not found: ${letter}`);
    }
    this.captureRevision("deleteSection");

    // Remove the section
    this.data.song.sections = this.data.song.sections.filter((s) => s.letter !== letter);

    // Strip letter from all form patterns; collect names of affected forms
    const affectedForms: string[] = [];
    for (const form of this.data.song.songForms) {
      const before = form.pattern.length;
      form.pattern = form.pattern.filter((l) => l !== letter);
      if (form.pattern.length !== before) {
        affectedForms.push(form.name);
      }
    }

    await this.persist();
    return { affectedForms };
  }

  // ── Revision operations ───────────────────────────────────────────────────

  async restoreRevision(id: string): Promise<Song> {
    this.ensureLoaded();
    const rev = this.data.revisions.find((r) => r.id === id);
    if (!rev) throw new Error(`revision not found: ${id}`);

    this.captureRevision("restore");
    this.data.song = deepCopy(rev.song);
    await this.persist();
    return this.getSong();
  }
}
