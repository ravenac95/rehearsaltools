# Task 001: Server — Rehearsal State, AppState Extension, and New Route Module

## Objective

Extend `AppState` to track rehearsal segments, add the `RehearsalType` config list to `server/src/config.ts`, and create `server/src/routes/rehearsal.ts` with four endpoints: `GET /api/rehearsal/types`, `POST /api/rehearsal/start`, `POST /api/rehearsal/set-category`, `POST /api/rehearsal/end`. Register the new route module in `server/src/index.ts`.

## Context

The server is a Fastify app wired in `/home/user/rehearsaltools/server/src/index.ts`. Existing routes follow the pattern of a factory function receiving a `deps` object and returning an `async (app: FastifyInstance) => void`. `AppState` lives in `server/src/state.ts` and currently tracks only `transport` and `currentTake`. The `ReaperNativeClient` (in `server/src/osc/client.ts`) has `play()`, `stop()`, `record()`, `seek()`, `setTempoRaw()`, and `toggleMetronome()` methods.

## Requirements

### `server/src/config.ts` additions
- Add a `RehearsalType` interface: `{ id: string; name: string; desc: string; emoji: string }`
- Add `rehearsalTypes: RehearsalType[]` to the `Config` interface
- Populate it with two defaults in `loadConfig()`:
  - `{ id: 'full-band',  name: 'Full Band',   desc: 'All instruments, full monitoring',   emoji: '🎸' }`
  - `{ id: 'piano-vox',  name: 'Piano + Vox', desc: 'Stripped back, piano and vocals only', emoji: '🎹' }`

### `server/src/state.ts` additions
- Add `RehearsalSegment` interface:
  ```ts
  interface RehearsalSegment {
    id: string;
    type: 'take' | 'discussion';
    num: number;
    songId: string;
    songName: string;
    startPosition: number;
  }
  ```
- Add `RehearsalStatus` type: `'idle' | 'discussion' | 'take' | 'playback'`
- Add to `AppState` class:
  - `rehearsalStatus: RehearsalStatus = 'idle'`
  - `rehearsalSegments: RehearsalSegment[] = []`
  - `_discussionCount = 0`, `_takeCount = 0`
  - `startRehearsal(position: number, songId: string, songName: string): RehearsalSegment` — resets counts, opens first discussion segment, sets status to `'discussion'`, returns new segment
  - `openSegment(type: 'take' | 'discussion', position: number, songId: string, songName: string): RehearsalSegment` — increments correct counter, pushes new segment, updates status, returns it
  - `endRehearsal(): void` — resets segments array, counts, status to `'idle'`
  - `setPlayback(): void` — sets status to `'playback'`

### `server/src/routes/rehearsal.ts`
New file. Pattern matches existing route modules. Deps: `{ reaper: ReaperNativeClient; state: AppState; ws: WsHub; config: Config; store: SongStore }`.

Endpoints:

**`GET /api/rehearsal/types`**
- Returns `{ ok: true, types: config.rehearsalTypes }`

**`POST /api/rehearsal/start`**
- Body: `{ typeId: string }`
- Validate `typeId` exists in `config.rehearsalTypes`; 400 if not
- If `state.rehearsalStatus !== 'idle'`, return 409 `{ ok: false, error: 'rehearsal already in progress' }`
- Call `reaper.record()`
- Call `state.startRehearsal(state.transport.position ?? 0, song.id, song.name)` where `song = store.getSong()`
- Broadcast `{ type: 'rehearsal:started', data: { segment } }`
- Return `{ ok: true, segment }`

**`POST /api/rehearsal/set-category`**
- Body: `{ category: 'take' | 'discussion' }`
- If `state.rehearsalStatus === 'idle'`, return 409 `{ ok: false, error: 'no rehearsal in progress' }`
- If category is not `'take'` or `'discussion'`, return 400
- Determine metronome action: if switching to `take` and `!state.transport.metronome`, call `reaper.toggleMetronome()`; if switching to `discussion` and `state.transport.metronome`, call `reaper.toggleMetronome()`
- Call `state.openSegment(category, state.transport.position ?? 0, song.id, song.name)`
- Broadcast `{ type: 'rehearsal:segment', data: { segment } }`
- Return `{ ok: true, segment }`

**`POST /api/rehearsal/end`**
- Call `reaper.stop()`
- Call `state.endRehearsal()`
- Broadcast `{ type: 'rehearsal:ended', data: {} }`
- Return `{ ok: true }`

