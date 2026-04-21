// server/src/config.ts
// Centralised configuration. All values are environment-overridable.

export interface RehearsalType {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface Config {
  httpHost: string;
  httpPort: number;

  // UDP where we send REAPER's native OSC actions (/play, /stop, /tempo/raw, …)
  // and /rt/* fire-and-forget messages.
  reaperOscHost: string;
  reaperOscPort: number;

  // UDP where REAPER sends native OSC feedback (configured in its OSC device).
  reaperFeedbackHost: string;
  reaperFeedbackPort: number;

  // HTTP — REAPER's built-in web remote, used for reads (GET transport, regions, etc.).
  // NOTE: REAPER's web remote and the Node HTTP server both default to port 8080.
  // The user must pick different ports — e.g. set REAPER_WEB_PORT=8081 in REAPER's
  // web-remote preferences, or change HTTP_PORT for the Node server.
  reaperWebHost: string;
  reaperWebPort: number;

  // Persistent server store (sections + song form).
  dataFile: string;

  // Rehearsal type definitions
  rehearsalTypes: RehearsalType[];
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`env ${name} must be an integer, got ${raw}`);
  }
  return n;
}

function strEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadConfig(): Config {
  return {
    httpHost:            strEnv("HTTP_HOST",            "0.0.0.0"),
    httpPort:            intEnv("HTTP_PORT",            8080),

    reaperOscHost:       strEnv("REAPER_OSC_HOST",      "127.0.0.1"),
    reaperOscPort:       intEnv("REAPER_OSC_PORT",      8000),

    reaperFeedbackHost:  strEnv("REAPER_FEEDBACK_HOST", "0.0.0.0"),
    reaperFeedbackPort:  intEnv("REAPER_FEEDBACK_PORT", 8001),

    reaperWebHost:       strEnv("REAPER_WEB_HOST",      "127.0.0.1"),
    reaperWebPort:       intEnv("REAPER_WEB_PORT",      8081),

    dataFile:            strEnv("DATA_FILE",            "./data/rehearsaltools.json"),

    rehearsalTypes: [
      { id: "full-band",  name: "Full Band",   desc: "All instruments, full monitoring",   emoji: "🎸" },
      { id: "piano-vox",  name: "Piano + Vox", desc: "Stripped back, piano and vocals only", emoji: "🎹" },
    ],
  };
}
