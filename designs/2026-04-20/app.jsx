const { useState, useEffect, useRef, useCallback } = React;

// ── App ───────────────────────────────────────────────────────
function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [songName, setSongName] = useState(`Untitled ${today}`);
  const [songMode, setSongMode] = useState('simple'); // simple | complex
  const [rehearsalType, setRehearsalType] = useState(REHEARSAL_TYPES[0]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [transportStatus, setTransportStatus] = useState('idle'); // idle | discussion | take | playback
  const [elapsed, setElapsed] = useState(0);
  const [metronome, setMetronome] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('rt-theme') || 'light');
  const [takes, setTakes] = useState([]);
  const [currentTakeIdx, setCurrentTakeIdx] = useState(null);
  const [discussionCount, setDiscussionCount] = useState(0);
  const [takeCount, setTakeCount] = useState(0);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [setlist] = useState(MOCK_SETLIST);
  const [bpm, setBpm] = useState(120);
  const [note, setNote] = useState('q');
  const [num, setNum] = useState(4);
  const [denom, setDenom] = useState(4);

  // Complex mode song state
  const [song, setSong] = useState({
    name: '', sections: [],
    songForms: [{ id: 'f1', name: 'Form 1', bpm: 120, note: 'q', pattern: [] }],
    activeFormId: 'f1',
  });
  const nextFormId = useRef(2);

  // Sync song name into song object
  useEffect(() => { setSong(s => ({ ...s, name: songName })); }, [songName]);

  const handleSongUpdate = useCallback((...args) => {
    const [action, ...params] = args;
    setSong(prev => {
      const s = { ...prev, sections: [...prev.sections], songForms: [...prev.songForms] };
      const activeForm = s.songForms.find(f => f.id === s.activeFormId) || s.songForms[0];
      switch (action) {
        case 'setActiveForm': s.activeFormId = params[0]; break;
        case 'createForm': {
          const id = 'f' + (nextFormId.current++);
          s.songForms.push({ id, name: `Form ${s.songForms.length + 1}`, bpm: 120, note: 'q', pattern: [] });
          s.activeFormId = id;
          break;
        }
        case 'deleteForm': s.songForms = s.songForms.filter(f => f.id !== params[0]);
          if (s.activeFormId === params[0]) s.activeFormId = s.songForms[0]?.id || null;
          break;
        case 'updateFormPattern': s.songForms = s.songForms.map(f => f.id === params[0] ? { ...f, pattern: params[1] } : f); break;
        case 'updateFormBpm': s.songForms = s.songForms.map(f => f.id === params[0] ? { ...f, bpm: params[1] } : f); break;
        case 'updateFormNote': s.songForms = s.songForms.map(f => f.id === params[0] ? { ...f, note: params[1] } : f); break;
        case 'upsertSection': {
          const [letter, stanzas, secBpm, secNote] = params;
          const idx = s.sections.findIndex(sec => sec.letter === letter);
          const sec = { letter, stanzas, bpm: secBpm, note: secNote };
          if (idx >= 0) s.sections[idx] = sec; else s.sections.push(sec);
          break;
        }
        case 'deleteSection': s.sections = s.sections.filter(sec => sec.letter !== params[0]); break;
        case 'addSection': {
          const letter = params[0];
          if (letter) s.sections.push({ letter, stanzas: [{ bars: 8, num: 4, denom: 4 }] });
          break;
        }
        case 'run': break; // no-op in prototype
        case 'undoDeleteForm': {
          const form = params[0];
          if (form) { s.songForms.push(form); s.activeFormId = form.id; }
          break;
        }
      }
      return s;
    });
  }, []);

  const timerRef = useRef(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rt-theme', theme);
  }, [theme]);

  // Elapsed timer
  useEffect(() => {
    if (transportStatus === 'discussion' || transportStatus === 'take') {
      const start = Date.now() - elapsedRef.current * 1000;
      timerRef.current = setInterval(() => {
        const val = (Date.now() - start) / 1000;
        elapsedRef.current = val;
        setElapsed(val);
      }, 200);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [transportStatus]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Actions ─────────────────────────────────────────────────
  const startRehearsal = () => {
    const dc = 1;
    setDiscussionCount(dc);
    setTakeCount(0);
    setTakes([{ type: 'discussion', num: dc, songName, duration: 0 }]);
    setCurrentTakeIdx(null);
    setTransportStatus('discussion');
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const startTake = () => {
    const tc = takeCount + 1;
    setTakeCount(tc);
    setTakes(prev => [...prev, { type: 'take', num: tc, songName, duration: 0 }]);
    setCurrentTakeIdx(null);
    setTransportStatus('take');
    setMetronome(true);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const endTake = () => {
    const dc = discussionCount + 1;
    setDiscussionCount(dc);
    setTakes(prev => [...prev, { type: 'discussion', num: dc, songName, duration: 0 }]);
    setCurrentTakeIdx(null);
    setTransportStatus('discussion');
    setMetronome(false);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const selectTake = (idx) => {
    setCurrentTakeIdx(idx);
    setTransportStatus('playback');
  };

  const stopPlayback = () => {
    setTransportStatus('discussion');
    setCurrentTakeIdx(null);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const endRehearsal = () => {
    setTransportStatus('idle');
    setTakes([]);
    setTakeCount(0);
    setDiscussionCount(0);
    setMetronome(false);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  const pickSong = (song) => {
    setSongName(song.name);
    setBpm(song.bpm);
    setShowSongPicker(false);
  };

  // ── Status config ───────────────────────────────────────────
  const statusConfig = {
    discussion: { bg: 'var(--amber-soft)', color: 'var(--amber)', label: 'Discussion', dot: 'var(--amber)' },
    take: { bg: 'var(--accent-soft)', color: 'var(--accent)', label: `Take ${takeCount}`, dot: 'var(--accent)' },
    playback: { bg: 'var(--green-soft)', color: 'var(--green)', label: 'Playback', dot: 'var(--green)' },
    idle: { bg: 'var(--surface-alt)', color: 'var(--muted)', label: 'Ready', dot: 'var(--faint)' },
  };
  const st = statusConfig[transportStatus];

  // Toggle discussion <-> take
  const toggleStatus = () => {
    if (transportStatus === 'discussion') startTake();
    else if (transportStatus === 'take') endTake();
  };

  // ── Header ──────────────────────────────────────────────────
  const header = React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderBottom: '1px solid var(--rule)',
      background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50,
    }
  },
    // Rehearsal type
    React.createElement('button', {
      onClick: () => setShowTypePicker(true),
      style: {
        display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-alt)',
        border: '1px solid var(--rule)', borderRadius: 'var(--radius-pill)',
        cursor: 'pointer', padding: '7px 12px', flexShrink: 0,
        fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)',
      }
    },
      React.createElement('span', { style: { fontSize: 15 } }, rehearsalType.id === 'full-band' ? '🎸' : '🎹'),
      rehearsalType.name,
      React.createElement(IconChevron, { size: 10, color: 'var(--muted)', direction: 'down' }),
    ),
    // Status badge — fills remaining space
    React.createElement('button', {
      onClick: (transportStatus === 'discussion' || transportStatus === 'take') ? toggleStatus : undefined,
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-pill)',
        background: st.bg, border: '1.5px solid ' + (transportStatus === 'idle' ? 'var(--rule)' : st.color),
        cursor: (transportStatus === 'discussion' || transportStatus === 'take') ? 'pointer' : 'default',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: st.color,
        transition: 'all 0.2s ease',
      }
    },
      React.createElement('span', { style: {
        width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0,
        animation: transportStatus === 'take' ? 'pulse 1.5s ease infinite' : transportStatus === 'discussion' ? 'pulse 2s ease infinite' : 'none',
      }}),
      transportStatus === 'idle' ? 'Not started' : st.label,
      transportStatus !== 'idle' && React.createElement('span', {
        style: { fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.7 }
      }, formatTime(elapsed)),
    ),
    // Hamburger
    React.createElement('button', {
      onClick: () => setMenuOpen(!menuOpen),
      style: {
        background: 'none', border: 'none', padding: 6, cursor: 'pointer',
        color: 'var(--ink)', display: 'flex', fontSize: 22, lineHeight: 1, flexShrink: 0,
      }
    }, '☰'),
  );

  // ── Song picker overlay ─────────────────────────────────────
  const songPickerOverlay = showSongPicker && React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end',
    },
    onClick: (e) => { if (e.target === e.currentTarget) setShowSongPicker(false); },
  },
    React.createElement('div', {
      style: {
        width: '100%', maxHeight: '70vh', background: 'var(--surface-raised)',
        borderRadius: '16px 16px 0 0', overflow: 'auto', padding: '16px',
      }
    },
      React.createElement('div', {
        style: { width: 36, height: 4, borderRadius: 2, background: 'var(--faint)', margin: '0 auto 14px' }
      }),
      React.createElement('h3', { style: { fontSize: 18, fontWeight: 700, marginBottom: 12 } }, 'Choose a Song'),
      React.createElement('button', {
        onClick: () => {
          const name = `Untitled ${today}`;
          setSongName(name); setBpm(120); setShowSongPicker(false);
        },
        style: {
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '12px 14px', background: 'transparent',
          border: '1.5px dashed var(--rule)', borderRadius: 'var(--radius-md)',
          cursor: 'pointer', marginBottom: 8, color: 'var(--muted)',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
        }
      }, React.createElement(IconPlus, { size: 16, color: 'var(--muted)' }), 'New Song'),
      ...setlist.map(song =>
        React.createElement('button', {
          key: song.id,
          onClick: () => pickSong(song),
          style: {
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '12px 14px', background: 'var(--surface)',
            border: '1px solid var(--rule)', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', textAlign: 'left', marginBottom: 6,
            fontFamily: 'var(--font-body)',
          }
        },
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--ink)' } }, song.name),
            React.createElement('div', { style: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 } }, `${song.bpm} BPM · ${song.timeSig}`),
          ),
        )
      ),
    ),
  );

  // ── Rehearsal type picker overlay ───────────────────────────
  const typePickerOverlay = showTypePicker && React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end',
    },
    onClick: (e) => { if (e.target === e.currentTarget) setShowTypePicker(false); },
  },
    React.createElement('div', {
      style: {
        width: '100%', background: 'var(--surface-raised)',
        borderRadius: '16px 16px 0 0', padding: '16px',
      }
    },
      React.createElement('div', {
        style: { width: 36, height: 4, borderRadius: 2, background: 'var(--faint)', margin: '0 auto 14px' }
      }),
      React.createElement('h3', { style: { fontSize: 18, fontWeight: 700, marginBottom: 12 } }, 'Rehearsal Type'),
      ...REHEARSAL_TYPES.map(rt =>
        React.createElement('button', {
          key: rt.id,
          onClick: () => { setRehearsalType(rt); setShowTypePicker(false); },
          style: {
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '14px 16px', background: rt.id === rehearsalType.id ? 'var(--accent-soft)' : 'var(--surface)',
            border: '1px solid ' + (rt.id === rehearsalType.id ? 'var(--accent)' : 'var(--rule)'),
            borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
            marginBottom: 6, fontFamily: 'var(--font-body)',
          }
        },
          React.createElement('span', { style: { fontSize: 20 } }, rt.id === 'full-band' ? '🎸' : '🎹'),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--ink)' } }, rt.name),
            React.createElement('div', { style: { fontSize: 13, color: 'var(--muted)', marginTop: 2 } }, rt.desc),
          ),
        )
      ),
    ),
  );

  // ── Playback drawer ─────────────────────────────────────────
  const playbackDrawer = React.createElement('div', {
    style: {
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 150,
      transform: playbackOpen ? 'translateY(0)' : 'translateY(calc(100% - 28px))',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: playbackOpen || takes.length > 0 ? 'auto' : 'none',
      opacity: takes.length > 0 ? 1 : 0,
    }
  },
    // Pull tab
    React.createElement('div', {
      onClick: () => setPlaybackOpen(!playbackOpen),
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '6px 0', cursor: 'pointer', background: 'var(--surface-raised)',
        borderTop: '1px solid var(--rule)', borderRadius: '12px 12px 0 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }
    },
      React.createElement('div', {
        style: { width: 28, height: 3, borderRadius: 2, background: 'var(--faint)' }
      }),
      React.createElement('span', {
        style: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', marginLeft: 4 }
      }, `${takes.length} clips`),
      React.createElement(IconChevron, { size: 12, color: 'var(--muted)', direction: playbackOpen ? 'down' : 'up' }),
    ),
    // Drawer content
    React.createElement('div', {
      style: {
        background: 'var(--surface-raised)', padding: '8px 16px 16px',
        maxHeight: '40vh', overflowY: 'auto',
        borderTop: '1px solid var(--rule)',
      }
    },
      // Take pills
      React.createElement('div', {
        style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }
      },
        ...takes.map((t, i) =>
          React.createElement('button', {
            key: i,
            onClick: () => selectTake(i),
            style: {
              ...btnBase, padding: '6px 14px', borderRadius: 'var(--radius-pill)',
              fontSize: 13, fontFamily: 'var(--font-mono)', minHeight: 32,
              background: i === currentTakeIdx ? (t.type === 'take' ? 'var(--accent)' : 'var(--amber)') : 'var(--surface-alt)',
              color: i === currentTakeIdx ? '#fff' : 'var(--ink)',
              border: '1px solid ' + (i === currentTakeIdx ? 'transparent' : 'var(--rule)'),
            }
          },
            t.type === 'discussion' ? `💬 D${t.num}` : `🎵 T${t.num}`,
            t.songName !== songName && React.createElement('span', {
              style: { fontSize: 10, color: i === currentTakeIdx ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginLeft: 4 }
            }, t.songName),
          )
        ),
      ),
      // End rehearsal button in drawer
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }
      },
        React.createElement('button', {
          onClick: endRehearsal,
          style: {
            ...btnBase, padding: '6px 14px', borderRadius: 'var(--radius-pill)',
            background: 'transparent', border: '1px solid var(--rule)',
            color: 'var(--accent)', fontSize: 12, minHeight: 28,
            fontFamily: 'var(--font-body)',
          },
        }, '⏏ End Rehearsal'),
      ),
      // Playback controls
      transportStatus === 'playback' && React.createElement('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
          background: 'var(--green-soft)', borderRadius: 'var(--radius-md)',
        }
      },
        React.createElement('span', { style: {
          width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
        }}),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: 'var(--green)', flex: 1 } },
          `Playing ${takes[currentTakeIdx]?.type === 'discussion' ? 'D' : 'T'}${takes[currentTakeIdx]?.num ?? ''}`,
        ),
        React.createElement('button', {
          onClick: stopPlayback,
          style: {
            ...btnBase, padding: '6px 14px', borderRadius: 'var(--radius-pill)',
            background: 'var(--green)', color: '#fff', fontSize: 13, minHeight: 32,
            border: 'none',
          }
        }, React.createElement(IconStop, { size: 14, color: '#fff' }), 'Stop'),
      ),
    ),
  );

  // ── Transport bar ───────────────────────────────────────────
  const transportBar = React.createElement('div', {
    style: {
      position: 'fixed', bottom: takes.length > 0 ? 28 : 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--surface-raised)', borderTop: '1px solid var(--rule)',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      transition: 'bottom 0.3s ease',
    }
  },


    // Action row
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 12px',
      }
    },
      // Main action button
      transportStatus === 'idle' && React.createElement(BtnPrimary, {
        onClick: startRehearsal, style: { flex: 1 }
      }, React.createElement(IconMic, { size: 18, color: '#fff' }), 'Start Rehearsal'),

      transportStatus === 'discussion' && React.createElement(BtnPrimary, {
        onClick: startTake, style: { flex: 1 }
      }, React.createElement(IconMetronome, { size: 18, color: '#fff', active: true }), 'Start Take'),

      transportStatus === 'take' && React.createElement(BtnPrimary, {
        onClick: endTake, style: { flex: 1, background: 'var(--ink)' }
      }, React.createElement(IconStop, { size: 16, color: 'var(--surface)' }), 'End Take'),

      transportStatus === 'playback' && React.createElement(BtnPrimary, {
        onClick: stopPlayback, style: { flex: 1, background: 'var(--green)' }
      }, React.createElement(IconStop, { size: 16, color: '#fff' }), 'Stop'),

      // Metronome toggle (always visible)
      React.createElement('button', {
        onClick: () => setMetronome(!metronome),
        style: {
          ...btnBase, width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: metronome ? 'var(--accent-soft)' : 'var(--surface-alt)',
          border: '1px solid ' + (metronome ? 'var(--accent)' : 'var(--rule)'),
          color: metronome ? 'var(--accent)' : 'var(--muted)', flexShrink: 0,
        }
      }, React.createElement(IconMetronome, { size: 20, color: metronome ? 'var(--accent)' : 'var(--muted)', active: metronome })),
    ),
  );

  // ── Transport height spacer ─────────────────────────────────
  const transportHeight = takes.length > 0 ? 130 : 102;

  // ── Main render ─────────────────────────────────────────────
  return React.createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh', minHeight: '100dvh',
      paddingBottom: transportHeight,
    }
  },
    header,

    React.createElement('div', { style: { flex: 1, paddingTop: 12, overflowY: 'auto' } },
      // Song name (editable)
      React.createElement('div', { style: { padding: '0 16px', marginBottom: 8 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('input', {
            type: 'text', value: songName,
            onChange: (e) => setSongName(e.target.value),
            style: {
              flex: 1, background: 'transparent', border: 'none',
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              color: 'var(--ink)', padding: '4px 0', outline: 'none',
              borderBottom: '2px solid transparent',
            },
            onFocus: (e) => e.target.style.borderBottomColor = 'var(--accent)',
            onBlur: (e) => e.target.style.borderBottomColor = 'transparent',
          }),
          React.createElement('button', {
            onClick: () => setShowSongPicker(true),
            style: {
              ...btnBase, padding: '6px 12px', borderRadius: 'var(--radius-pill)',
              background: 'var(--surface-alt)', border: '1px solid var(--rule)',
              fontSize: 12, color: 'var(--muted)', flexShrink: 0, minHeight: 32,
              fontFamily: 'var(--font-body)',
            }
          }, 'Setlist'),
        ),
      ),

      // Mode toggle
      React.createElement('div', { style: { padding: '0 16px', marginBottom: 16 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
          React.createElement('button', {
            onClick: () => setSongMode('simple'),
            style: {
              padding: '7px 16px', borderRadius: 'var(--radius-pill)',
              border: '1px solid ' + (songMode === 'simple' ? 'var(--accent)' : 'var(--rule)'),
              background: songMode === 'simple' ? 'var(--accent-soft)' : 'transparent',
              color: songMode === 'simple' ? 'var(--accent)' : 'var(--muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }
          }, 'Simple'),
          React.createElement('button', {
            onClick: () => setSongMode('complex'),
            style: {
              padding: '7px 16px', borderRadius: 'var(--radius-pill)',
              border: '1px solid ' + (songMode === 'complex' ? 'var(--accent)' : 'var(--rule)'),
              background: songMode === 'complex' ? 'var(--accent-soft)' : 'transparent',
              color: songMode === 'complex' ? 'var(--accent)' : 'var(--muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }
          }, 'Complex'),
        ),
      ),

      // Song editor
      songMode === 'simple'
        ? React.createElement(SimpleSongView, {
            bpm, onBpmChange: setBpm,
            num, denom, onTimeSigChange: (n, d) => { setNum(n); setDenom(d); },
            note, onNoteChange: setNote,
          })
        : React.createElement(ComplexSongView, { song, onUpdateSong: handleSongUpdate }),


    ),

    // Transport
    transportBar,
    // Playback drawer (sits behind transport, peeks up as a tab)
    playbackDrawer,
    // Overlays
    songPickerOverlay,
    typePickerOverlay,
    // Hamburger menu
    menuOpen && React.createElement('div', {
      style: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' },
      onClick: (e) => { if (e.target === e.currentTarget) setMenuOpen(false); },
    },
      React.createElement('div', {
        style: {
          position: 'absolute', top: 0, right: 0, width: 260, height: '100%',
          background: 'var(--surface-raised)', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          padding: '16px', display: 'flex', flexDirection: 'column', gap: 4,
        }
      },
        React.createElement('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
        },
          React.createElement('span', { style: { fontWeight: 700, fontSize: 16 } }, 'Menu'),
          React.createElement('button', {
            onClick: () => setMenuOpen(false),
            style: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', padding: 4 }
          }, '✕'),
        ),
        // Main View
        React.createElement('button', {
          onClick: () => { setMenuOpen(false); },
          style: {
            ...btnBase, padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            fontSize: 14, color: 'var(--accent)', justifyContent: 'flex-start', width: '100%',
            fontWeight: 700,
          }
        }, '🎵 Main View'),
        // Theme
        React.createElement('button', {
          onClick: () => { toggleTheme(); },
          style: {
            ...btnBase, padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-alt)', border: '1px solid var(--rule)',
            fontSize: 14, color: 'var(--ink)', justifyContent: 'flex-start', width: '100%',
          }
        }, theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'),
        // Divider
        React.createElement('div', { style: { height: 1, background: 'var(--rule)', margin: '8px 0' } }),
        // Advanced header
        React.createElement('button', {
          onClick: () => setShowAdvanced(!showAdvanced),
          style: {
            ...btnBase, padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'transparent', border: 'none',
            fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)',
            justifyContent: 'flex-start', width: '100%', gap: 6,
          }
        },
          React.createElement(IconChevron, { size: 14, color: 'var(--muted)', direction: showAdvanced ? 'down' : 'right' }),
          'ADVANCED',
        ),
        showAdvanced && React.createElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }
        },
          React.createElement(BtnSecondary, { style: { fontSize: 13, justifyContent: 'flex-start', width: '100%' } }, 'Regions'),
          React.createElement(BtnSecondary, { style: { fontSize: 13, justifyContent: 'flex-start', width: '100%' } }, 'Mixdown'),
          React.createElement(BtnSecondary, { style: { fontSize: 13, justifyContent: 'flex-start', width: '100%' } }, 'Transport'),
          React.createElement(BtnSecondary, { style: { fontSize: 13, justifyContent: 'flex-start', width: '100%' } }, 'Debug Log'),
        ),
      ),
    ),
  );
}

