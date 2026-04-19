// server/tests/revisions.test.ts
// Tests for the 25-revision ring buffer.

import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { SongStore } from "../src/store/song.js";

async function makeTmpStore(): Promise<{ store: SongStore; tmpFile: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rt-rev-test-"));
  const tmpFile = path.join(tmpDir, "song.json");
  const store = new SongStore(tmpFile);
  return { store, tmpFile };
}

describe("Revision history", () => {
  let store: SongStore;
  let tmpFile: string;

  beforeEach(async () => {
    const t = await makeTmpStore();
    store = t.store;
    tmpFile = t.tmpFile;
    await store.load();
  });

  it("appends a revision on every mutation", async () => {
    expect(store.listRevisions()).toHaveLength(0);
    await store.updateSong({ name: "v1" });
    expect(store.listRevisions()).toHaveLength(1);
    await store.updateSong({ name: "v2" });
    expect(store.listRevisions()).toHaveLength(2);
  });

  it("revisions are newest-first", async () => {
    await store.updateSong({ name: "first" });
    await store.updateSong({ name: "second" });
    const revs = store.listRevisions();
    expect(revs[0].reason).toBe("updateSong");
    // The first revision was captured before "second" was written
    // Its song snapshot should be "first"
    const fullRev = store.getRevision(revs[0].id)!;
    // The snapshot in revisions[0] is the state BEFORE "second" mutation
    // Actually our implementation captures BEFORE writing, so revs[0] has the "first" state
    expect(fullRev.song.name).toBe("first");
  });

  it("trims revisions to 25 after 30 mutations", async () => {
    for (let i = 1; i <= 30; i++) {
      await store.updateSong({ name: `r-${i}` });
    }
    const revs = store.listRevisions();
    expect(revs).toHaveLength(25);
  });

  it("persists revisions across store reload", async () => {
    await store.updateSong({ name: "persisted" });
    const firstRevId = store.listRevisions()[0].id;

    const store2 = new SongStore(tmpFile);
    await store2.load();
    expect(store2.listRevisions()).toHaveLength(1);
    expect(store2.listRevisions()[0].id).toBe(firstRevId);
  });

  it("getRevision returns the full snapshot", async () => {
    await store.upsertSection("A", [{ bars: 8, num: 4, denom: 4 }]);
    const revs = store.listRevisions();
    const rev = store.getRevision(revs[0].id);
    expect(rev).toBeDefined();
    expect(rev!.id).toBe(revs[0].id);
    expect(rev!.song).toBeDefined();
    expect(typeof rev!.at).toBe("string");
  });

  it("restoreRevision replaces song with snapshot", async () => {
    await store.updateSong({ name: "snapshot-state" });
    const revId = store.listRevisions()[0].id;
    const snapshotSong = store.getRevision(revId)!.song;

    // Make a further mutation
    await store.updateSong({ name: "after-mutation" });
    expect(store.getSong().name).toBe("after-mutation");

    // Restore
    const restored = await store.restoreRevision(revId);
    expect(restored.name).toBe(snapshotSong.name);
  });

  it("restoreRevision appends a new revision with reason 'restore'", async () => {
    await store.updateSong({ name: "v1" });
    const revId = store.listRevisions()[0].id;

    await store.restoreRevision(revId);
    const revs = store.listRevisions();
    // The newest revision should have reason "restoreRevision"
    expect(revs[0].reason).toBe("restoreRevision");
  });
});
