import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Click me" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Danger: Story = { args: { variant: "danger" } };
export const PrimaryDisabled: Story = { args: { variant: "primary", disabled: true } };
export const SecondaryDisabled: Story = { args: { variant: "secondary", disabled: true } };
export const DangerDisabled: Story = { args: { variant: "danger", disabled: true } };
export const EmptyChildren: Story = { args: { variant: "primary", children: "" } };
export const LongLabel: Story = { args: { variant: "secondary", children: "This is a very long button label that might wrap" } };
