import type { Meta, StoryObj } from "@storybook/react";
import { IconMic, IconStop, IconPlay, IconMetronome } from "./icons";

function Showcase({ metronomeActive }: { metronomeActive: boolean }) {
  const box: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: 12, background: "var(--surface-alt)", borderRadius: 8,
    color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 11,
  };
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={box}><IconMic /><span>IconMic</span></div>
      <div style={box}><IconStop /><span>IconStop</span></div>
      <div style={box}><IconPlay /><span>IconPlay</span></div>
      <div style={box}><IconMetronome active={metronomeActive} /><span>IconMetronome (active={String(metronomeActive)})</span></div>
    </div>
  );
}

const meta = {
  title: "Rehearsal/Icons",
  component: Showcase,
  parameters: { layout: "padded" },
  args: { metronomeActive: false },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {};
export const MetronomeActive: Story = { args: { metronomeActive: true } };
