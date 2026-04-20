import type { Meta, StoryObj } from "@storybook/react";
import type { Stanza } from "../../api/client";
import { StanzaCompact } from "./StanzaCompact";

const base: Stanza = { bars: 8, num: 4, denom: 4 };

const meta = {
  title: "Song/StanzaCompact",
  component: StanzaCompact,
  args: { stanza: base, effectiveBpm: 120, effectiveNote: "q", bpmInherited: true },
} satisfies Meta<typeof StanzaCompact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InheritedBpm: Story = { args: { bpmInherited: true } };
export const OverriddenBpm: Story = { args: { bpmInherited: false, stanza: { ...base, bpm: 140 }, effectiveBpm: 140 } };
export const ThreeFour: Story = { args: { stanza: { ...base, num: 3, denom: 4 } } };
export const SixEight: Story = { args: { stanza: { ...base, num: 6, denom: 8 } } };
export const SingleBar: Story = { args: { stanza: { ...base, bars: 1 } } };
export const ManyBars: Story = { args: { stanza: { ...base, bars: 32 } } };