### `server/src/index.ts`
- Import `rehearsalRoutes` from `./routes/rehearsal.js`
- Register it passing `{ reaper, state, ws, config, store }` (config must be passed through; refactor the `main()` function to keep config in scope)

### WS snapshot update
- In the `/ws` route handler, extend the snapshot payload with `rehearsalSegments: state.rehearsalSegments, rehearsalStatus: state.rehearsalStatus`

## Existing Code References

- `/home/user/rehearsaltools/server/src/state.ts` — extend this file
- `/home/user/rehearsaltools/server/src/config.ts` — extend this file
- `/home/user/rehearsaltools/server/src/index.ts` — register new routes + extend snapshot
- `/home/user/rehearsaltools/server/src/routes/transport.ts` — copy structural pattern
- `/home/user/rehearsaltools/server/src/osc/client.ts` — available Reaper methods
- `/home/user/rehearsaltools/server/src/ws.ts` — WsHub.broadcast() signature
- `/home/user/rehearsaltools/server/src/store/song.ts` — SongStore.getSong()

## Implementation Details

- Use `randomUUID()` from `node:crypto` for segment IDs (already imported in `store/song.ts` for reference)
- Keep `reaper.toggleMetronome()` calls idempotent-safe by checking `state.transport.metronome` first
- The `config` object is created in `main()` but not currently threaded to routes — add it to the route registration call pattern; avoid a global singleton

## Acceptance Criteria

- [ ] `GET /api/rehearsal/types` returns the two default types
- [ ] `POST /api/rehearsal/start` with valid typeId starts recording and returns a discussion segment
- [ ] `POST /api/rehearsal/start` with invalid typeId returns 400
- [ ] `POST /api/rehearsal/start` when already in progress returns 409
- [ ] `POST /api/rehearsal/set-category {category:'take'}` opens a take segment and fires toggleMetronome if metronome is off
- [ ] `POST /api/rehearsal/set-category {category:'discussion'}` opens discussion segment and fires toggleMetronome if metronome is on
- [ ] `POST /api/rehearsal/end` stops Reaper, clears state, broadcasts ended event
- [ ] WS snapshot includes `rehearsalSegments` and `rehearsalStatus`
- [ ] Existing tests still pass (`pnpm -F web test`)
- [ ] TypeScript compiles without errors (`pnpm -F server build` or `tsc --noEmit`)

## TDD Mode

This task uses Test-Driven Development. Write tests BEFORE implementation.

### Test Specifications

- **Test file:** `/home/user/rehearsaltools/server/tests/rehearsal.test.ts`
- **Test framework:** Vitest (create `server/tests/` dir; add `vitest` to server devDeps if not present; or use Fastify's `inject()` in a separate test runner — check `server/package.json` for existing test setup)
- **Test command:** Check `server/package.json`; if no test script exists, add `"test": "vitest run"` and create `vitest.config.ts` in `server/`

### Tests to Write

1. **`AppState.startRehearsal`**: creates first discussion segment with num=1, sets status to 'discussion', resets counts
2. **`AppState.openSegment take`**: increments take counter, pushes take segment
3. **`AppState.openSegment discussion`**: increments discussion counter, pushes discussion segment
4. **`AppState.endRehearsal`**: clears segments array, sets status to 'idle'
5. **`GET /api/rehearsal/types`**: returns config types array
6. **`POST /api/rehearsal/start` valid**: 200 with segment, status becomes discussion
7. **`POST /api/rehearsal/start` invalid typeId**: 400
8. **`POST /api/rehearsal/start` already in progress**: 409
9. **`POST /api/rehearsal/set-category` when idle**: 409
10. **`POST /api/rehearsal/set-category {category:'take'}`**: 200, returns take segment
11. **`POST /api/rehearsal/end`**: 200, state.rehearsalStatus is 'idle'

### TDD Process

1. Write the tests above — they should FAIL (RED)
2. Implement the minimum code to make them pass (GREEN)
3. Run the full test suite to check for regressions
4. Refactor if needed while keeping tests green

## Dependencies

- Depends on: None (first task)
- Blocks: 002 (songs endpoint), 003 (store extension), 004 (CSS), 005+ (frontend components)

## Parallelism

Can run in parallel with: 002 (songs route), 004 (CSS migration)
