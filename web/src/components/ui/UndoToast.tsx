import { useEffect, useRef } from "react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  // Hold the latest callbacks in refs so the auto-dismiss timer is started
  // exactly once per mount, even when parents pass inline callbacks that
  // change identity on every render.
  const onDismissRef = useRef(onDismiss);
  const onUndoRef = useRef(onUndo);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);

  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast__msg">{message}</span>
      <button
        className="chip"
        onClick={() => { onUndoRef.current(); onDismissRef.current(); }}
        style={{ minHeight: 32, padding: "4px 12px", fontSize: 14 }}
      >
        Undo
      </button>
    </div>
  );
}
