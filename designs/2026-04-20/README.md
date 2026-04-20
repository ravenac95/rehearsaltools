# Handoff: Rehearsal-Centric App Redesign

## Overview

Redesign of the RehearsalTools single-page app to center the entire UX around the rehearsal workflow rather than exposing raw Reaper controls. The app now follows a linear rehearsal flow: start rehearsal → work a song → do takes → next song or end. Reaper-specific features (Regions, Mixdown, raw Transport, Debug) are hidden behind an Advanced section in a hamburger menu.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs in the existing React/Vite codebase** using its established patterns (Zustand store, Presentation/Container split, existing `api/client.ts`, existing CSS variables and component library).

## Fidelity

**High-fidelity (hifi)** — The prototype uses the actual CSS variable system, the real component structures (FormStringEditor, SectionRow, StanzaCompact/Expanded, TempoEditor, etc.), and matches the existing design language. The developer should recreate the UI closely using the codebase's existing libraries and patterns.

## Architecture Changes

### What's new
1. **Single-screen layout** — No more tab navigation between Transport/Song/Regions/Mixdown. The app opens directly to a song editor view.
2. **Header bar** — Contains: Rehearsal Type selector (pill, tappable to change via bottom sheet), Transport Status badge (pill, fills remaining space, tappable to toggle Discussion↔Take), and hamburger menu (☰).
3. **Song mode toggle** — Simple vs Complex modes. Simple = tempo + time signature only (infinite click, no loop). Complex = full song form editor (existing FormTabs, FormStringEditor, SectionRow, etc.).
4. **Transport footer** — Fixed at bottom. Contains main action button (Start Rehearsal → Start Take → End Take) and always-visible metronome toggle.
5. **Playback drawer** — Slides up from below the transport via a small tab showing clip count. Contains take/discussion pills for playback navigation and an "End Rehearsal" button.
6. **Hamburger menu** — Slides in from right. Contains: Main View (return to song view), Theme toggle, and collapsible Advanced section (Regions, Mixdown, Transport, Debug Log).

### What's removed from main view
- Tab bar (Transport/Song/Regions/Mixdown tabs)
- Dashboard screen with raw transport controls
- Regions screen
- Mixdown screen

### What moves to hamburger menu → Advanced
- Regions
- Mixdown
- Raw Reaper transport controls (Play/Stop/Record/Seek)
- Debug logging toggle

## Screens / Views

### Main View (only screen)

#### Header
- **Layout**: Horizontal flex, gap 8px, padding 10px 16px, sticky top, border-bottom
- **Rehearsal Type Pill**: Left-aligned, flexShrink 0. Background `--surface-alt`, border `--rule`, border-radius pill. Shows emoji (🎸 Full Band / 🎹 Piano+Vox) + type name + down chevron. Tappable → opens Rehearsal Type bottom sheet.
- **Status Badge**: flex: 1 (fills remaining space), centered content. Shows dot (colored by status) + label + elapsed time. Border-radius pill. Colors by status:
  - Idle: bg `--surface-alt`, color `--muted`, border `--rule`, dot `--faint`, label "Not started"
  - Discussion: bg `--amber-soft`, color `--amber`, border `--amber`, dot `--amber` (pulsing 2s), label "Discussion"
  - Take: bg `--accent-soft`, color `--accent`, border `--accent`, dot `--accent` (pulsing 1.5s), label "Take N"
  - Playback: bg `--green-soft`, color `--green`, border `--green`, dot `--green`, label "Playback"
- **Tapping the status badge** toggles between Discussion and Take (only when in one of those two states). This is the mechanism for promoting a discussion to a take mid-conversation.
- **Hamburger (☰)**: Right-aligned, font-size 22px

#### Song Name
- Editable text input, font-family `--font-display` (Caveat), font-size 26px, font-weight 700
- Shows underline accent on focus
- "Setlist" button to the right — opens song picker bottom sheet

#### Mode Toggle
- Two pill buttons: "Simple" and "Complex"
- Active pill: border `--accent`, background `--accent-soft`, color `--accent`
- Inactive: border `--rule`, transparent bg, color `--muted`

