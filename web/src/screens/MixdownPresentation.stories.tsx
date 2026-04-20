import type { Meta, StoryObj } from "@storybook/react";
import { MixdownPresentation } from "./MixdownPresentation";

const noop = () => {};

const meta = {
  title: "Screens/MixdownPresentation",
  component: MixdownPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    outputDir: "",
    running: false,
    regionCount: 0,
    onOutputDirChange: noop,
    onRender: noop,
  },
} satisfies Meta<typeof MixdownPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IdleNoRegions: Story = {};

export const IdleOneRegion: Story = {
  args: { regionCount: 1 },
};

export const IdleThreeRegions: Story = {
  args: { regionCount: 3 },
};

export const Running: Story = {
  args: { regionCount: 3, running: true },
};

export const WithOutputDir: Story = {
  args: { outputDir: "/Users/me/Music/renders", regionCount: 2 },
};
