// server/tests/song.test.ts
// Tests for SongStore CRUD, validation, and the write route.

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";

import { SongStore, validateStanza, validateSection } from "../src/store/song.js";
import songRoutes from "../src/routes/song.js";
import type { TransportSnapshot } from "../src/reaper/web-remote.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeTmpStore(): Promise<{ store: SongStore; tmpFile: string; tmpDir: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rt-song-test-"));
  const tmpFile = path.join(tmpDir, "song.json");
  const store = new SongStore(tmpFile);
  return { store, tmpFile, tmpDir };
}

// ── Fresh-start / migration ──────────────────────────────────────────────────

describe("SongStore — fresh-start / migration", () => {
  it("initialises empty song when no file exists", async () => {
    const { store } = await makeTmpStore();
    await store.load();
    const song = store.getSong();
    expect(song.name).toBe("Untitled");
    expect(song.sections).toHaveLength(0);
    expect(song.songForms).toHaveLength(1);
    expect(song.songForms[0].name).toBe("1");
    expect(song.activeFormId).toBe(song.songForms[0].id);
  });

  it("renames legacy file to .legacy.json and starts fresh", async () => {
    const { store, tmpFile, tmpDir } = await makeTmpStore();
    // Write a legacy shape
    await fs.mkdir(path.dirname(tmpFile), { recursive: true });
    await fs.writeFile(tmpFile, JSON.stringify({ sections: [], songForm: { sectionIds: [] } }));

    await store.load();
    const song = store.getSong();
    expect(song.name).toBe("Untitled");

    // Legacy file should now be renamed
    const legacyFile = tmpFile + ".legacy.json";
    const legacyExists = await fs.stat(legacyFile).then(() => true).catch(() => false);
    expect(legacyExists).toBe(true);
  });

  it("reloads correctly from a valid new-shape file", async () => {
    const { store, tmpFile } = await makeTmpStore();
    await store.load();
    await store.updateSong({ name: "My Song" });

    // Load a new instance from the same file
    const store2 = new SongStore(tmpFile);
    await store2.load();
    expect(store2.getSong().name).toBe("My Song");
  });
});

// ── upsertSection ─────────────────────────────────────────────────────────────

describe("SongStore — upsertSection", () => {
  let store: SongStore;
  beforeEach(async () => {
    const { store: s } = await makeTmpStore();
    store = s;
    await store.load();
  });

  it("creates a new section", async () => {
    const sec = await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    expect(sec.letter).toBe("A");
    expect(sec.stanzas).toHaveLength(1);
    expect(store.getSong().sections).toHaveLength(1);
  });

  it("replaces an existing section by letter", async () => {
    await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    await store.upsertSection("A", [{ bars: 16, num: 3, denom: 8 }]);
    const sections = store.getSong().sections;
    expect(sections).toHaveLength(1);
    expect(sections[0].stanzas[0].bars).toBe(16);
  });

  it("rejects invalid letter (not /^[A-Z]/)", async () => {
    await expect(store.upsertSection("a", [{ bars: 4, num: 4, denom: 4 }])).rejects.toThrow();
  });

  it("rejects stanza with bars < 1", async () => {
    await expect(store.upsertSection("A", [{ bars: 0, num: 4, denom: 4 }])).rejects.toThrow();
  });

  it("rejects stanza with bpm out of range", async () => {
    await expect(
      store.upsertSection("A", [{ bars: 8, num: 4, denom: 4, bpm: 10 }])
    ).rejects.toThrow();
    await expect(
      store.upsertSection("A", [{ bars: 8, num: 4, denom: 4, bpm: 1000 }])
    ).rejects.toThrow();
  });

  it("rejects stanza with invalid denom", async () => {
    await expect(store.upsertSection("A", [{ bars: 8, num: 4, denom: 3 }])).rejects.toThrow();
  });

  it("rejects stanza with invalid note value", async () => {
    await expect(
      store.upsertSection("A", [{ bars: 8, num: 4, denom: 4, note: "x" as any }])
    ).rejects.toThrow();
  });
});

// ── deleteSection ─────────────────────────────────────────────────────────────

describe("SongStore — deleteSection", () => {
  let store: SongStore;
  beforeEach(async () => {
    const { store: s } = await makeTmpStore();
    store = s;
    await store.load();
  });

  it("removes the section", async () => {
    await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    await store.deleteSection("A");
    expect(store.getSong().sections).toHaveLength(0);
  });

  it("strips the letter from all form patterns and returns affectedForms", async () => {
    const formId = store.getSong().songForms[0].id;
    await store.updateSongForm(formId, { pattern: ["A", "B", "A"] });
    await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    const { affectedForms } = await store.deleteSection("A");
    expect(affectedForms).toContain("1");
    const pattern = store.getSong().songForms[0].pattern;
    expect(pattern).not.toContain("A");
    expect(pattern).toContain("B");
  });

  it("returns empty affectedForms when no forms reference the letter", async () => {
    await store.upsertSection("Z", [{ bars: 4, num: 4, denom: 4 }]);
    const { affectedForms } = await store.deleteSection("Z");
    expect(affectedForms).toHaveLength(0);
  });
});

