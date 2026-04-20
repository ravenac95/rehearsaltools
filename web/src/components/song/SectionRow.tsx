import { useState } from "react";
import type { Section, Stanza, NoteValue, SongForm } from "../../api/client";
import { LetterBadge } from "./LetterBadge";
import { StanzaCompact } from "./StanzaCompact";
import { StanzaExpanded } from "./StanzaExpanded";
import { TempoEditor } from "./TempoEditor";
import { NoteGlyph } from "./NoteGlyph";

interface SectionRowProps {
  section: Section;
  form: SongForm;              // needed for effective BPM/note computation
  onUpdate: (stanzas: Stanza[], bpm?: number, note?: NoteValue) => void;
  onDelete?: () => void;
}

function effectiveBpm(stanza: Stanza, section: Section, form: SongForm): number {
  return stanza.bpm ?? section.bpm ?? form.bpm;
}
function effectiveNote(stanza: Stanza, section: Section, form: SongForm): NoteValue {
  return stanza.note ?? section.note ?? form.note;
}

export function SectionRow({ section, form, onUpdate, onDelete }: SectionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedStanzaIdx, setExpandedStanzaIdx] = useState<number | null>(null);

  const updateStanza = (idx: number, updated: Stanza) => {
    const next = section.stanzas.map((s, i) => i === idx ? updated : s);
    onUpdate(next, section.bpm, section.note);
  };

  const deleteStanza = (idx: number) => {
    if (section.stanzas.length <= 1) return; // keep at least one
    const next = section.stanzas.filter((_, i) => i !== idx);
    onUpdate(next, section.bpm, section.note);
  };

  const duplicateStanza = (idx: number) => {
    const next = [...section.stanzas];
    next.splice(idx + 1, 0, { ...section.stanzas[idx] });
    onUpdate(next, section.bpm, section.note);
  };

  const addStanza = () => {
    const last = section.stanzas[section.stanzas.length - 1] ?? { bars: 8, num: 4, denom: 4 };
    onUpdate([...section.stanzas, { bars: last.bars, num: last.num, denom: last.denom }],
      section.bpm, section.note);
  };

  const sectionBpmOverridden = section.bpm !== undefined;
  const sectionEffBpm = section.bpm ?? form.bpm;
  const sectionEffNote = section.note ?? form.note;

  return (
    <div style={{
      border: expanded ? "1.5px solid var(--ink)" : "1.5px solid var(--rule)",
      borderRadius: 10,
      background: "var(--surface)",
      overflow: "hidden",
      marginBottom: 8,
      boxShadow: expanded ? "2px 2px 0 var(--ink)" : "none",
    }}>
      {/* Header row — always visible, toggles expand */}
      <div
        onClick={() => setExpanded((x) => !x)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderBottom: expanded ? "1.5px solid var(--rule)" : "none",
          cursor: "pointer",
        }}
      >
        <LetterBadge letter={section.letter} size={32} />

        {/* Stanza strip with right-edge fade */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          <div style={{
            display: "flex",
            gap: 4,
            flexWrap: "nowrap",
            overflow: "hidden",
            flex: 1,
            minWidth: 0,
          }}>
            {section.stanzas.map((st, i) => (
              <StanzaCompact
                key={i}
                stanza={st}
                effectiveBpm={effectiveBpm(st, section, form)}
                effectiveNote={effectiveNote(st, section, form)}
                bpmInherited={st.bpm === undefined}
              />
            ))}
          </div>
          {/* Right fade overlay */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 18,
            background: "linear-gradient(to right, transparent, var(--surface))",
            pointerEvents: "none",
          }} />
        </div>

        {/* Compact section BPM readout */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: sectionBpmOverridden ? 700 : 400,
          color: sectionBpmOverridden ? "var(--ink)" : "var(--faint)",
          flexShrink: 0,
        }}>
          <NoteGlyph note={sectionEffNote} inherited={!sectionBpmOverridden} size={12} />
          <span>={sectionEffBpm}</span>
        </div>

        {/* Chevron */}
        <span style={{
          fontFamily: "var(--font-hand)",
          fontSize: 18,
          color: "var(--muted-color)",
          flexShrink: 0,
        }}>
          {expanded ? "▾" : "▸"}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Label */}
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--muted-color)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            Editing {section.letter}
          </div>

          {/* Section-level tempo override */}
          <TempoEditor
            bpm={sectionEffBpm}
            note={sectionEffNote}
            bpmOverridden={sectionBpmOverridden}
            noteOverridden={section.note !== undefined}
            onBpmChange={(v) => onUpdate(section.stanzas, v, section.note)}
            onNoteChange={(v) => onUpdate(section.stanzas, section.bpm, v)}
            onBpmClear={() => onUpdate(section.stanzas, undefined, section.note)}
            onNoteClear={() => onUpdate(section.stanzas, section.bpm, undefined)}
          />

          <div style={{ height: 1, background: "var(--rule)", margin: "4px 0" }} />

          {/* Stanzas */}
          {section.stanzas.map((st, i) => (
            <div key={i}>
              <div
                style={{ fontSize: 12, color: "var(--muted-color)", marginBottom: 4, cursor: "pointer" }}
                onClick={() => setExpandedStanzaIdx(expandedStanzaIdx === i ? null : i)}
              >
                Stanza {i + 1} — {st.bars} bars {st.num}/{st.denom} {expandedStanzaIdx === i ? "▾" : "▸"}
              </div>
              {expandedStanzaIdx === i && (
                <StanzaExpanded
                  stanza={st}
                  index={i}
                  effectiveBpm={effectiveBpm(st, section, form)}
                  effectiveNote={effectiveNote(st, section, form)}
                  formBpm={form.bpm}
                  sectionBpm={section.bpm}
                  onChange={(updated) => updateStanza(i, updated)}
                  onDelete={() => deleteStanza(i)}
                  onDuplicate={() => duplicateStanza(i)}
                />
              )}
            </div>
          ))}

          {/* Add stanza */}
          <button className="chip" onClick={addStanza}
            style={{ alignSelf: "flex-start", fontSize: 13 }}>
            + stanza
          </button>

          {onDelete && (
            <button
              className="chip"
              onClick={onDelete}
              style={{ alignSelf: "flex-end", fontSize: 13, color: "var(--accent)", borderColor: "var(--accent)" }}
              title={`Delete section ${section.letter}`}
            >
              × delete section
            </button>
          )}
        </div>
      )}
    </div>
  );
}
