# Task 01: Lua foundation — payload helper and handler contract updates

## Dependencies
None.

## Goal

Create the shared `payload.lua` helper used by every new action script, and
update the two handler modules whose return-value or input contract changes
under the new design. All changes are covered by failing tests first.

## Files

### Create

- `reascripts/src/payload.lua`
- `reascripts/tests/test_payload.lua`

### Modify

- `reascripts/src/handlers/regions.lua`
- `reascripts/src/handlers/songform.lua`
- `reascripts/tests/test_handlers.lua`

## TDD steps

### 1. `payload.lua` — extracts the JSON string arg from REAPER's action context

REAPER passes the single OSC string arg to a custom action via
`reaper.get_action_context()`. Per the radugin pattern, the string is the 7th
return value (index 7 in the returned tuple). The helper must:

- Call `reaper.get_action_context()` (or, for tests, accept an injected
  context function) and read the OSC arg at position 7.
- Parse the string as JSON using the existing `reascripts/src/json.lua`.
- Return `(tbl, nil)` on success or `(nil, err)` on failure.
- Handle the empty-string case (no payload) by returning `({}, nil)`.

Public API (draft):

```lua
local payload = dofile("src/payload.lua")
local data, err = payload.read(get_context_fn)  -- fn optional; defaults to reaper.get_action_context
```

Test cases for `test_payload.lua`:

- Empty string arg → returns `{}` with no error.
- Valid JSON object `{"name":"intro"}` → returns `{name = "intro"}`.
- Malformed JSON → returns `nil, "parse error: …"`.
- Injected context fn receives no args and returns `(nil, nil, nil, nil, nil, nil, "<json>")`.

### 2. `regions.lua` — `new`, `rename`, `seek_to_end` no longer return data; `play` keeps returning for tests only

The PRD says action scripts discard return values — the dispatcher is gone.
Update handlers so:

- `new(payload)`: still creates the region (side effects unchanged). Return
  value should be `nil` (or drop the `return` statement). Update the handler
  test in `test_handlers.lua` accordingly — remove assertions on the return
  value; keep assertions on adapter side effects (`add_region` was called with
  the expected args).
- `rename(payload)`: same — drop the return; keep the side-effect assertions.
- `seek_to_end(_payload)`: drop the `return {position = end_t}`. Keep the
  `set_edit_cursor` call; test should assert `_cursor == expected_end`.
- `play(payload)`: leave as-is (return value is harmless and tests read it).

Error paths still return `nil, err` so the handler can short-circuit on
validation failures.

### 3. `songform.lua` — accept `startTime` from payload, drop return

- Add `startTime` to the payload schema (see `validate_songform` in
  `src/validation.lua` — check current shape and extend if needed, otherwise
  read the field directly in the handler).
- Replace `local playhead_time = adapter.get_cursor_position()` with
  `local playhead_time = data.startTime` (error out if missing or non-number).
- Remove the `adapter.time_to_qn(playhead_time)` assumption that the cursor
  was just queried — the time-to-QN call still uses the same `playhead_time`,
  just sourced from the payload.
- Drop the `return { regionId, startTime, rows }` block. The handler is now
  pure side-effect.

Update the matching test in `test_handlers.lua`:

- Inject `startTime = 10.0` into the payload.
- Assert the adapter's `set_marker_at_time` and `add_region` were called with
  the expected times computed from `startTime`, not from
  `get_cursor_position()`.
- Remove assertions on the return value.
- Add a negative test: payload missing `startTime` → `(nil, "…startTime…")`.

### 4. `validation.lua` — add `startTime` validation to `validate_songform`

Read `reascripts/src/validation.lua` first to find `validate_songform`. Add a
check that `data.startTime` is a number (fall back gracefully: if the schema
already allows extra fields, just read it in the handler with a type check).

## Run

```bash
cd /home/user/rehearsaltools
lua reascripts/tests/test_runner.lua
```

All suites must pass. The new `test_payload.lua` is auto-discovered by the
runner (`ls test_*.lua`).

## Acceptance

- `test_payload.lua` passes with ≥4 cases covering empty/valid/malformed/fn-injection.
- `test_handlers.lua` passes with updated assertions for `regions` and `songform`.
- No handler file exports a return value from `new`, `rename`, `seek_to_end`,
  or the `songform` handler.
- `src/handlers/songform.lua` no longer calls `adapter.get_cursor_position()`.

## Commit

```
feat(lua): add payload helper and drop return values from non-query handlers
```
