import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect } from "@storybook/test";
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

// Typing an invalid string — error state
export const TypeInvalidPattern: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "A ab");   // "ab" is invalid — lowercase multi-char
    await expect(canvas.getByText(/not a valid section token/i)).toBeInTheDocument();
  },
};

// Typing a valid string — success state (no error message)
export const TypeValidPattern: Story = {
  args: { pattern: [], onChange: () => {}, definedLetters: DEFINED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "A B A");
    // No error element should be present
    await expect(canvas.queryByText(/not a valid section token/i)).toBeNull();
  },
};
