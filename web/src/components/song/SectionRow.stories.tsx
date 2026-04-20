import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within, expect } from "@storybook/test";
import type { Section, SongForm } from "../../api/client";
import { SectionRow } from "./SectionRow";

const baseForm: SongForm = { id: "f1", name: "Verse", bpm: 120, note: "q", pattern: ["A"] };

const baseSection: Section = {
  letter: "A",
  stanzas: [{ bars: 8, num: 4, denom: 4 }],
};

const multiStanzaSection: Section = {
  letter: "B",
  stanzas: [
    { bars: 8, num: 4, denom: 4 },
    { bars: 4, num: 3, denom: 4 },
  ],
};

const sectionWithBpm: Section = {
  letter: "C",
  stanzas: [{ bars: 4, num: 4, denom: 4 }],
  bpm: 140,
};

const meta = {
  title: "Song/SectionRow",
  component: SectionRow,
} satisfies Meta<typeof SectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {} },
};

export const CollapsedWithBpmOverride: Story = {
  args: { section: sectionWithBpm, form: baseForm, onUpdate: () => {} },
};

export const CollapsedMultiStanza: Story = {
  args: { section: multiStanzaSection, form: baseForm, onUpdate: () => {} },
};

export const CollapsedWithDelete: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {}, onDelete: () => {} },
};

// play() story — clicks the header to expand the section
export const ExpandedAfterClick: Story = {
  args: { section: baseSection, form: baseForm, onUpdate: () => {}, onDelete: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The header is a div with cursor:pointer; find it by the letter badge text
    const header = canvas.getByText("A").closest("[style*='cursor: pointer']") ??
                   canvasElement.querySelector("[style*='cursor']") as HTMLElement;
    await userEvent.click(header as HTMLElement);
    // After click: expanded section content becomes visible
    await expect(canvas.getByText("+ stanza")).toBeInTheDocument();
  },
};
