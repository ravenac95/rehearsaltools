// server/src/flatten.ts
// Pure function: flattens a SongForm within a Song into FlatRow[] for REAPER.
// No I/O, no side effects.

import type { Song, NoteValue } from "./store/song.js";

export interface FlatRow {
  barOffset: number;
  num: number;
  denom: number;
  bpm: number;
}

export interface FlatResult {
  rows: FlatRow[];              // REAPER payload — note-type intentionally omitted
  effectiveNotes: NoteValue[];  // one per FlatRow (for future UI use / debug)
  totalBars: number;
}

interface RawRow {
  barOffset: number;
  num: number;
  denom: number;
  bpm: number;
  note: NoteValue;
}

/**
 * Flatten the SongForm identified by `formId` within `song` into a
 * `FlatResult` suitable for the REAPER `/rt/songform.write` contract.
 *
 * BPM inheritance:  stanza.bpm ?? section.bpm ?? form.bpm
 * Note inheritance: stanza.note ?? section.note ?? form.note
 *
 * Consecutive rows with identical {num, denom, bpm} are collapsed (the note
 * field does NOT affect collapse since it is not part of the REAPER payload).
 */
export function flattenForm(song: Song, formId: string): FlatResult {
  // 1. Find the form
  const form = song.songForms.find((f) => f.id === formId);
  if (!form) throw new Error(`form not found: ${formId}`);

  // Edge case: empty pattern
  if (form.pattern.length === 0) {
    return { rows: [], effectiveNotes: [], totalBars: 0 };
  }

  // Build a letter → section lookup
  const sectionByLetter = new Map(song.sections.map((s) => [s.letter, s]));

  // 2. Expand the pattern into raw rows
  const raw: RawRow[] = [];
  let cursor = 0;
  let totalBars = 0;

  for (const letter of form.pattern) {
    const section = sectionByLetter.get(letter);
    if (!section) throw new Error(`section not found: ${letter}`);

    for (const stanza of section.stanzas) {
      const effectiveBpm = stanza.bpm ?? section.bpm ?? form.bpm;
      // TODO: send note-type to REAPER once ReaScript handler supports it
      // (see /rt/songform.write). effectiveNote is computed above.
      const effectiveNote: NoteValue = stanza.note ?? section.note ?? form.note;

      raw.push({
        barOffset: cursor,
        num: stanza.num,
        denom: stanza.denom,
        bpm: effectiveBpm,
        note: effectiveNote,
      });

      cursor += stanza.bars;
      totalBars += stanza.bars;
    }
  }

  // 3. Collapse consecutive rows with identical {num, denom, bpm}
  // Note: effectiveNote does NOT affect collapse (not in REAPER payload)
  const collapsed: RawRow[] = [];
  for (const r of raw) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.num === r.num && last.denom === r.denom && last.bpm === r.bpm) {
      continue; // same marker — skip
    }
    collapsed.push(r);
  }

  // 4. Build REAPER payload (no note field) and effectiveNotes array
  const rows: FlatRow[] = collapsed.map(({ barOffset, num, denom, bpm }) => ({
    barOffset,
    num,
    denom,
    bpm,
  }));

  const effectiveNotes: NoteValue[] = collapsed.map((r) => r.note);

  return { rows, effectiveNotes, totalBars };
}
