import type { Meta, StoryObj } from "@storybook/react";
import type { RehearsalType } from "../../api/client";
import { RehearsalHeaderPresentation } from "./RehearsalHeaderPresentation";
import { StatusBadgePresentation } from "./StatusBadgePresentation";

const noop = () => {};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fullBand: RehearsalType = {
  id: "full-band",
  name: "Full Band",
  desc: "Everyone plays together",
  emoji: "🎸",
};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/RehearsalHeader",
  component: RehearsalHeaderPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    rehearsalType: fullBand,
    statusBadge: (
      <StatusBadgePresentation
        status="idle"
        position={0}
        segmentStart={null}
        onSetCategory={noop}
      />
    ),
    onOpenTypePicker: noop,
    onOpenMenu: noop,
  },
} satisfies Meta<typeof RehearsalHeaderPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Idle: Story = {};

export const NoTypeSelected: Story = {
  args: {
    rehearsalType: null,
  },
};

export const DuringTake: Story = {
  args: {
    statusBadge: (
      <StatusBadgePresentation
        status="take"
        position={45}
        segmentStart={0}
        onSetCategory={noop}
      />
    ),
  },
};

export const Playback: Story = {
  args: {
    statusBadge: (
      <StatusBadgePresentation
        status="playback"
        position={0}
        segmentStart={0}
        onSetCategory={noop}
      />
    ),
  },
};
