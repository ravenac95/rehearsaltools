# Task 12: README — drop mavriq prerequisite, document web remote + snippet setup

## Dependencies
- 04-reaper-config-files.md
- 11-cleanup-deletions.md

## Goal

Update the top-level `README.md` so the setup steps match the new
architecture:

- Remove the `mavriq-lua-sockets` / ReaPack prerequisite entirely — no custom
  UDP socket is used anymore.
- Remove the note about the "custom OSC dispatcher port" — `/rt/*` now goes
  to REAPER's native OSC port.
- Add a "Web remote" setup section: enable REAPER's web interface, note the
  `REAPER_WEB_HOST` / `REAPER_WEB_PORT` env vars, flag the default-port
  collision with the Node HTTP server and suggest `REAPER_WEB_PORT=8081` as
  a safe alternative (or change `HTTP_PORT`).
- Add a "Custom actions setup" section pointing the user at
  `reascripts/reaper-osc-config/README.md` for the snippet-merge instructions
  (or inline them if the top-level README is where users expect to find
  setup info).

## Files

### Modify

- `README.md`

## Steps

1. Read the current `README.md`.
2. Grep for "mavriq", "reaper_osc_dispatcher", "dispatcher port" — delete
   those blocks.
3. Insert a new section (roughly):

```markdown
## REAPER setup

1. Preferences → Control/OSC/web → Web browser interface: enable; note the
   port (default 8080). The Node server reads this via `REAPER_WEB_PORT`.
   **Port collision note:** the Node server defaults to HTTP port 8080 too —
   set `REAPER_WEB_PORT=8081` in the REAPER web config, or set
   `HTTP_PORT=8787` for the Node server.
2. Add an OSC control surface: host=`127.0.0.1`, receive port matches
   `REAPER_OSC_PORT` (default 8000), send port matches
   `REAPER_FEEDBACK_PORT` (default 8001). Pattern file:
   `reascripts/reaper-osc-config/RehearsalTools.ReaperOSC`.
3. Install custom actions — see
   `reascripts/reaper-osc-config/README.md`.
```

4. Drop the ReaPack / mavriq-lua-sockets install section.

## Acceptance

- `grep -i "mavriq\|reaper_osc_dispatcher\|dispatcher port" README.md` is
  empty.
- Setup walks a new user from scratch to a running app using only REAPER's
  built-in features plus the ini snippets.

## Commit

```
docs: rewrite README setup for REAPER-native OSC + web remote
```
