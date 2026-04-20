import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./Stepper";

const meta = {
  title: "UI/Stepper",
  component: Stepper,
  args: { label: "BPM", value: 120, onChange: () => {} },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithUnit: Story = { args: { unit: "BPM", mono: true } };
export const WithMinMax: Story = { args: { value: 20, min: 20, max: 240, step: 5, unit: "BPM" } };
export const AtMin: Story = { args: { value: 20, min: 20, max: 240, unit: "BPM" } };
export const AtMax: Story = { args: { value: 240, min: 20, max: 240, unit: "BPM" } };
export const MonoFont: Story = { args: { mono: true, value: 120, unit: "BPM" } };
export const HandFont: Story = { args: { mono: false, value: 120 } };
export const LargeStep: Story = { args: { step: 10, value: 120, unit: "BPM" } };
