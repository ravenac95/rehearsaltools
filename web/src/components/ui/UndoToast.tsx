import { useEffect } from "react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [onDismiss, durationMs]);

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast__msg">{message}</span>
      <button
        className="chip"
        onClick={() => { onUndo(); onDismiss(); }}
        style={{ minHeight: 32, padding: "4px 12px", fontSize: 14 }}
      >
        Undo
      </button>
    </div>
  );
}
