import type { Meta, StoryObj } from "@storybook/react";
import { HamburgerMenuPresentation } from "./HamburgerMenuPresentation";
import { ThemeTogglePresentation } from "../ui/ThemeToggle";

const noop = () => {};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
  title: "Rehearsal/HamburgerMenu",
  component: HamburgerMenuPresentation,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onClose: noop,
    themeToggle: <ThemeTogglePresentation pref="system" onCycle={noop} />,
  },
} satisfies Meta<typeof HamburgerMenuPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Stories ───────────────────────────────────────────────────────────────────

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};

export const OpenLightTheme: Story = {
  args: {
    themeToggle: <ThemeTogglePresentation pref="light" onCycle={noop} />,
  },
};

export const OpenDarkTheme: Story = {
  args: {
    themeToggle: <ThemeTogglePresentation pref="dark" onCycle={noop} />,
  },
};
