import type { Meta, StoryObj } from "@storybook/react";
import type { SongListItem } from "../../api/client";
import { SongPickerSheetPresentation } from "./SongPickerSheetPresentation";

const noop = () => {};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const song1: SongListItem = { id: "s1", name: "Wonderwall",   bpm: 87,  timeSig: "4/4" };
const song2: SongListItem = { id: "s2", name: "Take Five",    bpm: 176, timeSig: "5/4" };
const song3: SongListItem = { id: "s3", name: "Blue in Green", bpm: 60,  timeSig: "4/4" };

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/SongPickerSheet",
  component: SongPickerSheetPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    songs: [song1, song2, song3],
    loading: false,
    fetchError: null,
    onClose: noop,
    onSelectSong: noop,
    onNewSong: noop,
  },
} satisfies Meta<typeof SongPickerSheetPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};

export const Loading: Story = {
  args: { loading: true, songs: [] },
};

export const Empty: Story = {
  args: { songs: [], loading: false },
};

export const FetchError: Story = {
  args: { fetchError: "Failed to load songs", songs: [] },
};

export const SingleSong: Story = {
  args: { songs: [song1] },
};
