import type { Meta, StoryObj } from "@storybook/react";
import type { Stanza } from "../../api/client";
import { StanzaExpanded } from "./StanzaExpanded";

const base: Stanza = { bars: 8, num: 4, denom: 4 };

const meta = {
  title: "Song/StanzaExpanded",
  component: StanzaExpanded,
  args: {
    stanza: base,
    effectiveBpm: 120,
    effectiveNote: "q",
    onChange: () => {},
    onDelete: () => {},
    onDuplicate: () => {},
  },
} satisfies Meta<typeof StanzaExpanded>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithSectionBpmOverride: Story = {
  args: { effectiveBpm: 140, stanza: { ...base, bpm: 140 } },
};
export const NoteOverride: Story = {
  args: { stanza: { ...base, note: "h" }, effectiveNote: "h" },
};
export const SingleBar: Story = {
  args: { stanza: { ...base, bars: 1 } },
};
export const ThreeFour: Story = {
  args: { stanza: { ...base, num: 3, denom: 4 } },
};
