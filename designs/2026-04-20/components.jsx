const { useState, useRef, useCallback, useEffect, useMemo, useId } = React;

// ── Shared mock data ──────────────────────────────────────────
const REHEARSAL_TYPES = [
  { id: 'full-band', name: 'Full Band', desc: 'All instruments, full monitoring' },
  { id: 'piano-vox', name: 'Piano + Vox', desc: 'Stripped back, piano and vocals only' },
];

const MOCK_SETLIST = [
  { id: '1', name: 'Midnight Train', bpm: 112, timeSig: '4/4' },
  { id: '2', name: 'Golden Hour', bpm: 88, timeSig: '3/4' },
  { id: '3', name: 'River Song', bpm: 140, timeSig: '4/4' },
  { id: '4', name: 'Broken Windows', bpm: 96, timeSig: '6/8' },
  { id: '5', name: 'Slow Burn', bpm: 72, timeSig: '4/4' },
];

const NOTE_ORDER = ['w', 'h', 'q', 'e', 's'];
const NOTE_GLYPHS = { w: '\u{1D157}', h: '\u{1D15E}', q: '\u{1D15F}', e: '\u{1D160}', s: '\u{1D161}' };
const NOTE_NAMES = { w: 'whole', h: 'half', q: 'quarter', e: 'eighth', s: 'sixteenth' };
const DENOMS = [1, 2, 4, 8, 16, 32, 64];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TS_PRESETS = [[4,4],[6,8],[7,8]];

// ── parsePattern ──────────────────────────────────────────────
function parsePattern(input) {
  const letters = [];
  for (const ch of input) {
    if (/[a-zA-Z]/.test(ch)) letters.push(ch.toUpperCase());
  }
  return { letters };
}

// ── getLetterColor ────────────────────────────────────────────
function getLetterColor(letter) {
  const l = letter.toUpperCase();
  return {
    bg: `var(--letter-${l}-bg, var(--surface-alt))`,
    ink: `var(--letter-${l}-ink, var(--ink))`,
  };
}

// ── Icon components ───────────────────────────────────────────
function IconMic({ size = 20, color = 'currentColor' }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
    React.createElement('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
    React.createElement('line', { x1: 12, y1: 19, x2: 12, y2: 23 }),
    React.createElement('line', { x1: 8, y1: 23, x2: 16, y2: 23 }),
  );
}

function IconPlay({ size = 20, color = 'currentColor' }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: color, stroke: 'none' },
    React.createElement('polygon', { points: '5,3 19,12 5,21' }),
  );
}

function IconStop({ size = 20, color = 'currentColor' }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: color, stroke: 'none' },
    React.createElement('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 }),
  );
}

function IconChevron({ size = 16, color = 'currentColor', direction = 'right' }) {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction] || 0;
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', style: { transform: `rotate(${rotation}deg)` } },
    React.createElement('polyline', { points: '9 18 15 12 9 6' }),
  );
}

function IconPlus({ size = 20, color = 'currentColor' }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round' },
    React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
    React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 }),
  );
}

function IconMetronome({ size = 20, color = 'currentColor', active = false }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M6 22l3-18h6l3 18H6z' }),
    active ? React.createElement('line', { x1: 12, y1: 8, x2: 16, y2: 3, stroke: color, strokeWidth: 2.5 })
           : React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 4, stroke: color, strokeWidth: 2.5 }),
  );
}

// ── NoteGlyph ─────────────────────────────────────────────────
function NoteGlyph({ note, inherited = false, size = 18 }) {
  return React.createElement('span', {
    title: NOTE_NAMES[note],
    style: {
      fontFamily: 'var(--font-music, serif)', fontSize: size,
      color: inherited ? 'var(--faint)' : 'var(--ink)',
      fontWeight: inherited ? 400 : 700, lineHeight: 1,
      cursor: 'default', userSelect: 'none',
    }
  }, NOTE_GLYPHS[note] || '♩');
}

