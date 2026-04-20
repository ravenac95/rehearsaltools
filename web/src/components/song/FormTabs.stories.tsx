import type { Meta, StoryObj } from "@storybook/react";
import type { SongForm } from "../../api/client";
import { FormTabs } from "./FormTabs";

const makeForm = (id: string, name: string): SongForm => ({
  id, name, bpm: 120, note: "q", pattern: [],
});

const twoForms = [makeForm("f1", "Verse"), makeForm("f2", "Chorus")];

const meta = {
  title: "Song/FormTabs",
  component: FormTabs,
  args: { onSelect: () => {}, onCreate: () => {}, onDelete: () => {} },
} satisfies Meta<typeof FormTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { forms: [], activeFormId: null } };
export const SingleForm: Story = { args: { forms: [makeForm("f1", "Verse")], activeFormId: "f1" } };
export const TwoFormsFirstActive: Story = { args: { forms: twoForms, activeFormId: "f1" } };
export const TwoFormsSecondActive: Story = { args: { forms: twoForms, activeFormId: "f2" } };
export const NoActiveForm: Story = { args: { forms: twoForms, activeFormId: null } };
export const ManyForms: Story = {
  args: {
    forms: ["Intro","Verse","Pre-Chorus","Chorus","Bridge","Outro"].map((n, i) =>
      makeForm(`f${i}`, n)
    ),
    activeFormId: "f2",
  },
};
