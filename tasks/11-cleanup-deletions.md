# Task 11: Cleanup — delete the old dispatcher and correlated reply code

## Dependencies
- 06-lua-action-scripts.md
- 07-routes-regions.md
- 08-routes-songform.md
- 09-routes-project-mixdown.md
- 10-index-wiring.md

## Goal

Remove every file whose responsibility is now covered by the new Lua actions
or the `WebRemoteClient`. Verify nothing references the deleted symbols.

## Files to delete

- `reascripts/reaper_osc_dispatcher.lua`
- `reascripts/src/osc.lua`
- `reascripts/src/dispatcher.lua`
- `reascripts/tests/test_osc.lua`
- `reascripts/tests/test_dispatcher.lua`
- `server/src/osc/commands.ts`

## Steps

1. Run `rg -n "mavriq-lua-sockets|reaper_osc_dispatcher|DispatcherClient|src/osc\.lua|src/dispatcher\.lua" --glob '!tasks/**' --glob '!node_modules/**'` — the result should list only these six files + their README references (which are handled in task 12).
2. Delete the six files listed above.
3. Re-run the grep — expected result is empty (except for README references
   left for task 12).
4. Run both test suites:
   - `lua reascripts/tests/test_runner.lua` — test_runner auto-discovers
     `test_*.lua`, so deleting `test_osc.lua` and `test_dispatcher.lua`
     removes them from the run automatically.
   - `pnpm -F server test` — passes.

## If lingering references appear

- An import of `DispatcherClient` in `server/src/index.ts` means task 10 was
  incomplete — re-run task 10 first.
- An import of `dispatcher` or `osc` in a `reascripts/src/handlers/*.lua`
  file means a handler was only partially updated; fix the specific file.

## Acceptance

- Six files gone.
- No grep hits for the strings above outside `tasks/` and `node_modules/`.
- Both test suites green.

## Commit

```
chore: delete custom OSC dispatcher — superseded by REAPER-native OSC + web remote
```
