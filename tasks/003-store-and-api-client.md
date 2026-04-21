# Task 003: Frontend — Store Extension and API Client

## Objective

Extend `web/src/api/client.ts` with new types and endpoint methods for rehearsal and songs. Extend `web/src/store.ts` with the rehearsal slice (status, segments, type picker state, simple-mode values, UI flags). Wire the new WS message types into `applyWsMessage`.

## Context

The Zustand store is in `/home/user/rehearsaltools/web/src/store.ts`. The API client is in `/home/user/rehearsaltools/web/src/api/client.ts`. Existing tests at `/home/user/rehearsaltools/web/tests/store.test.ts` use `useStore.setState()` and `useStore.getState()` to test message handling — the new tests follow the same pattern.

The store uses `create<AppStore>((set, get) => (...))` from Zustand 5. No immer middleware is used.

## Requirements

### `web/src/api/client.ts` additions

**New types:**
```ts
export interface RehearsalType {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface RehearsalSegment {
  id: string;
  type: 'take' | 'discussion';
  num: number;
  songId: string;
  songName: string;
  startPosition: number;
}

export type RehearsalStatus = 'idle' | 'discussion' | 'take' | 'playback';

export interface SongListItem {
  id: string;
  name: string;
  bpm: number;
  timeSig: string;
}
```

**Extend `WsMessage` union:**
```ts
| { type: 'rehearsal:started';  data: { segment: RehearsalSegment } }
| { type: 'rehearsal:segment';  data: { segment: RehearsalSegment } }
| { type: 'rehearsal:ended';    data: Record<string, never> }
```

**Extend `WsMessage` snapshot type** to include optional fields:
```ts
data: {
  transport: Partial<TransportState>;
  currentTake: Take | null;
  song: Song;
  rehearsalSegments?: RehearsalSegment[];
  rehearsalStatus?: RehearsalStatus;
}
```

**New `api` methods:**
```ts
// Rehearsal
getRehearsalTypes: () => req<{ types: RehearsalType[] }>('/api/rehearsal/types'),
startRehearsal: (typeId: string) => req<{ ok: boolean; segment: RehearsalSegment }>(
  '/api/rehearsal/start', { method: 'POST', body: JSON.stringify({ typeId }) }),
setCategory: (category: 'take' | 'discussion') => req<{ ok: boolean; segment: RehearsalSegment }>(
  '/api/rehearsal/set-category', { method: 'POST', body: JSON.stringify({ category }) }),
endRehearsal: () => req('/api/rehearsal/end', { method: 'POST', body: JSON.stringify({}) }),

// Songs
listSongs: () => req<{ songs: SongListItem[] }>('/api/songs'),
selectSong: (id: string) => req<{ ok: boolean; song: Song }>(
  `/api/songs/${id}/select`, { method: 'POST', body: JSON.stringify({}) }),
```

### `web/src/store.ts` additions

**New state fields on `AppStore`:**
```ts
// Rehearsal state (server-authoritative, driven by WS)
rehearsalStatus: RehearsalStatus;
rehearsalTypes: RehearsalType[];
rehearsalType: RehearsalType | null;
takes: RehearsalSegment[];
currentSegmentStart: number | null;

// Playback
currentTakeIdx: number | null;  // index into takes[] for playback

// UI flags
songMode: 'simple' | 'complex';
playbackDrawerOpen: boolean;
songPickerOpen: boolean;
typePickerOpen: boolean;
menuOpen: boolean;

// Simple mode song values (independent of complex Song model)
simpleBpm: number;
simpleNote: NoteValue;
simpleNum: number;
simpleDenom: number;
```

**Initial values:**
```ts
rehearsalStatus: 'idle',
rehearsalTypes: [],
rehearsalType: null,
takes: [],
currentSegmentStart: null,
currentTakeIdx: null,
songMode: 'simple',
playbackDrawerOpen: false,
songPickerOpen: false,
typePickerOpen: false,
menuOpen: false,
simpleBpm: 120,
simpleNote: 'q',
simpleNum: 4,
simpleDenom: 4,
```