// ── TimeSigStack ──────────────────────────────────────────────
function TimeSigStack({ num, denom, size = 'md' }) {
  const fs = size === 'sm' ? 13 : 17;
  return React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 1, gap: 1,
    }
  },
    React.createElement('span', { style: { fontSize: fs } }, num),
    React.createElement('div', { style: { width: '100%', height: 1, background: 'var(--ink-soft)', margin: '1px 0' } }),
    React.createElement('span', { style: { fontSize: fs } }, denom),
  );
}

// ── TimeSigInput ──────────────────────────────────────────────
function TimeSigInput({ num, denom, onChange }) {
  const [draft, setDraft] = useState(null);
  const inputRef = useRef(null);
  const fieldStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, lineHeight: 1,
    color: 'var(--ink)', background: 'transparent', border: 'none', outline: 'none',
    textAlign: 'center', width: '3ch', padding: 0, margin: 0,
  };
  const commit = (raw) => {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(64, parsed));
      if (clamped !== num) onChange(clamped, denom);
    }
    setDraft(null);
  };
  return React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: 1,
      padding: '4px 6px', border: '1px solid var(--rule)', borderRadius: 'var(--radius-sm)',
      background: 'var(--surface)',
    }
  },
    React.createElement('input', {
      ref: inputRef, type: 'text', inputMode: 'numeric',
      value: draft !== null ? draft : String(num),
      'aria-label': 'Time signature numerator',
      onFocus: () => setDraft(String(num)),
      onChange: (e) => setDraft(e.target.value.replace(/[^0-9]/g, '')),
      onBlur: () => commit(draft !== null ? draft : String(num)),
      onKeyDown: (e) => {
        if (e.key === 'Enter') { commit(draft ?? String(num)); inputRef.current?.blur(); }
        if (e.key === 'Escape') { setDraft(null); inputRef.current?.blur(); }
      },
      style: fieldStyle,
    }),
    React.createElement('div', { style: { width: '100%', height: 1, background: 'var(--ink-soft)', margin: '1px 0' } }),
    React.createElement('select', {
      value: denom, 'aria-label': 'Time signature denominator',
      onChange: (e) => onChange(num, parseInt(e.target.value, 10)),
      style: { ...fieldStyle, cursor: 'pointer', textAlignLast: 'center' },
    },
      ...DENOMS.map(d => React.createElement('option', { key: d, value: d }, d)),
    ),
  );
}

// ── LetterBadge ───────────────────────────────────────────────
function LetterBadge({ letter, size = 36 }) {
  const { bg, ink } = getLetterColor(letter);
  return React.createElement('div', {
    style: {
      width: size, height: size, borderRadius: 6,
      background: bg, color: ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.55, flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
    }
  }, letter.toUpperCase());
}

// ── Stepper ───────────────────────────────────────────────────
function Stepper({ label, value, min, max, step = 1, onChange, unit, mono = false }) {
  const [draft, setDraft] = useState(null);
  const inputRef = useRef(null);
  const clamp = (n) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };
  const dec = () => { const next = value - step; if (min === undefined || next >= min) onChange(next); };
  const inc = () => { const next = value + step; if (max === undefined || next <= max) onChange(next); };
  const commitDraft = (d) => {
    const parsed = parseInt(d, 10);
    onChange(clamp(isNaN(parsed) ? value : parsed));
    setDraft(null);
  };
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
    React.createElement('label', { style: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-body)' } }, label),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      React.createElement('button', { className: 'chip', onClick: dec, 'aria-label': `Decrease ${label}`, style: { minHeight: 36, padding: '4px 12px' } }, '–'),
      React.createElement('input', {
        ref: inputRef, type: 'text', inputMode: 'numeric',
        value: draft !== null ? draft : String(value),
        onFocus: () => setDraft(String(value)),
        onBlur: () => { if (draft !== null) commitDraft(draft); },
        onChange: (e) => setDraft(e.target.value),
        onKeyDown: (e) => {
          if (e.key === 'Enter') { commitDraft(draft ?? String(value)); inputRef.current?.blur(); e.preventDefault(); }
          if (e.key === 'Escape') { setDraft(null); inputRef.current?.blur(); e.preventDefault(); }
          if (!/^\d$/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter','Escape'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
        },
        style: {
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: 18,
          minWidth: 48, textAlign: 'center', color: 'var(--ink)',
          background: 'transparent', border: 'none', outline: 'none', padding: 0,
        },
      }),
      unit && React.createElement('span', { style: { fontSize: 13, color: 'var(--muted)', marginLeft: 2 } }, unit),
      React.createElement('button', { className: 'chip', onClick: inc, 'aria-label': `Increase ${label}`, style: { minHeight: 36, padding: '4px 12px' } }, '+'),
    ),
  );
}

