// server/src/store/prefs.ts
// Tiny persistent store for server-wide user preferences. Currently holds
// only the last-selected rehearsal type id; uses the same atomic-write
// pattern as store/song.ts.

import { promises as fs } from "node:fs";
import path from "node:path";

interface PrefsShape {
  rehearsalTypeId?: string | null;
}

export class PrefsStore {
  private data: PrefsShape = {};
  private loaded = false;

  constructor(private filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      this.data = {
        rehearsalTypeId:
          typeof parsed.rehearsalTypeId === "string" ? parsed.rehearsalTypeId : null,
      };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.data = {};
      } else {
        throw err;
      }
    }
    this.loaded = true;
  }

  private ensureLoaded(): void {
    if (!this.loaded) throw new Error("prefs store not loaded");
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  getRehearsalTypeId(): string | null {
    this.ensureLoaded();
    return this.data.rehearsalTypeId ?? null;
  }

  async setRehearsalTypeId(id: string): Promise<void> {
    this.ensureLoaded();
    this.data.rehearsalTypeId = id;
    await this.persist();
  }
}
