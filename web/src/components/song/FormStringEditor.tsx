import { useState, useRef } from "react";
import { parsePattern, serialisePattern } from "./pattern";
import { LetterBadge } from "./LetterBadge";

interface FormStringEditorProps {
  pattern: string[];
  onChange: (letters: string[]) => void;  // called only when pattern is valid
}

export function FormStringEditor({ pattern, onChange }: FormStringEditorProps) {
  const [draft, setDraft] = useState(serialisePattern(pattern));
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
          {pattern.map((letter, i) => (
            <LetterBadge key={i} letter={letter} size={28} />
          ))}
        </div>
      )}
    </div>
  );
}