// ── SongForm CRUD ─────────────────────────────────────────────────────────────

describe("SongStore — SongForm CRUD", () => {
  let store: SongStore;
  beforeEach(async () => {
    const { store: s } = await makeTmpStore();
    store = s;
    await store.load();
  });

  it("createSongForm auto-names with the next available integer", async () => {
    await store.createSongForm(); // should be "2" (existing is "1")
    const forms = store.getSong().songForms;
    expect(forms).toHaveLength(2);
    expect(forms.map((f) => f.name)).toContain("2");
  });

  it("updateSongForm patches name, bpm, pattern", async () => {
    const formId = store.getSong().songForms[0].id;
    await store.updateSongForm(formId, { name: "Intro", bpm: 120, pattern: ["A", "B"] });
    const form = store.getSong().songForms.find((f) => f.id === formId)!;
    expect(form.name).toBe("Intro");
    expect(form.bpm).toBe(120);
    expect(form.pattern).toEqual(["A", "B"]);
  });

  it("deleteSongForm removes the form", async () => {
    await store.createSongForm();
    const forms = store.getSong().songForms;
    const idToDelete = forms[0].id;
    await store.deleteSongForm(idToDelete);
    expect(store.getSong().songForms).toHaveLength(1);
    expect(store.getSong().songForms.find((f) => f.id === idToDelete)).toBeUndefined();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("SongStore — validation", () => {
  it("validateStanza rejects non-power-of-two denom", () => {
    expect(() => validateStanza({ bars: 4, num: 4, denom: 3 }, 0)).toThrow();
    expect(() => validateStanza({ bars: 4, num: 4, denom: 5 }, 0)).toThrow();
    expect(() => validateStanza({ bars: 4, num: 4, denom: 6 }, 0)).toThrow();
  });

  it("validateStanza accepts all valid NoteValues", () => {
    for (const note of ["w", "h", "q", "e", "s"]) {
      expect(() => validateStanza({ bars: 4, num: 4, denom: 4, note }, 0)).not.toThrow();
    }
  });

  it("validateSection rejects multi-char letter", () => {
    expect(() =>
      validateSection({ letter: "AB", stanzas: [{ bars: 4, num: 4, denom: 4 }] })
    ).toThrow();
  });
});

// ── Route tests: POST /api/song/forms/:id/write ────────────────────────────────

function makeRouteDeps(tmpFile: string) {
  const store = new SongStore(tmpFile);

  const rtCalls: Array<[string, Record<string, unknown>]> = [];
  const rt = {
    send: async (addr: string, payload: Record<string, unknown> = {}) => {
      rtCalls.push([addr, payload]);
    },
  };

  const webRemote = {
    getTransport: async (): Promise<TransportSnapshot> => ({
      playState: "stopped" as const,
      positionSeconds: 10.0,
      repeat: false,
      positionStr: "0:10.000",
      positionBeats: "4.1.00",
    }),
  };

  const wsBroadcasts: unknown[] = [];
  const ws = { broadcast: (e: unknown) => { wsBroadcasts.push(e); } };
  const state = { setTake: (_t: any) => {}, transport: {}, currentTake: null };

  return { store, rt, rtCalls, webRemote, ws, state, wsBroadcasts };
}

async function buildWriteApp(deps: ReturnType<typeof makeRouteDeps>) {
  const app = Fastify({ logger: false });
  await app.register(
    songRoutes({
      store: deps.store as any,
      rt: deps.rt as any,
      webRemote: deps.webRemote as any,
      state: deps.state as any,
      ws: deps.ws as any,
    })
  );
  return app;
}

describe("POST /api/song/forms/:id/write", () => {
  it("calls rt.send with correct payload when form has sections", async () => {
    const { store, tmpFile } = await makeTmpStore();
    const deps = makeRouteDeps(tmpFile);
    deps.store = store;
    await store.load();

    // Set up a form with sections
    const formId = store.getSong().songForms[0].id;
    await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    await store.updateSongForm(formId, { pattern: ["A"] });

    const app = await buildWriteApp(deps);
    const res = await app.inject({
      method: "POST",
      url: `/api/song/forms/${formId}/write`,
      payload: { regionName: "verse" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.startTime).toBe(10.0);
    expect(deps.rtCalls[0][0]).toBe("songform.write");
    const payload = deps.rtCalls[0][1] as any;
    expect(payload.regionName).toBe("verse");
    expect(Array.isArray(payload.rows)).toBe(true);
    expect(payload.rows[0]).toMatchObject({ barOffset: 0, num: 4, denom: 4 });
  });

  it("returns 400 when the pattern is empty", async () => {
    const { store, tmpFile } = await makeTmpStore();
    const deps = makeRouteDeps(tmpFile);
    deps.store = store;
    await store.load();

    const formId = store.getSong().songForms[0].id;
    // pattern is empty by default

    const app = await buildWriteApp(deps);
    const res = await app.inject({
      method: "POST",
      url: `/api/song/forms/${formId}/write`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
  });
});