// ── TempoEditor ───────────────────────────────────────────────
function TempoEditor({ bpm, note, bpmOverridden, noteOverridden, onBpmChange, onNoteChange, onBpmClear, onNoteClear }) {
  const cycleNote = () => {
    const idx = NOTE_ORDER.indexOf(note);
    onNoteChange(NOTE_ORDER[(idx + 1) % NOTE_ORDER.length]);
  };
  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: 8,
      border: '1.5px solid var(--ink)', borderRadius: 'var(--radius-sm)',
      background: 'var(--surface)', padding: '6px 10px', flexWrap: 'nowrap',
    }
  },
    React.createElement('button', { className: 'chip', onClick: cycleNote, style: { minHeight: 36, padding: '4px 10px', flexShrink: 0 } },
      React.createElement(NoteGlyph, { note, inherited: !noteOverridden }),
    ),
    React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', flexShrink: 0 } }, '='),
    React.createElement('div', { style: {
      fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
      minWidth: 40, lineHeight: 1,
      color: bpmOverridden ? 'var(--ink)' : 'var(--faint)', flexShrink: 0,
    } }, bpm),
    React.createElement('input', {
      type: 'range', min: 20, max: 300, step: 1, value: bpm,
      'aria-label': 'BPM', onChange: (e) => onBpmChange(+e.target.value),
      style: { flex: 1, accentColor: 'var(--accent)' },
    }),
    noteOverridden && onNoteClear && React.createElement('button', {
      className: 'chip ghost', onClick: onNoteClear,
      style: { fontSize: 11, minHeight: 28, padding: '2px 8px', flexShrink: 0 }, title: 'Remove note override',
    }, '×'),
    bpmOverridden && onBpmClear && React.createElement('button', {
      className: 'chip ghost', onClick: onBpmClear,
      style: { fontSize: 11, minHeight: 28, padding: '2px 8px', flexShrink: 0 }, title: 'Remove BPM override',
    }, '×'),
  );
}

// ── StanzaCompact ─────────────────────────────────────────────
function StanzaCompact({ stanza, effectiveBpm, effectiveNote, bpmInherited, noteInherited }) {
  return React.createElement('div', {
    style: {
      display: 'flex', border: '1.5px solid var(--ink)', borderRadius: 8,
      background: 'var(--surface)', overflow: 'hidden',
      boxShadow: '2px 2px 0 var(--ink-soft)', minWidth: 78, flexShrink: 0,
    }
  },
    React.createElement('div', {
      style: { padding: '6px 7px', borderRight: '1.5px solid var(--rule)', display: 'flex', alignItems: 'center', background: 'var(--surface-alt)' }
    }, React.createElement(TimeSigStack, { num: stanza.num, denom: stanza.denom, size: 'md' })),
    React.createElement('div', {
      style: { padding: '5px 9px 5px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 44 }
    },
      React.createElement('div', { style: { fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, lineHeight: 1, color: 'var(--ink)' } }, `${stanza.bars}×`),
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 1, fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: bpmInherited ? 400 : 700,
          color: bpmInherited ? 'var(--faint)' : 'var(--ink)',
        }
      },
        React.createElement(NoteGlyph, { note: effectiveNote, inherited: noteInherited, size: 11 }),
        React.createElement('span', null, `=${effectiveBpm}`),
      ),
    ),
  );
}

