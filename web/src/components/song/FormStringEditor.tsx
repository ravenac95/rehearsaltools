import { useState, useRef, useEffect } from "react";
import { parsePattern, serialisePattern } from "./pattern";
import { LetterBadge } from "./LetterBadge";

interface FormStringEditorProps {
  pattern: string[];
  onChange: (letters: string[]) => void;  // called only when pattern is valid
  definedLetters?: string[];               // letters that resolve to a defined section
}

export function FormStringEditor({ pattern, onChange, definedLetters }: FormStringEditorProps) {
  const defined = new Set(definedLetters ?? []);
  const serialised = serialisePattern(pattern);
  const [draft, setDraft] = useState(serialised);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when the incoming pattern changes from outside (form switch, snapshot).
  // Skip while the user is actively typing in this input to avoid clobbering mid-edit.
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) return;
    setDraft(serialised);
    setErrors([]);
  }, [serialised]);

  const handleChange = (value: string) => {
    setDraft(value);
    const { letters, errors: errs } = parsePattern(value);
    if (errs.length === 0) {
      onChange(letters);
      setErrors([]);
    } else {
      setErrors(errs.map((e) => e.message));
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      <label style={{ fontSize: 12, color: "var(--muted-color)", fontFamily: "var(--font-hand)", display: "block", marginBottom: 4 }}>
        Pattern (type letters, use A×2 for repeats)
      </label>
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. I A A B A C"
        style={{
          width: "100%", padding: "10px 12px",
          fontFamily: "var(--font-mono)", fontSize: 16,
          background: "var(--surface)", color: "var(--ink)",
          border: `1px solid ${errors.length ? "var(--accent)" : "var(--rule)"}`,
          borderRadius: "var(--radius-sm)", minHeight: 44,
        }}
      />
      {errors.length > 0 && (
        <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 4, fontFamily: "var(--font-hand)" }}>
          {errors[0]}
        </div>
      )}
      {/* Token pills (visual echo) */}
      {pattern.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {pattern.map((letter, i) => {
            const undef = definedLetters !== undefined && !defined.has(letter);
            return (
              <div
                key={i}
                title={undef ? "no section — create it in the Sections list" : undefined}
                style={{
                  padding: undef ? 2 : 0,
                  border: undef ? "1.5px dashed var(--accent)" : "none",
                  borderRadius: undef ? "var(--radius-sm)" : undefined,
                }}
              >
                <LetterBadge letter={letter} size={28} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
