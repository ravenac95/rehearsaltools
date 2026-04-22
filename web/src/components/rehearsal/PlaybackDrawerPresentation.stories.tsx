import type { Meta, StoryObj } from "@storybook/react";
import type { RehearsalSegment } from "../../api/client";
import { PlaybackDrawerPresentation } from "./PlaybackDrawerPresentation";

const noop = () => {};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const take1: RehearsalSegment = { id: "s1", type: "take",       num: 1, songId: "song-1", songName: "My Song",    startPosition: 0 };
const disc1: RehearsalSegment = { id: "s2", type: "discussion", num: 1, songId: "song-1", songName: "My Song",    startPosition: 30 };
const take2: RehearsalSegment = { id: "s3", type: "take",       num: 2, songId: "song-2", songName: "Other Song", startPosition: 60 };

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/PlaybackDrawer",
  component: PlaybackDrawerPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    open: false,
    takes: [],
    currentTakeIdx: null,
    status: "idle",
    currentSongName: "My Song",
    onToggleOpen: noop,
    onEndRehearsal: noop,
    onStopPlayback: noop,
    onSelectTake: noop,
  },
} satisfies Meta<typeof PlaybackDrawerPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const ClosedEmpty: Story = {};

export const ClosedWithTakes: Story = {
  args: {
    open: false,
    takes: [take1, disc1],
  },
};

export const OpenNoPlayback: Story = {
  args: {
    open: true,
    takes: [take1, disc1, take2],
  },
};

export const Playing: Story = {
  args: {
    open: true,
    takes: [take1, disc1, take2],
    status: "playback",
    currentTakeIdx: 1,
  },
};

export const CrossSongTake: Story = {
  args: {
    open: true,
    takes: [take2],
    currentTakeIdx: null,
  },
};
