import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  args: { children: "Card content" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Clickable: Story = { args: { onClick: () => alert("clicked") } };
export const WithCustomClass: Story = { args: { className: "highlight" } };
export const EmptyContent: Story = { args: { children: "" } };
export const RichContent: Story = {
  args: {
    children: (
      <div>
        <strong>Title</strong>
        <p style={{ margin: "4px 0 0" }}>Some body text inside the card.</p>
      </div>
    ),
  },
};