// ── StanzaExpanded ────────────────────────────────────────────
function StanzaExpanded({ stanza, effectiveBpm, effectiveNote, onChange, onDelete, onDuplicate }) {
  const bpmInherited = stanza.bpm === undefined;
  const noteInherited = stanza.note === undefined;
  const matchesPreset = TS_PRESETS.some(([n,d]) => n === stanza.num && d === stanza.denom);
  const [customMode, setCustomMode] = useState(!matchesPreset);
  const showCustom = customMode || !matchesPreset;

  return React.createElement('div', {
    style: {
      padding: 12, background: 'var(--surface-alt)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 12,
    }
  },
    React.createElement(StanzaCompact, { stanza, effectiveBpm, effectiveNote, bpmInherited, noteInherited }),
    // Bars + time sig
    React.createElement('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' } },
      React.createElement(Stepper, { label: 'Bars', value: stanza.bars, min: 1, onChange: (v) => onChange({ ...stanza, bars: v }) }),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        React.createElement('label', { style: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-body)' } }, 'Time signature'),
        React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          ...TS_PRESETS.map(([n,d]) => {
            const active = !customMode && stanza.num === n && stanza.denom === d;
            return React.createElement('button', {
              key: `${n}/${d}`, className: active ? 'chip solid' : 'chip',
              onClick: () => { setCustomMode(false); onChange({ ...stanza, num: n, denom: d }); },
              style: { minHeight: 36, padding: '6px 12px', fontSize: 14 },
            }, `${n}/${d}`);
          }),
          React.createElement('button', {
            className: showCustom ? 'chip solid' : 'chip',
            onClick: () => setCustomMode(true),
            style: { minHeight: 36, padding: '6px 12px', fontSize: 14 },
          }, 'Custom'),
          showCustom && React.createElement(TimeSigInput, {
            num: stanza.num, denom: stanza.denom,
            onChange: (n, d) => onChange({ ...stanza, num: n, denom: d }),
          }),
        ),
      ),
    ),
    // Tempo override
    React.createElement(TempoEditor, {
      bpm: effectiveBpm, note: effectiveNote,
      bpmOverridden: stanza.bpm !== undefined, noteOverridden: stanza.note !== undefined,
      onBpmChange: (v) => onChange({ ...stanza, bpm: v }),
      onNoteChange: (v) => onChange({ ...stanza, note: v }),
      onBpmClear: () => onChange({ ...stanza, bpm: undefined }),
      onNoteClear: () => onChange({ ...stanza, note: undefined }),
    }),
    // Actions
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      React.createElement('button', { className: 'chip', onClick: onDuplicate, style: { fontSize: 13, minHeight: 36, padding: '6px 12px' } }, 'Duplicate'),
      React.createElement('button', { className: 'chip', onClick: onDelete, style: { fontSize: 13, minHeight: 36, padding: '6px 12px', borderColor: 'var(--accent)', color: 'var(--accent)' } }, 'Delete'),
    ),
  );
}

// ── FormTabs ──────────────────────────────────────────────────
function FormTabs({ forms, activeFormId, onSelect, onCreate, onDelete }) {
  const lastTap = useRef(null);
  const handleTouchEnd = (id) => (e) => {
    if (!onDelete) return;
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === id && now - prev.t < 300) {
      e.preventDefault(); lastTap.current = null; onDelete(id);
    } else {
      lastTap.current = { id, t: now };
    }
  };
  return React.createElement('div', {
    style: { display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0', borderBottom: '1px solid var(--rule)' }
  },
    ...forms.map(f => {
      const active = f.id === activeFormId;
      return React.createElement('button', {
        key: f.id, className: active ? 'chip solid' : 'chip',
        onClick: () => onSelect(f.id),
        onDoubleClick: onDelete ? () => onDelete(f.id) : undefined,
        onTouchEnd: onDelete ? handleTouchEnd(f.id) : undefined,
        title: onDelete ? 'Double-click or double-tap to delete' : undefined,
        style: { flexShrink: 0 },
      }, f.name);
    }),
    React.createElement('button', { className: 'chip ghost', onClick: onCreate, style: { flexShrink: 0 } }, '+'),
  );
}

