// web/src/components/rehearsal/icons.tsx
// Minimal inline SVG icon components for the rehearsal UI.

export function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export function IconStop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

export function IconMetronome({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Triangle body */}
      <path d="M6 22L12 4L18 22Z" />
      {/* Pendulum */}
      <line
        x1="12" y1="10"
        x2={active ? "16" : "12"}
        y2="16"
        strokeWidth="2.5"
      />
      {/* Tick marks */}
      <line x1="6" y1="14" x2="8" y2="14" />
      <line x1="6" y1="18" x2="8" y2="18" />
    </svg>
  );
}
