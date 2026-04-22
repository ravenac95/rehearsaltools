import type { Meta, StoryObj } from "@storybook/react";
import { SimpleSongViewPresentation } from "./SimpleSongViewPresentation";

const noop = () => {};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/SimpleSongView",
  component: SimpleSongViewPresentation,
  parameters: { layout: "padded" },
  args: {
    bpm: 120,
    note: "q",
    num: 4,
    denom: 4,
    onBpmChange: noop,
    onNoteChange: noop,
    onTimeSigChange: noop,
  },
} satisfies Meta<typeof SimpleSongViewPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Default: Story = {};

export const SixEight: Story = {
  args: { num: 6, denom: 8 },
};

export const SevenEight: Story = {
  args: { num: 7, denom: 8 },
};

export const CustomTimeSig: Story = {
  args: { num: 5, denom: 4 },
};

// "qd" is not a valid NoteValue — use "e" (eighth note) as an alternate supported value
export const EighthNote: Story = {
  args: { note: "e" },
};

export const SlowTempo: Story = {
  args: { bpm: 60 },
};

export const FastTempo: Story = {
  args: { bpm: 180 },
};
