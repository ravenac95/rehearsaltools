import type { Meta, StoryObj } from "@storybook/react";
import { LetterBadge } from "./LetterBadge";

const meta = {
  title: "Song/LetterBadge",
  component: LetterBadge,
  args: { letter: "A" },
} satisfies Meta<typeof LetterBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LetterA: Story = { args: { letter: "A" } };
export const LetterB: Story = { args: { letter: "B" } };
export const LetterZ: Story = { args: { letter: "Z" } };
export const Small: Story = { args: { letter: "A", size: 24 } };
export const DefaultSize: Story = { args: { letter: "A", size: 36 } };
export const Large: Story = { args: { letter: "A", size: 56 } };
