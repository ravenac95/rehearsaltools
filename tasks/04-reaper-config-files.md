# Task 04: REAPER config files — TIME feedback, action ini snippets

## Dependencies
None.

## Goal

Update `RehearsalTools.ReaperOSC` so REAPER emits cursor-position feedback,
and ship ini snippets that register each new action script with REAPER's
custom-action registry and map `/rt/*` OSC addresses to them.

## Files

### Modify

- `reascripts/reaper-osc-config/RehearsalTools.ReaperOSC`

### Create

- `reascripts/reaper-osc-config/reaper-osc-actions.ini.snippet`
- `reascripts/reaper-osc-config/reaper-kb.ini.snippet`
- `reascripts/reaper-osc-config/README.md`

## Content

### `RehearsalTools.ReaperOSC`

The file already has a `TIME n/time` line (used for seek/inbound). Verify it
also works as feedback and add a comment block clarifying the bidirectional
semantics. If REAPER needs a separate feedback pattern, add it alongside.

Remove the header comment paragraph that mentions the custom `/rt/*`
dispatcher on "a separate UDP socket" — that's no longer true; `/rt/*`
addresses are served by REAPER's OSC server itself now, not routed through a
separate port.

### `reaper-osc-actions.ini.snippet`

This is the mapping from OSC address to custom-action command ID, appended to
the user's `reaper-osc-actions.ini` inside their REAPER resource folder.
Format (see radugin.com/2017/05/osc-driven-reaper-scripts):

```
/rt/project/new=_RS_rt_project_new
/rt/region/new=_RS_rt_region_new
/rt/region/rename=_RS_rt_region_rename
/rt/region/play=_RS_rt_region_play
/rt/playhead/end=_RS_rt_playhead_end
/rt/tempo=_RS_rt_tempo
/rt/timesig=_RS_rt_timesig
/rt/mixdown/all=_RS_rt_mixdown_all
/rt/songform/write=_RS_rt_songform_write
```

The `_RS_<slug>` IDs must match the IDs generated when the user imports each
`actions/rt_*.lua` file via REAPER's Action List → Load → ReaScript. Document
in the README how to set these IDs manually (REAPER assigns them
deterministically from the filename if the script is saved with the
"Register as action" flag).

### `reaper-kb.ini.snippet`

Append-to-REAPER-keyboard-mappings snippet that registers each ReaScript as
a custom action so the IDs above resolve. Format:

```
SCR 4 0 RS_rt_project_new "Custom: rt_project_new" reascripts/actions/rt_project_new.lua
SCR 4 0 RS_rt_region_new "Custom: rt_region_new" reascripts/actions/rt_region_new.lua
...
```

(One line per action script; the leading `SCR 4 0` is REAPER's marker for a
registered ReaScript. The path is relative to the REAPER resource folder —
document in the README that users either symlink `reascripts/actions/` into
their resource folder or copy the files.)

### `reaper-osc-config/README.md`

Short setup guide:

1. In REAPER → Preferences → Control/OSC/web → enable the web interface;
   note the port (default 8080, the server's `REAPER_WEB_PORT`).
2. Add an OSC control surface pointing at `127.0.0.1:8000` in /
   `0.0.0.0:8001` out; use `RehearsalTools.ReaperOSC` as the pattern file.
3. Copy `reascripts/actions/` into your REAPER resource folder (or symlink).
4. Append the contents of `reaper-osc-actions.ini.snippet` to
   `<resource>/reaper-osc-actions.ini`.
5. Append `reaper-kb.ini.snippet` to `<resource>/reaper-kb.ini`.
6. Restart REAPER.

## Acceptance

- All three snippet files exist with the 9 `/rt/*` mappings (metronome/toggle
  is intentionally absent).
- `RehearsalTools.ReaperOSC` no longer references the `reaper_osc_dispatcher`
  or "separate UDP socket".
- README.md in `reaper-osc-config/` walks a user through the minimum steps to
  go from a clean REAPER install to a working setup.

## Commit

```
feat(reascripts): ship OSC + KB ini snippets and web remote setup docs
```
