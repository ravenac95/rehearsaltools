// server/src/config.ts
// Centralised configuration. All values are environment-overridable.

export interface Config {
  httpHost: string;
  httpPort: number;

  // UDP where we send /rt/* messages to the REAPER dispatcher ReaScript.
  dispatcherHost: string;
  dispatcherPort: number;

  // UDP where the ReaScript sends /rt/reply and /rt/event back to us.
  replyHost: string;
  replyPort: number;

  // UDP where we send REAPER's native OSC actions (/play, /stop, /tempo/raw, …).
  reaperOscHost: string;
  reaperOscPort: number;

  // UDP where REAPER sends native OSC feedback (configured in its OSC device).
  reaperFeedbackHost: string;
  reaperFeedbackPort: number;

  // Persistent server store (sections + song form).
  dataFile: string;
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

    dispatcherHost:      strEnv("DISPATCHER_HOST",      "127.0.0.1"),
    dispatcherPort:      intEnv("DISPATCHER_PORT",      9000),

    replyHost:           strEnv("REPLY_HOST",           "0.0.0.0"),
    replyPort:           intEnv("REPLY_PORT",           9001),

    reaperOscHost:       strEnv("REAPER_OSC_HOST",      "127.0.0.1"),
    reaperOscPort:       intEnv("REAPER_OSC_PORT",      8000),

    reaperFeedbackHost:  strEnv("REAPER_FEEDBACK_HOST", "0.0.0.0"),
    reaperFeedbackPort:  intEnv("REAPER_FEEDBACK_PORT", 8001),

    dataFile:            strEnv("DATA_FILE",            "./data/rehearsaltools.json"),
  };
}