// ── FormStringEditor ──────────────────────────────────────────
function FormStringEditor({ pattern, onChange, definedLetters }) {
  const defined = new Set(definedLetters || []);
  const [focused, setFocused] = useState(false);
  const [shaking, setShaking] = useState(false);
  const regionRef = useRef(null);
  const shakeTimer = useRef(null);

  const triggerShake = useCallback(() => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShaking(true);
    shakeTimer.current = setTimeout(() => setShaking(false), 240);
  }, []);

  useEffect(() => () => { if (shakeTimer.current) clearTimeout(shakeTimer.current); }, []);

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const letters = parsePattern(text).letters;
    if (letters.length) onChange([...pattern, ...letters]);
    else triggerShake();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)) return;
    if (/^[a-zA-Z]$/.test(e.key)) { onChange([...pattern, e.key.toUpperCase()]); e.preventDefault(); return; }
    if (e.key === 'Backspace') { if (pattern.length > 0) onChange(pattern.slice(0, -1)); e.preventDefault(); return; }
    triggerShake(); e.preventDefault();
  };

  const uniqueLetters = Array.from(new Set(pattern));

  return React.createElement('div', { style: { padding: '8px 0' }, onClick: () => regionRef.current?.focus() },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
      React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' } }, 'Form Pattern'),
      React.createElement('span', { style: { fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--faint)' } }, 'type letters'),
    ),
    React.createElement('div', {
      ref: regionRef, tabIndex: 0, role: 'textbox', 'aria-label': 'Form pattern editor',
      onKeyDown: handleKeyDown, onPaste: handlePaste,
      onFocus: () => setFocused(true), onBlur: () => setFocused(false),
      className: shaking ? 'wf-shake' : undefined,
      style: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
        minHeight: 52, padding: '10px 12px', background: 'var(--surface)',
        border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)', outline: 'none',
        boxShadow: focused ? '3px 3px 0 var(--ink-soft)' : 'none', cursor: 'text',
      }
    },
      ...pattern.map((letter, i) => {
        const undef = definedLetters !== undefined && !defined.has(letter);
        const badge = React.createElement(LetterBadge, { key: i, letter, size: 32 });
        return undef ? React.createElement('div', { key: i, style: { padding: 2, border: '1.5px dashed var(--accent)', borderRadius: 6 } }, badge) : badge;
      }),
      focused && React.createElement('span', { className: 'wf-caret', style: { height: 34, marginLeft: 2 } }),
    ),
    pattern.length > 0 && React.createElement('div', {
      style: { marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }
    }, `${pattern.length} section${pattern.length !== 1 ? 's' : ''} · unique: ${uniqueLetters.join(' ')}`),
  );
}

