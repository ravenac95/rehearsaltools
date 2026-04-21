// server/tests/prefs.test.ts
// Tests for the PrefsStore — a tiny persistent JSON store for server-wide
// user preferences (currently just the selected rehearsal type).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { PrefsStore } from "../src/store/prefs.js";

async function mkTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "prefs-test-"));
}

describe("PrefsStore.load", () => {
  let dir: string;
  beforeEach(async () => { dir = await mkTempDir(); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

  it("returns null when file is missing (ENOENT)", async () => {
    const store = new PrefsStore(path.join(dir, "prefs.json"));
    await store.load();
    expect(store.getRehearsalTypeId()).toBeNull();
  });

  it("loads persisted rehearsalTypeId", async () => {
    const file = path.join(dir, "prefs.json");
    await fs.writeFile(file, JSON.stringify({ rehearsalTypeId: "piano-vox" }), "utf8");
    const store = new PrefsStore(file);
    await store.load();
    expect(store.getRehearsalTypeId()).toBe("piano-vox");
  });

  it("tolerates a prefs file with no rehearsalTypeId key", async () => {
    const file = path.join(dir, "prefs.json");
    await fs.writeFile(file, JSON.stringify({}), "utf8");
    const store = new PrefsStore(file);
    await store.load();
    expect(store.getRehearsalTypeId()).toBeNull();
  });
});

describe("PrefsStore.setRehearsalTypeId", () => {
  let dir: string;
  beforeEach(async () => { dir = await mkTempDir(); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

  it("persists the id and a fresh load returns it", async () => {
    const file = path.join(dir, "prefs.json");
    const a = new PrefsStore(file);
    await a.load();
    await a.setRehearsalTypeId("full-band");

    const b = new PrefsStore(file);
    await b.load();
    expect(b.getRehearsalTypeId()).toBe("full-band");
  });

  it("creates the parent directory if it doesn't exist", async () => {
    const file = path.join(dir, "nested", "sub", "prefs.json");
    const store = new PrefsStore(file);
    await store.load();
    await store.setRehearsalTypeId("piano-vox");
    const raw = await fs.readFile(file, "utf8");
    expect(JSON.parse(raw).rehearsalTypeId).toBe("piano-vox");
  });

  it("overwrites a previously persisted id", async () => {
    const file = path.join(dir, "prefs.json");
    const store = new PrefsStore(file);
    await store.load();
    await store.setRehearsalTypeId("full-band");
    await store.setRehearsalTypeId("piano-vox");
    expect(store.getRehearsalTypeId()).toBe("piano-vox");
    const raw = await fs.readFile(file, "utf8");
    expect(JSON.parse(raw).rehearsalTypeId).toBe("piano-vox");
  });
});
