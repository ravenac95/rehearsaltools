import type { Meta, StoryObj } from "@storybook/react";
import type { RehearsalType } from "../../api/client";
import { RehearsalTypeSheetPresentation } from "./RehearsalTypeSheetPresentation";

const noop = () => {};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const fullBand: RehearsalType = { id: "full-band",   name: "Full Band", desc: "Everyone plays", emoji: "🎸" };
const vocals:   RehearsalType = { id: "vocals-only", name: "Vocals",    desc: "Vocals only",    emoji: "🎤" };
const rhythm:   RehearsalType = { id: "rhythm",      name: "Rhythm",    desc: "Drums + bass",   emoji: "🥁" };

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/RehearsalTypeSheet",
  component: RehearsalTypeSheetPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    types: [fullBand, vocals, rhythm],
    selectedTypeId: "full-band",
    onClose: noop,
    onSelect: noop,
  },
} satisfies Meta<typeof RehearsalTypeSheetPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};

export const NoSelection: Story = {
  args: { selectedTypeId: null },
};

export const Loading: Story = {
  args: { types: [] },
};

export const SingleType: Story = {
  args: { types: [fullBand] },
};
