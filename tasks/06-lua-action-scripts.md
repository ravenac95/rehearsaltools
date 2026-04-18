# Task 06: Lua action scripts — one per /rt/* address

## Dependencies
- 01-lua-foundation.md  (needs `payload.lua` and updated handlers)

## Goal

Create 9 ReaScripts in `reascripts/actions/`, each registered as a REAPER
custom action. Each script:

1. Resolves its own directory so it can `dofile` shared helpers from
   `../src/`.
2. Loads `payload.lua` and reads the single JSON-string OSC arg.
3. Constructs the matching handler from `src/handlers/*.lua` and calls it.
4. Discards the return value (handlers are side-effectful under the new
   contract).

On payload-parse failure or validation failure the script logs with
`reaper.ShowConsoleMsg` and returns silently. No OSC reply.

## Files

### Create

- `reascripts/actions/rt_project_new.lua`
- `reascripts/actions/rt_region_new.lua`
- `reascripts/actions/rt_region_rename.lua`
- `reascripts/actions/rt_region_play.lua`
- `reascripts/actions/rt_playhead_end.lua`
- `reascripts/actions/rt_tempo.lua`
- `reascripts/actions/rt_timesig.lua`
- `reascripts/actions/rt_mixdown_all.lua`
- `reascripts/actions/rt_songform_write.lua`

## Script template

All nine scripts follow the same shape — parameterise by handler module,
handler function, and (for `regions`) the sub-method name.

```lua
-- actions/rt_<slug>.lua
-- Registered as a REAPER custom action, invoked via /rt/<slug> OSC.

local info = debug.getinfo(1, "S").source:sub(2)
local script_dir = info:match("(.*[/\\])")
local repo_root  = script_dir .. "../"  -- scripts live in reascripts/actions/

package.path = repo_root .. "?.lua;" .. repo_root .. "?/init.lua;" .. package.path

local payload_mod = dofile(repo_root .. "src/payload.lua")
local handler_mod = dofile(repo_root .. "src/handlers/<MODULE>.lua")
local adapter     = dofile(repo_root .. "src/reaper_api.lua")

local data, err = payload_mod.read()
if err then
  reaper.ShowConsoleMsg("[rt_<slug>] payload error: " .. err .. "\n")
  return
end

local handler = handler_mod.new(adapter)
local _, h_err = handler<.METHOD_OR_DIRECT>(data)
if h_err then
  reaper.ShowConsoleMsg("[rt_<slug>] handler error: " .. h_err .. "\n")
end
```

Per-script specifics:

| Script                       | Module    | Call                              |
|------------------------------|-----------|-----------------------------------|
| rt_project_new.lua           | project   | `handler(data)` (if it's a function) or the matching sub-method |
| rt_region_new.lua            | regions   | `handler.new(data)`               |
| rt_region_rename.lua         | regions   | `handler.rename(data)`            |
| rt_region_play.lua           | regions   | `handler.play(data)`              |
| rt_playhead_end.lua          | regions   | `handler.seek_to_end(data)`       |
| rt_tempo.lua                 | tempo     | `handler(data)`                   |
| rt_timesig.lua               | timesig   | `handler(data)`                   |
| rt_mixdown_all.lua           | mixdown   | `handler(data)`                   |
| rt_songform_write.lua        | songform  | `handler(data)`                   |

Before writing each script, confirm the module's export shape by reading
`src/handlers/<module>.lua`: some return a factory function that yields a
single callable, others return a table of sub-methods (see
`regions.lua`). Use the right call accordingly.

## Tests

These scripts are thin glue. Unit-test the pieces they depend on (done in
task 01) rather than trying to run `reaper.get_action_context()` under Lua
CLI. A smoke test is fine:

- Add a function-level test in `test_handlers.lua` or a new
  `test_action_scripts.lua` that mocks `reaper.get_action_context` and
  `dofile`s one of the scripts to confirm it doesn't crash when invoked
  with a valid payload. If that's impractical (scripts invoke `reaper.*`
  at top level), skip the smoke test — the handler tests from task 01
  already cover behaviour.

## Acceptance

- All 9 action files exist and are syntactically valid Lua
  (`lua -e 'loadfile("reascripts/actions/rt_project_new.lua")'` — or parse
  via `luac -p` if available).
- `lua reascripts/tests/test_runner.lua` still passes.
- No script sends OSC back or reads from any reply queue.

## Commit

```
feat(reascripts): add per-address action scripts for /rt/* endpoints
```