// ── Tweaks ────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 18,
  "borderRadius": 12,
  "fontScale": 1
}/*EDITMODE-END*/;

function TweaksPanel({ visible, values, onChange }) {
  if (!visible) return null;
  return React.createElement('div', {
    style: {
      position: 'fixed', top: 60, right: 12, zIndex: 300,
      width: 220, background: 'var(--surface-raised)', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
      padding: 14, fontSize: 13,
    }
  },
    React.createElement('div', { style: { fontWeight: 700, marginBottom: 10, fontSize: 14 } }, 'Tweaks'),
    React.createElement('label', { style: { display: 'block', color: 'var(--muted)', fontSize: 11, marginBottom: 4 } }, 'Accent hue'),
    React.createElement('input', {
      type: 'range', min: 0, max: 360, value: values.accentHue,
      onChange: (e) => onChange({ accentHue: +e.target.value }),
      style: { width: '100%', marginBottom: 12, accentColor: 'var(--accent)' },
    }),
    React.createElement('label', { style: { display: 'block', color: 'var(--muted)', fontSize: 11, marginBottom: 4 } }, 'Border radius'),
    React.createElement('input', {
      type: 'range', min: 0, max: 24, value: values.borderRadius,
      onChange: (e) => onChange({ borderRadius: +e.target.value }),
      style: { width: '100%', marginBottom: 12, accentColor: 'var(--accent)' },
    }),
    React.createElement('label', { style: { display: 'block', color: 'var(--muted)', fontSize: 11, marginBottom: 4 } }, 'Font scale'),
    React.createElement('input', {
      type: 'range', min: 0.8, max: 1.3, step: 0.05, value: values.fontScale,
      onChange: (e) => onChange({ fontScale: +e.target.value }),
      style: { width: '100%', accentColor: 'var(--accent)' },
    }),
  );
}

// ── Root ──────────────────────────────────────────────────────
function Root() {
  const [tweaksVisible, setTweaksVisible] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--radius-md', tweaks.borderRadius + 'px');
    r.style.setProperty('--radius-lg', (tweaks.borderRadius + 4) + 'px');
    r.style.setProperty('--radius-sm', Math.max(4, tweaks.borderRadius - 4) + 'px');
    r.style.fontSize = (15 * tweaks.fontScale) + 'px';
  }, [tweaks]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateTweaks = (partial) => {
    const next = { ...tweaks, ...partial };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: partial }, '*');
  };

  return React.createElement(React.Fragment, null,
    React.createElement(App),
    React.createElement(TweaksPanel, { visible: tweaksVisible, values: tweaks, onChange: updateTweaks }),
  );
}

const styleTag = document.createElement('style');
styleTag.textContent = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`;
document.head.appendChild(styleTag);

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