#### Simple Mode
- Single card with `--surface-alt` background, `--radius-lg` border-radius
- **TempoEditor** component (existing) — note glyph cycle button + "=" + BPM display + range slider
- **Time Signature** — preset buttons (4/4, 6/8, 7/8) as chips + custom TimeSigInput
- This mode = infinite click at given tempo/time-sig, no loop point, no sections

#### Complex Mode
- Full song form editor, identical to existing `SongEditorPresentation`:
  - **FormTabs** — horizontal scrolling chip bar, double-tap to delete, "+" to create
  - **FormStringEditor** — type letters A-Z to build pattern, backspace to remove, paste support, shake animation on invalid input, dashed border on unresolved letters
  - **TempoEditor** — form-level BPM and note value
  - **Stats line** — "N bars total" + unresolved letters warning
  - **Sections library** — list of SectionRow components, each expandable:
    - Collapsed: LetterBadge + stanza strip (StanzaCompact pills) + BPM readout + chevron
    - Expanded: section-level TempoEditor, stanza list (click to expand StanzaExpanded with Stepper for bars, time-sig presets + custom, per-stanza tempo override), "+ stanza" button, "× delete section" button
  - **"+ section N"** button at bottom
  - **RunBar** — sticky bottom, "RUN ▸ play w/ click" button (disabled if pattern empty or has unresolved letters)

#### Transport Footer
- Fixed at bottom (bottom offset increases by 28px when playback drawer tab is visible)
- **Action row**: padding 8px 16px 12px, flex with gap 8
  - Main action button (flex: 1):
    - Idle: "Start Rehearsal" with mic icon, accent bg
    - Discussion: "Start Take" with metronome icon, accent bg
    - Take: "End Take" with stop icon, `--ink` bg
    - Playback: "Stop" with stop icon, `--green` bg
  - **Metronome toggle** (always visible, even when idle): 48×48px square button, border-radius `--radius-md`. Active: `--accent-soft` bg, `--accent` border. Inactive: `--surface-alt` bg, `--rule` border.

#### Playback Drawer
- Fixed at bottom, z-index 150 (behind transport at z-index 100)
- Default state: only a small pull tab visible (28px height) showing grip bar + "N clips" + up chevron
- Tapping tab toggles drawer open/closed (slides up via translateY transition, 0.3s cubic-bezier)
- **Drawer content**:
  - Take/discussion pills — flex-wrap, gap 6. Each pill shows type emoji (💬/🎵) + label (D1, T1, etc). Active pill colored by type (take=accent, discussion=amber). Pills for other songs show song name in small text.
  - "⏏ End Rehearsal" button — right-aligned, ghost style with accent color
  - Playback status bar (only during playback) — green-soft bg, shows "Playing D/T N" + Stop button

### Bottom Sheets (overlays)

#### Song Picker
- Background overlay rgba(0,0,0,0.4), content slides up from bottom
- Border-radius 16px 16px 0 0, max-height 70vh, scrollable
- Grip bar at top (36×4px, centered)
- "Choose a Song" heading
- "+ New Song" button (dashed border)
- Setlist items — each shows song name (15px, weight 600) + "BPM · time-sig" subtitle (12px, mono)

#### Rehearsal Type Picker
- Same overlay pattern as song picker
- "Rehearsal Type" heading
- Type cards — show emoji + name + description. Active type has accent-soft bg + accent border.

### Hamburger Menu
- Overlay rgba(0,0,0,0.4), panel slides from right (width 260px, full height)
- Shadow: -4px 0 20px rgba(0,0,0,0.1)
- Items:
  1. **🎵 Main View** — accent-soft bg, accent border, weight 700 (always returns to song view)
  2. **Theme toggle** — 🌙 Dark mode / ☀️ Light mode
  3. Divider
  4. **ADVANCED** (collapsible, mono font, uppercase) — expands to show: Regions, Mixdown, Transport, Debug Log buttons

## Interactions & Behavior

### Rehearsal Flow State Machine
```
idle → [Start Rehearsal] → discussion
discussion → [Start Take / tap status badge] → take  
take → [End Take / tap status badge] → discussion
discussion/take → [play a clip in drawer] → playback
playback → [Stop] → discussion
any → [End Rehearsal] → idle
```

