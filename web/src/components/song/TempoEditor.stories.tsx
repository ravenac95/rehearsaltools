import type { Meta, StoryObj } from "@storybook/react";
import { TempoEditor } from "./TempoEditor";

const meta = {
  title: "Song/TempoEditor",
  component: TempoEditor,
  args: {
    bpm: 120, note: "q",
    bpmOverridden: false, noteOverridden: false,
    onBpmChange: () => {}, onNoteChange: () => {},
  },
} satisfies Meta<typeof TempoEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inherited: Story = {};
export const BpmOverridden: Story = {
  args: { bpmOverridden: true, onBpmClear: () => {} },
};
export const NoteOverridden: Story = {
  args: { noteOverridden: true, note: "h", onNoteClear: () => {} },
};
export const BothOverridden: Story = {
  args: { bpmOverridden: true, noteOverridden: true, onBpmClear: () => {}, onNoteClear: () => {} },
};
export const SlowTempo: Story = { args: { bpm: 40, bpmOverridden: true, onBpmClear: () => {} } };
export const FastTempo: Story = { args: { bpm: 240, bpmOverridden: true, onBpmClear: () => {} } };