// ── SectionRow ────────────────────────────────────────────────
function SectionRow({ section, form, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedStanzaIdx, setExpandedStanzaIdx] = useState(null);

  const effectiveBpm = (st) => st.bpm ?? section.bpm ?? form.bpm;
  const effectiveNote = (st) => st.note ?? section.note ?? form.note;

  const updateStanza = (idx, updated) => {
    const next = section.stanzas.map((s, i) => i === idx ? updated : s);
    onUpdate(next, section.bpm, section.note);
  };
  const deleteStanza = (idx) => {
    if (section.stanzas.length <= 1) return;
    onUpdate(section.stanzas.filter((_, i) => i !== idx), section.bpm, section.note);
  };
  const duplicateStanza = (idx) => {
    const next = [...section.stanzas];
    next.splice(idx + 1, 0, { ...section.stanzas[idx] });
    onUpdate(next, section.bpm, section.note);
  };
  const addStanza = () => {
    const last = section.stanzas[section.stanzas.length - 1] || { bars: 8, num: 4, denom: 4 };
    onUpdate([...section.stanzas, { bars: last.bars, num: last.num, denom: last.denom }], section.bpm, section.note);
  };

  const sectionBpmOverridden = section.bpm !== undefined;
  const sectionEffBpm = section.bpm ?? form.bpm;
  const sectionEffNote = section.note ?? form.note;

  return React.createElement('div', {
    style: {
      border: expanded ? '1.5px solid var(--ink)' : '1.5px solid var(--rule)',
      borderRadius: 10, background: 'var(--surface)', overflow: 'hidden', marginBottom: 8,
      boxShadow: expanded ? '2px 2px 0 var(--ink)' : 'none',
    }
  },
    // Header
    React.createElement('div', {
      onClick: () => setExpanded(x => !x),
      style: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        borderBottom: expanded ? '1.5px solid var(--rule)' : 'none', cursor: 'pointer',
      }
    },
      React.createElement(LetterBadge, { letter: section.letter, size: 32 }),
      React.createElement('div', { style: { flex: 1, minWidth: 0, position: 'relative' } },
        React.createElement('div', { style: { display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', flex: 1, minWidth: 0 } },
          ...section.stanzas.map((st, i) =>
            React.createElement(StanzaCompact, {
              key: i, stanza: st, effectiveBpm: effectiveBpm(st),
              effectiveNote: effectiveNote(st), bpmInherited: st.bpm === undefined, noteInherited: st.note === undefined,
            })
          ),
        ),
        React.createElement('div', { style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 18, background: 'linear-gradient(to right, transparent, var(--surface))', pointerEvents: 'none' } }),
      ),
      React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: sectionBpmOverridden ? 700 : 400,
          color: sectionBpmOverridden ? 'var(--ink)' : 'var(--faint)', flexShrink: 0,
        }
      },
        React.createElement(NoteGlyph, { note: sectionEffNote, inherited: section.note === undefined, size: 12 }),
        React.createElement('span', null, `=${sectionEffBpm}`),
      ),
      React.createElement('span', { style: { fontFamily: 'var(--font-body)', fontSize: 18, color: 'var(--muted)', flexShrink: 0 } }, expanded ? '▾' : '▸'),
    ),
    // Expanded body
    expanded && React.createElement('div', { style: { padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' } }, `Editing ${section.letter}`),
      React.createElement(TempoEditor, {
        bpm: sectionEffBpm, note: sectionEffNote, bpmOverridden: sectionBpmOverridden,
        noteOverridden: section.note !== undefined,
        onBpmChange: (v) => onUpdate(section.stanzas, v, section.note),
        onNoteChange: (v) => onUpdate(section.stanzas, section.bpm, v),
        onBpmClear: () => onUpdate(section.stanzas, undefined, section.note),
        onNoteClear: () => onUpdate(section.stanzas, section.bpm, undefined),
      }),
      React.createElement('div', { style: { height: 1, background: 'var(--rule)', margin: '4px 0' } }),
      ...section.stanzas.map((st, i) =>
        React.createElement('div', { key: i },
          React.createElement('div', {
            style: { fontSize: 12, color: 'var(--muted)', marginBottom: 4, cursor: 'pointer' },
            onClick: () => setExpandedStanzaIdx(expandedStanzaIdx === i ? null : i),
          }, `Stanza ${i + 1} — ${st.bars} bars ${st.num}/${st.denom} ${expandedStanzaIdx === i ? '▾' : '▸'}`),
          expandedStanzaIdx === i && React.createElement(StanzaExpanded, {
            stanza: st, effectiveBpm: effectiveBpm(st), effectiveNote: effectiveNote(st),
            onChange: (updated) => updateStanza(i, updated),
            onDelete: () => deleteStanza(i),
            onDuplicate: () => duplicateStanza(i),
          }),
        )
      ),
      React.createElement('button', { className: 'chip', onClick: addStanza, style: { alignSelf: 'flex-start', fontSize: 13 } }, '+ stanza'),
      onDelete && React.createElement('button', {
        className: 'chip', onClick: onDelete,
        style: { alignSelf: 'flex-end', fontSize: 13, color: 'var(--accent)', borderColor: 'var(--accent)' },
        title: `Delete section ${section.letter}`,
      }, '× delete section'),
    ),
  );
}

// ── RunBar ────────────────────────────────────────────────────
function RunBar({ onRun, disabled, loading }) {
  return React.createElement('div', {
    style: {
      position: 'sticky', bottom: 0, background: 'var(--surface-alt)',
      borderTop: '1px solid var(--rule)', padding: '12px 16px',
      display: 'flex', justifyContent: 'center',
    }
  },
    React.createElement('button', {
      className: 'primary', onClick: onRun, disabled: disabled || loading,
      style: { width: '100%', maxWidth: 360, fontSize: 18, minHeight: 56 },
    }, loading ? 'Writing…' : 'RUN ▸ play w/ click'),
  );
}

