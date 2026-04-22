import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadgePresentation } from "./StatusBadgePresentation";

const noop = () => {};

const meta = {
  title: "Rehearsal/StatusBadge",
  component: StatusBadgePresentation,
  parameters: { layout: "padded" },
  args: {
    status: "idle",
    position: 0,
    segmentStart: null,
    onSetCategory: noop,
  },
} satisfies Meta<typeof StatusBadgePresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Discussion: Story = {
  args: {
    status: "discussion",
    position: 10,
    segmentStart: 0,
  },
};

export const Take: Story = {
  args: {
    status: "take",
    position: 65,
    segmentStart: 60,
  },
};

export const Playback: Story = {
  args: {
    status: "playback",
    position: 0,
    segmentStart: 0,
  },
};

export const LongElapsed: Story = {
  args: {
    status: "take",
    position: 3725,
    segmentStart: 5,
  },
};
