# Task 07: SongPickerSheet — Presentation/container split + stories

## Objective

Split `web/src/components/rehearsal/SongPickerSheet.tsx` into `SongPickerSheetPresentation` (pure) + `SongPickerSheet` (thin container). Container owns the `api.listSongs()` fetch and the `useEffect`. Add stories for all load states.

## Dependencies

None.

## Files

- **New:** `web/src/components/rehearsal/SongPickerSheetPresentation.tsx`
- **New:** `web/src/components/rehearsal/SongPickerSheetPresentation.stories.tsx`
- **Modify:** `web/src/components/rehearsal/SongPickerSheet.tsx` — thin container

## Implementation

### `SongPickerSheetPresentation.tsx`

Props:
```ts
export interface SongPickerSheetPresentationProps {
  open: boolean;
  songs: SongListItem[];
  loading: boolean;
  fetchError: string | null;
  onClose: () => void;
  onSelectSong: (id: string) => void;
  onNewSong: () => void;
}
```

Render the same markup. No `useState`, no `useEffect`, no `api.*` calls. Return `null` when `!open`.

### `SongPickerSheet.tsx` (container)

Keeps the `useState` for `songs`/`loading`/`fetchError` and the fetching `useEffect` (behavior identical to today). Composes `onSelectSong` from `api.selectSong(id)` + `refreshSong()` + `setSongPickerOpen(false)`, and `onNewSong` from the `updateSongName(...)` + close today.

```tsx
export function SongPickerSheet() {
  const open = useStore((s) => s.songPickerOpen);
  const setSongPickerOpen = useStore((s) => s.setSongPickerOpen);
  const refreshSong = useStore((s) => s.refreshSong);
  const updateSongName = useStore((s) => s.updateSongName);

  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError(null);
    api.listSongs()
      .then((res) => setSongs(res.songs))
      .catch((err) => setFetchError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <SongPickerSheetPresentation
      open={open}
      songs={songs}
      loading={loading}
      fetchError={fetchError}
      onClose={() => setSongPickerOpen(false)}
      onSelectSong={async (id) => {
        try {
          await api.selectSong(id);
          await refreshSong();
        } catch {
          // swallow — matches current behavior
        } finally {
          setSongPickerOpen(false);
        }
      }}
      onNewSong={() => {
        const name = `Untitled ${new Date().toISOString().slice(0, 10)}`;
        updateSongName(name);
        setSongPickerOpen(false);
      }}
    />
  );
}
```

### Stories

- `title: "Rehearsal/SongPickerSheet"`
- `parameters: { layout: "fullscreen" }`
- Fixtures:
  ```ts
  const song1: SongListItem = { id: "s1", name: "Wonderwall",  bpm: 87,  timeSig: "4/4" };
  const song2: SongListItem = { id: "s2", name: "Take Five",   bpm: 176, timeSig: "5/4" };
  const song3: SongListItem = { id: "s3", name: "Blue in Green",bpm: 60,  timeSig: "4/4" };
  ```
  (Use `SongListItem` shape as declared in `web/src/api/client.ts`.)
- baseArgs: open=true, songs=[song1, song2, song3], loading=false, fetchError=null, callbacks=noop
- Stories:
  - `Open` (default)
  - `Closed` — open=false
  - `Loading` — loading=true, songs=[]
  - `Empty` — songs=[], loading=false
  - `FetchError` — fetchError=`"Failed to load songs"`, songs=[]
  - `SingleSong` — songs=[song1]

## Acceptance criteria

- `pnpm --filter web typecheck` passes
- `pnpm --filter web test -- tests/BottomSheets.test.tsx` still passes unchanged
- All 6 stories render
