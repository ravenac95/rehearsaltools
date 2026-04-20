import type { Meta, StoryObj } from "@storybook/react";
import type { Region } from "../api/client";
import { RegionsPresentation } from "./RegionsPresentation";

const noop = () => {};

const regions: Region[] = [
  { id: 1, name: "Intro", start: 0, stop: 10.5 },
  { id: 2, name: "Verse 1", start: 10.5, stop: 42.0 },
  { id: 3, name: "", start: 42.0, stop: 60.0 },  // unnamed region
];

const baseArgs = {
  newName: "",
  renamingId: null,
  renameValue: "",
  onNewNameChange: noop,
  onCreateRegion: noop,
  onPlayRegion: noop,
  onStartRename: noop,
  onRenameValueChange: noop,
  onSaveRename: noop,
  onCancelRename: noop,
};

const meta = {
  title: "Screens/RegionsPresentation",
  component: RegionsPresentation,
  parameters: { layout: "fullscreen" },
  args: { ...baseArgs, regions: [] },
} satisfies Meta<typeof RegionsPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const MultipleRegions: Story = {
  args: { regions },
};

export const WithNewNameTyped: Story = {
  args: { regions, newName: "Bridge" },
};

// Mid-rename state: renamingId is set for the second region
export const MidRename: Story = {
  args: {
    regions,
    renamingId: 2,
    renameValue: "Verse 1 (edited)",
  },
};

export const SingleRegion: Story = {
  args: { regions: [regions[0]] },
};

export const UnnamedRegion: Story = {
  args: { regions: [regions[2]] },
};
