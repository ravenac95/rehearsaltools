import { useState, useRef, useCallback } from "react";
import { LetterBadge } from "./LetterBadge";

interface FormStringEditorProps {
  pattern: string[];
  onChange: (letters: string[]) => void;
  definedLetters?: string[];
}

export function FormStringEditor({ pattern, onChange, definedLetters }: FormStringEditorProps) {
  const defined = new Set(definedLetters ?? []);
  const [focused, setFocused] = useState(false);
  const [shaking, setShaking] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = useCallback(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 240);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (/^[a-zA-Z]$/.test(e.key)) {
      onChange([...pattern, e.key.toUpperCase()]);
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      if (pattern.length > 0) {
        onChange(pattern.slice(0, -1));
      }
      e.preventDefault();
      return;
    }
    // All other keys: shake and swallow
    triggerShake();
    e.preventDefault();
  };

  const handleClick = () => {
    regionRef.current?.focus();
  };

  const uniqueLetters = Array.from(new Set(pattern));

  return (
    <div style={{ padding: "8px 0" }} onClick={handleClick}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--muted-color)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          Form Pattern
        </span>
        <span style={{
          fontFamily: "var(--font-hand)",
          fontSize: 11,
          color: "var(--faint)",
        }}>
          type letters
        </span>
      </div>

      {/* Editor region */}
      <div
        ref={regionRef}
        tabIndex={0}
        role="textbox"
        aria-label="Form pattern editor"
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={shaking ? "wf-shake" : undefined}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
          minHeight: 52,
          padding: "10px 12px",
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "var(--radius-md)",
          outline: "none",
          boxShadow: focused ? "3px 3px 0 var(--ink-soft)" : "none",
          cursor: "text",
        }}
      >
        {pattern.map((letter, i) => {
          const undef = definedLetters !== undefined && !defined.has(letter);
          return (
            <div
              key={i}
              style={undef ? {
                padding: 2,
                border: "1.5px dashed var(--accent)",
                borderRadius: 6,
              } : undefined}
            >
              <LetterBadge letter={letter} size={32} />
            </div>
          );
        })}
        {focused && (
          <span
            className="wf-caret"
            style={{ height: 34, marginLeft: 2 }}
          />
        )}
      </div>

      {/* Stats line */}
      {pattern.length > 0 && (
        <div style={{
          marginTop: 6,
          fontSize: 11,
          color: "var(--muted-color)",
          fontFamily: "var(--font-mono)",
        }}>
          {pattern.length} section{pattern.length !== 1 ? "s" : ""} · unique: {uniqueLetters.join(" ")}
        </div>
      )}
    </div>
  );
}
