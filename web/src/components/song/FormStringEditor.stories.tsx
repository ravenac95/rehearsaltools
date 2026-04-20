import type { Meta, StoryObj } from "@storybook/react";
import { FormStringEditor } from "./FormStringEditor";

const DEFINED = ["A", "B", "C"];

const meta = {
  title: "Song/FormStringEditor",
  component: FormStringEditor,
} satisfies Meta<typeof FormStringEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
};

export const TypicalPattern: Story = {
  args: { pattern: ["A", "A", "B", "A", "C"], onChange: () => {}, definedLetters: DEFINED },
};

export const ValidPattern: Story = {
  args: { pattern: ["A", "B", "A"], onChange: () => {}, definedLetters: DEFINED },
};

export const PatternWithUnresolved: Story = {
  args: { pattern: ["A", "D", "B"], onChange: () => {}, definedLetters: DEFINED },
  // "D" is not in definedLetters → renders with dashed border
};

export const NoDefinedLetters: Story = {
  args: { pattern: ["A", "B"], onChange: () => {} },
  // definedLetters undefined → no unresolved highlighting
};

export const LongPattern: Story = {
  args: {
    pattern: ["A", "A", "B", "A", "C", "A", "B", "A"],
    onChange: () => {},
    definedLetters: DEFINED,
  },
};