// ── Buttons (shared) ──────────────────────────────────────────
const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  border: 'none', fontFamily: 'var(--font-body)', fontWeight: 600,
  cursor: 'pointer', touchAction: 'manipulation', transition: 'all 0.15s ease',
};

function BtnPrimary({ children, onClick, disabled, style, ...rest }) {
  return React.createElement('button', {
    onClick, disabled,
    style: { ...btnBase, padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: '#fff', fontSize: 15, minHeight: 48, opacity: disabled ? 0.45 : 1, ...style },
    ...rest
  }, children);
}

function BtnSecondary({ children, onClick, disabled, style, ...rest }) {
  return React.createElement('button', {
    onClick, disabled,
    style: { ...btnBase, padding: '12px 20px', borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)', color: 'var(--ink)', fontSize: 14, border: '1px solid var(--rule)', minHeight: 44, opacity: disabled ? 0.45 : 1, ...style },
    ...rest
  }, children);
}

function BtnGhost({ children, onClick, style, ...rest }) {
  return React.createElement('button', {
    onClick,
    style: { ...btnBase, padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--muted)', fontSize: 13, border: 'none', ...style },
    ...rest
  }, children);
}

// ── UndoToast ─────────────────────────────────────────────────
function UndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return React.createElement('div', {
    style: {
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', background: 'var(--surface-raised)', color: 'var(--ink)',
      border: '1px solid var(--rule)', borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-body)', fontSize: 14, zIndex: 100,
      maxWidth: 'calc(100vw - 32px)',
    }
  },
    React.createElement('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, message),
    React.createElement('button', {
      onClick: onUndo,
      style: { ...btnBase, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: '#fff', fontSize: 13, border: 'none', minHeight: 28 },
    }, 'Undo'),
  );
}

// ── SimpleSongView ────────────────────────────────────────────
function SimpleSongView({ bpm, onBpmChange, num, denom, onTimeSigChange, note, onNoteChange }) {
  return React.createElement('div', { style: { padding: '0 16px' } },
    React.createElement('div', { style: { background: 'var(--surface-alt)', borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--rule)' } },
      // Tempo
      React.createElement(TempoEditor, {
        bpm, note: note || 'q', bpmOverridden: true, noteOverridden: true,
        onBpmChange, onNoteChange: onNoteChange || (() => {}),
      }),
      React.createElement('div', { style: { height: 16 } }),
      // Time Sig
      React.createElement('label', { style: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 } }, 'TIME SIGNATURE'),
      React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
        ...TS_PRESETS.map(([n,d]) => {
          const active = num === n && denom === d;
          return React.createElement('button', {
            key: `${n}/${d}`, className: active ? 'chip solid' : 'chip',
            onClick: () => onTimeSigChange(n, d),
            style: { minHeight: 36, padding: '6px 12px', fontSize: 14 },
          }, `${n}/${d}`);
        }),
        React.createElement(TimeSigInput, { num, denom, onChange: onTimeSigChange }),
      ),
    ),
  );
}

