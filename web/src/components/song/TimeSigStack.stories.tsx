import type { Meta, StoryObj } from "@storybook/react";
import { TimeSigStack } from "./TimeSigStack";

const meta = {
  title: "Song/TimeSigStack",
  component: TimeSigStack,
  args: { num: 4, denom: 4 },
} satisfies Meta<typeof TimeSigStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourFour: Story = { args: { num: 4, denom: 4 } };
export const ThreeFour: Story = { args: { num: 3, denom: 4 } };
export const SixEight: Story = { args: { num: 6, denom: 8 } };
export const FiveFour: Story = { args: { num: 5, denom: 4 } };
export const SevenEight: Story = { args: { num: 7, denom: 8 } };
export const SmallSize: Story = { args: { num: 4, denom: 4, size: "sm" } };
export const MediumSize: Story = { args: { num: 4, denom: 4, size: "md" } };