**New actions on `AppStore`:**
```ts
fetchRehearsalTypes: () => Promise<void>;
setRehearsalType: (type: RehearsalType) => void;  // local only, no server call
startRehearsal: () => Promise<void>;    // calls api.startRehearsal with current rehearsalType.id
setCategory: (category: 'take' | 'discussion') => Promise<void>;
endRehearsal: () => Promise<void>;
stopPlayback: () => Promise<void>;      // calls api.stop() then sets rehearsalStatus to 'discussion'
selectTakeForPlayback: (idx: number) => void; // sets currentTakeIdx, status to 'playback'
setSongMode: (mode: 'simple' | 'complex') => void;
setPlaybackDrawerOpen: (open: boolean) => void;
setSongPickerOpen: (open: boolean) => void;
setTypePickerOpen: (open: boolean) => void;
setMenuOpen: (open: boolean) => void;
setSimpleBpm: (bpm: number) => void;
setSimpleNote: (note: NoteValue) => void;
setSimpleTimeSig: (num: number, denom: number) => void;
```

**`applyWsMessage` additions:**
- `rehearsal:started` → push segment to `takes`, set `rehearsalStatus: 'discussion'`, set `currentSegmentStart: segment.startPosition`
- `rehearsal:segment` → push segment to `takes`, set `rehearsalStatus: segment.type`, set `currentSegmentStart: segment.startPosition`
- `rehearsal:ended` → set `takes: []`, `rehearsalStatus: 'idle'`, `currentSegmentStart: null`, `currentTakeIdx: null`
- `snapshot` → if `rehearsalSegments` present, set `takes: rehearsalSegments`; if `rehearsalStatus` present, set `rehearsalStatus`

**`refresh` action update:**
- After loading song, also call `fetchRehearsalTypes()` if `rehearsalTypes` is empty

## Existing Code References

- `/home/user/rehearsaltools/web/src/store.ts` — extend in-place
- `/home/user/rehearsaltools/web/src/api/client.ts` — extend in-place
- `/home/user/rehearsaltools/web/tests/store.test.ts` — test pattern to follow

## Implementation Details

- `startRehearsal` must guard against `rehearsalType === null` and throw a meaningful error
- `stopPlayback`: call `api.stop()`, then set `rehearsalStatus` to `'discussion'` optimistically (WS transport event will confirm)
- `selectTakeForPlayback` is purely local state — playback is triggered by the drawer UI calling `api.playRegion()` if needed in a later task; for now just update `currentTakeIdx` and `rehearsalStatus`

## Acceptance Criteria

- [ ] `api.getRehearsalTypes`, `api.startRehearsal`, `api.setCategory`, `api.endRehearsal` exist and have correct signatures
- [ ] `api.listSongs`, `api.selectSong` exist
- [ ] Store initializes with all new fields at correct defaults
- [ ] `applyWsMessage` correctly handles `rehearsal:started`, `rehearsal:segment`, `rehearsal:ended`
- [ ] `applyWsMessage` snapshot handling populates `rehearsalSegments` / `rehearsalStatus`
- [ ] All existing `web/tests/store.test.ts` tests still pass
- [ ] TypeScript compiles without errors

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/web/tests/rehearsal-store.test.ts`
- **Test framework:** Vitest
- **Test command:** `pnpm -F web test`

### Tests to Write

1. **Initial state**: `rehearsalStatus` is `'idle'`, `takes` is `[]`, `currentSegmentStart` is null
2. **`rehearsal:started` WS message**: pushes segment, sets `rehearsalStatus: 'discussion'`, sets `currentSegmentStart`
3. **`rehearsal:segment` with type 'take'**: pushes take segment, sets `rehearsalStatus: 'take'`
4. **`rehearsal:segment` with type 'discussion'**: sets `rehearsalStatus: 'discussion'`
5. **`rehearsal:ended`**: clears `takes`, resets `rehearsalStatus` to `'idle'`
6. **snapshot with `rehearsalSegments`**: populates `takes` from snapshot
7. **`setSongMode`**: updates `songMode`
8. **`setSimpleBpm`**: updates `simpleBpm`
9. **`setSimpleTimeSig`**: updates `simpleNum` and `simpleDenom`

### TDD Process

1. Write failing tests first
2. Implement to pass
3. Run `pnpm -F web test`, no regressions

## Dependencies

- Depends on: 001 (to know the server API shapes), 002 (for songs endpoint shapes)
- Blocks: 005–011 (all frontend components consume store)

## Parallelism

Can start after 001 and 002 are complete. Blocks all component tasks.