// ── ComplexSongView (full SongEditorPresentation) ─────────────
function ComplexSongView({ song, onUpdateSong }) {
  // song: { name, sections[], songForms[], activeFormId }
  const activeForm = song.songForms.find(f => f.id === song.activeFormId) || song.songForms[0];
  const [pendingDeleteForm, setPendingDeleteForm] = useState(null);

  if (!activeForm) {
    return React.createElement('div', { style: { padding: '16px', color: 'var(--muted)' } },
      'No song forms yet. ',
      React.createElement('button', { className: 'chip', onClick: () => onUpdateSong('createForm'), style: { marginLeft: 8 } }, '+ Create form'),
    );
  }

  const definedLetters = song.sections.map(s => s.letter);
  const sectionsByLetter = Object.fromEntries(song.sections.map(s => [s.letter, s]));
  const unresolvedLetters = activeForm.pattern.filter(l => !sectionsByLetter[l]);
  const hasUnresolved = unresolvedLetters.length > 0;
  const totalBars = activeForm.pattern.reduce((acc, letter) => {
    const sec = sectionsByLetter[letter];
    return acc + (sec ? sec.stanzas.reduce((a, st) => a + st.bars, 0) : 0);
  }, 0);
  const nextLetter = ALPHABET.find(l => !definedLetters.includes(l));
  const canAddSection = nextLetter !== undefined;

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', minHeight: '100%' } },
    React.createElement('div', { style: { padding: '0 16px', flex: 1 } },
      // Form tabs
      React.createElement(FormTabs, {
        forms: song.songForms, activeFormId: song.activeFormId,
        onSelect: (id) => onUpdateSong('setActiveForm', id),
        onCreate: () => onUpdateSong('createForm'),
        onDelete: (id) => {
          const form = song.songForms.find(f => f.id === id);
          if (form) setPendingDeleteForm(form);
          onUpdateSong('deleteForm', id);
        },
      }),
      // Pattern string editor
      React.createElement(FormStringEditor, {
        pattern: activeForm.pattern,
        onChange: (letters) => onUpdateSong('updateFormPattern', activeForm.id, letters),
        definedLetters,
      }),
      // Form-level tempo
      React.createElement('div', { style: { margin: '12px 0' } },
        React.createElement(TempoEditor, {
          bpm: activeForm.bpm, note: activeForm.note,
          bpmOverridden: true, noteOverridden: true,
          onBpmChange: (v) => onUpdateSong('updateFormBpm', activeForm.id, v),
          onNoteChange: (v) => onUpdateSong('updateFormNote', activeForm.id, v),
        }),
      ),
      // Total bars
      React.createElement('div', {
        style: { color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 12 }
      },
        `${totalBars} bars total`,
        hasUnresolved && React.createElement('span', { style: { marginLeft: 8, color: 'var(--accent)' } },
          `· unresolved: ${Array.from(new Set(unresolvedLetters)).join(' ')}`),
      ),
      // Sections
      React.createElement('div', { style: { marginTop: 8 } },
        React.createElement('div', { style: { fontSize: 11, letterSpacing: 1, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase' } }, 'Sections'),
        song.sections.length === 0 && React.createElement('div', {
          style: { padding: 10, border: '1px dashed var(--rule)', borderRadius: 'var(--radius-md)', marginBottom: 8, color: 'var(--muted)', fontSize: 13 }
        }, 'No sections yet — tap "+ section" to add one.'),
        ...song.sections.map(section =>
          React.createElement(SectionRow, {
            key: section.letter, section, form: activeForm,
            onUpdate: (stanzas, bpm, note) => onUpdateSong('upsertSection', section.letter, stanzas, bpm, note),
            onDelete: () => onUpdateSong('deleteSection', section.letter),
          })
        ),
        React.createElement('button', {
          className: 'chip', onClick: () => onUpdateSong('addSection', nextLetter),
          disabled: !canAddSection,
          title: canAddSection ? `Add section ${nextLetter}` : 'all 26 letters used',
          style: { marginTop: 4 },
        }, `+ section${canAddSection ? ` ${nextLetter}` : ''}`),
      ),
      React.createElement('div', { style: { height: 80 } }),
    ),
    // RunBar
    React.createElement(RunBar, {
      onRun: () => onUpdateSong('run'),
      disabled: activeForm.pattern.length === 0 || hasUnresolved,
    }),
    pendingDeleteForm && React.createElement(UndoToast, {
      message: `Deleted form "${pendingDeleteForm.name}"`,
      onUndo: () => { onUpdateSong('undoDeleteForm', pendingDeleteForm); setPendingDeleteForm(null); },
      onDismiss: () => setPendingDeleteForm(null),
    }),
  );
}

Object.assign(window, {
  REHEARSAL_TYPES, MOCK_SETLIST, ALPHABET, NOTE_ORDER, TS_PRESETS,
  parsePattern, getLetterColor,
  IconMic, IconPlay, IconStop, IconChevron, IconPlus, IconMetronome,
  NoteGlyph, TimeSigStack, TimeSigInput, LetterBadge, Stepper,
  TempoEditor, StanzaCompact, StanzaExpanded,
  FormTabs, FormStringEditor, SectionRow, RunBar, UndoToast,
  BtnPrimary, BtnSecondary, BtnGhost, btnBase,
  SimpleSongView, ComplexSongView,
});
