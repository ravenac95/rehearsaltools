import type { Meta, StoryObj } from "@storybook/react";
import { ThemeTogglePresentation } from "./ThemeToggle";

const meta = {
  title: "UI/ThemeTogglePresentation",
  component: ThemeTogglePresentation,
  args: { onCycle: () => {} },
} satisfies Meta<typeof ThemeTogglePresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const System: Story = { args: { pref: "system" } };
export const Light: Story = { args: { pref: "light" } };
export const Dark: Story = { args: { pref: "dark" } };
