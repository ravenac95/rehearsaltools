import type { Meta, StoryObj } from "@storybook/react";
import { TransportFooterPresentation } from "./TransportFooterPresentation";

const noop = () => {};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/TransportFooter",
  component: TransportFooterPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    status: "idle",
    hasTakes: false,
    metronomeActive: false,
    onStart: noop,
    onSetCategory: noop,
    onStop: noop,
    onToggleMetronome: noop,
  },
} satisfies Meta<typeof TransportFooterPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Idle: Story = {};

export const Discussion: Story = {
  args: { status: "discussion" },
};

export const Take: Story = {
  args: { status: "take", hasTakes: true },
};

export const Playback: Story = {
  args: { status: "playback" },
};

export const MetronomeOn: Story = {
  args: { metronomeActive: true },
};
