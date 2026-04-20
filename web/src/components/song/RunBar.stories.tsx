import type { Meta, StoryObj } from "@storybook/react";
import { RunBar } from "./RunBar";

const meta = {
  title: "Song/RunBar",
  component: RunBar,
  args: { onRun: () => {} },
} satisfies Meta<typeof RunBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const DisabledAndLoading: Story = { args: { disabled: true, loading: true } };
