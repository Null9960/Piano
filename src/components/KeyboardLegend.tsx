export function KeyboardLegend() {
  const rows = [
    { keys: 'Z X C V B N M', notes: 'C D E F G A B (octave 3)' },
    { keys: 'Q W E R T Y U I', notes: 'C D E F G A B C (octave 4-5)' },
    { keys: 'S D  G H J', notes: 'C# D# F# G# A# (sharps oct 3)' },
    { keys: '2 3 5 6 7', notes: 'C# D# F# G# A# (sharps oct 4)' },
  ];

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 20px', maxWidth: 560, width: '100%' }}>
      <p style={{ margin: '0 0 8px', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Keyboard shortcuts</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(({ keys, notes }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(251, 191, 36, 0.7)', minWidth: 140 }}>{keys}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>- {notes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