### Recording Logic (for backend)
- Reaper records continuously from "Start Rehearsal" until "End Rehearsal"
- "Discussion" = recording without metronome
- "Take" = recording with metronome
- "Playback" = Reaper plays back a specific take/discussion region
- Ending a take = metronome off, back to discussion (still recording)

### Rehearsal Types
- Defined in config, signal different Reaper templates to the backend
- Default examples: "Full Band", "Piano + Vox"

### Song Modes
- **Simple**: Single never-ending stanza. No loop point. Just tempo + time signature. Metronome clicks indefinitely at the set tempo.
- **Complex**: Full song form editor with sections, patterns, stanzas, tempo overrides. Uses existing `writeActiveForm` API to write markers to Reaper.

## State Management

### New state needed (in addition to existing store)
- `rehearsalType`: currently selected rehearsal type object
- `transportStatus`: 'idle' | 'discussion' | 'take' | 'playback'
- `songMode`: 'simple' | 'complex'
- `takes`: array of `{ type: 'take'|'discussion', num: number, songName: string, startTime: number }`
- `currentTakeIdx`: number | null (which take/discussion is being played back)
- `metronome`: boolean (always accessible, even when idle)
- `elapsed`: number (seconds, for display in status badge)
- `playbackDrawerOpen`: boolean

### State that moves / changes
- Song name defaults to "Untitled YYYY-MM-DD"
- Simple mode state: bpm, note, num, denom (independent of complex mode's song forms)
- Complex mode uses existing Song/SongForm/Section model unchanged

## Design Tokens

All existing CSS variables are preserved. Key values:

### Colors (light)
- `--surface`: #faf9f7
- `--surface-alt`: #f0eee9
- `--surface-raised`: #fff
- `--ink`: #1a1816
- `--ink-soft`: #3d3a34
- `--muted`: #8a8478
- `--faint`: #c4bfb4
- `--rule`: #e2ddd3
- `--accent`: #c73a1d
- `--accent-soft`: rgba(199,58,29,0.08)
- `--green`: #2d8a4e / `--green-soft`: rgba(45,138,78,0.10)
- `--amber`: #b8860b / `--amber-soft`: rgba(184,134,11,0.10)

### Typography
- `--font-body`: 'DM Sans' (replaces Kalam for cleaner look)
- `--font-mono`: 'DM Mono'
- `--font-display`: 'Caveat' (for song names, large numbers)
- `--font-music`: 'Noto Music' (for note glyphs)

### Spacing / Radius
- `--radius-sm`: 8px, `--radius-md`: 12px, `--radius-lg`: 16px, `--radius-pill`: 999px
- `--shadow-sm`: 0 1px 3px rgba(0,0,0,0.06)
- `--shadow-md`: 0 2px 8px rgba(0,0,0,0.08)

## Existing Components Reused As-Is
These components from the current codebase are used directly in the Complex song mode:
- `FormTabs`
- `FormStringEditor` (with `parsePattern`)
- `TempoEditor` (also used in Simple mode)
- `SectionRow`
- `StanzaCompact` / `StanzaExpanded`
- `TimeSigStack` / `TimeSigInput`
- `NoteGlyph`
- `LetterBadge` (with `getLetterColor`)
- `Stepper`
- `RunBar`
- `UndoToast`
- `ThemeToggle` (moved into hamburger menu)

## New Components Needed
- `RehearsalHeader` — header with rehearsal type picker, status badge, hamburger
- `StatusBadge` — the tappable status indicator
- `TransportFooter` — action button + metronome toggle
- `PlaybackDrawer` — slide-up drawer with take/discussion pills
- `SimpleSongView` — tempo + time sig editor for simple mode
- `SongPicker` — bottom sheet for setlist selection
- `RehearsalTypePicker` — bottom sheet for type selection
- `HamburgerMenu` — slide-in menu with nav items + advanced section

## Files

- `Rehearsal Flow.html` — main HTML shell with CSS variables and theme definitions
- `components.jsx` — all UI components (faithful reproductions of existing + new)
- `app.jsx` — app state machine, screen logic, and wiring
