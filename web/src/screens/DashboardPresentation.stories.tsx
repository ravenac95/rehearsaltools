import type { Meta, StoryObj } from "@storybook/react";
import type { TransportState, Take } from "../api/client";
import { DashboardPresentation } from "./DashboardPresentation";

const noop = () => {};

const stoppedTransport: Partial<TransportState> = {
  playing: false, recording: false, stopped: true,
  position: 0, bpm: 120, num: 4, denom: 4, metronome: false,
};

const playingTransport: Partial<TransportState> = {
  ...stoppedTransport, playing: true, stopped: false,
};

const recordingTransport: Partial<TransportState> = {
  ...stoppedTransport, recording: true, stopped: false,
};

const currentTake: Take = { startTime: 4.5 };

const baseArgs = {
  tempoInput: "",
  logEnabled: false,
  onTempoInputChange: noop,
  onApplyTempo: noop,
  onPlay: noop,
  onStop: noop,
  onRecord: noop,
  onRecordTake: noop,
  onSeekToEnd: noop,
  onToggleMetronome: noop,
  onNewProject: noop,
  onToggleLog: noop,
};

const meta = {
  title: "Screens/DashboardPresentation",
  component: DashboardPresentation,
  parameters: { layout: "fullscreen" },
  args: { ...baseArgs, transport: stoppedTransport, currentTake: null },
} satisfies Meta<typeof DashboardPresentation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stopped: Story = {};

export const Playing: Story = {
  args: { transport: playingTransport },
};

export const Recording: Story = {
  args: { transport: recordingTransport },
};

export const WithCurrentTake: Story = {
  args: { currentTake },
};

export const MetronomeOn: Story = {
  args: { transport: { ...stoppedTransport, metronome: true } },
};

export const WithTempoInput: Story = {
  args: { tempoInput: "140" },
};

export const LogEnabled: Story = {
  args: { logEnabled: true },
};

export const EmptyTransport: Story = {
  args: { transport: {} },
};
