import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./Chip";

const meta = {
  title: "UI/Chip",
  component: Chip,
  args: { children: "Label" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashed: Story = { args: { variant: "dashed" } };
export const Solid: Story = { args: { variant: "solid" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const DashedDisabled: Story = { args: { variant: "dashed", disabled: true } };
export const SolidDisabled: Story = { args: { variant: "solid", disabled: true } };
export const GhostDisabled: Story = { args: { variant: "ghost", disabled: true } };
export const WithTitle: Story = { args: { title: "Tooltip text", children: "Hover me" } };
