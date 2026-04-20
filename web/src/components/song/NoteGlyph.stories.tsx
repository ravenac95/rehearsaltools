import type { Meta, StoryObj } from "@storybook/react";
import { NoteGlyph } from "./NoteGlyph";

const meta = {
  title: "Song/NoteGlyph",
  component: NoteGlyph,
  args: { note: "q" },
} satisfies Meta<typeof NoteGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Whole: Story = { args: { note: "w" } };
export const Half: Story = { args: { note: "h" } };
export const Quarter: Story = { args: { note: "q" } };
export const Eighth: Story = { args: { note: "e" } };
export const Sixteenth: Story = { args: { note: "s" } };
export const Inherited: Story = { args: { note: "q", inherited: true } };
export const NotInherited: Story = { args: { note: "q", inherited: false } };
export const Small: Story = { args: { note: "q", size: 14 } };
export const Large: Story = { args: { note: "q", size: 32 } };
