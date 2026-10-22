import React from 'react';
import { SimulationResult } from '../types';

type BitStepVisualizerProps = {
  result: SimulationResult | null;
};

const BASIS_NAMES = ['+ (Rectilinear)', '× (Diagonal)'];
const STATE_CHARS: Record<string, string> = {
  '|0⟩': '↑', '|1⟩': '→', '|+⟩': '↗', '|−⟩': '↖'
};

export const BitStepVisualizer: React.FC<BitStepVisualizerProps> = ({ result }) => {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1200);
  const intervalRef = React.useRef<number | null>(null);

  const bits = result?.bits ?? [];
  const bit = bits[stepIdx] ?? null;

  React.useEffect(() => {
    if (playing && bits.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setStepIdx(prev => {
          if (prev >= bits.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, bits.length, speed]);

  React.useEffect(() => { setStepIdx(0); setPlaying(false); }, [result]);

  if (!result) return (
    <div className="viz-empty">
      <div className="viz-empty-icon">⌁</div>
      <p>Run a simulation in the BB84 Lab or Attack Control to activate the photon-level visualizer.</p>
    </div>
  );

  const eveActive = bit?.intercepted ?? false;
  const basisLabel = (b: number) => BASIS_NAMES[b] ?? '?';
  const stateChar = (s: string) => STATE_CHARS[s] ?? s;

  const stepGroups = [
    { actor: 'Alice', title: 'State Preparation', icon: '◈', detail: bit ? `Alice encodes bit ${bit.alice} in ${basisLabel(bit.alice_basis)} basis → ${bit.alice_state} (${bit.alice_symbol})` : '' },
    { actor: 'Channel', title: 'Quantum Transmission', icon: eveActive ? '◇' : '⌁', detail: eveActive ? `⚠ Eve intercepts. Measures in ${basisLabel(bit?.eve_basis ?? 0)} basis, resends ${bit?.eve_measured ?? '?'}` : 'Photon travels through quantum channel undisturbed.' },
    { actor: 'Bob', title: 'Measurement', icon: '◎', detail: bit ? `Bob measures in ${basisLabel(bit.bob_basis)} basis → result: ${bit.discard ? 'DISCARDED (basis mismatch)' : bit.error ? `ERROR (basis match, bit mismatch! Alice=${bit.alice}, Bob=${bit.bob})` : `MATCH (bit=${bit.bob})`}` : '' },
    { actor: 'Sifting', title: 'Public Basis Comparison', icon: '⇌', detail: bit ? (bit.discard ? 'Alice & Bob publicly announce bases. MISMATCH — position discarded from sifted key.' : 'Alice & Bob publicly announce bases. MATCH — retained in sifted key.') : '' },
    { actor: 'QBER', title: 'Sample Disclosure', icon: '◉', detail: bit ? (bit.sample ? `Position ${bit.position} is in disclosed QBER test sample. ${bit.error ? 'CONTRIBUTES TO ERROR COUNT.' : 'No error at this position.'}` : `Position ${bit.position} retained as key candidate (not disclosed).`) : '' },
  ];

  return (
    <div className="viz-container">
      {/* Protocol flow diagram */}
      <div className="viz-flow-row">
        {['ALICE', eveActive ? 'EVE / CHANNEL' : 'QUANTUM CHANNEL', 'BOB'].map((label, i) => (
          <React.Fragment key={i}>
            <div className={`viz-node ${i === 1 && eveActive ? 'viz-node-alert' : ''} ${i === 1 && !eveActive ? 'viz-node-channel' : ''}`}>
              <div className="viz-node-icon">{i === 0 ? '◈' : i === 1 ? (eveActive ? '◇' : '⌁') : '◎'}</div>
              <strong>{label}</strong>
              {bit && i === 0 && <span className="viz-state-badge">{bit.alice_state} {stateChar(bit.alice_state)}</span>}
              {bit && i === 2 && <span className={`viz-state-badge ${bit.error ? 'error' : bit.discard ? 'discard' : 'match'}`}>{bit.discard ? '× discarded' : bit.error ? '⚠ error' : `✓ ${bit.bob}`}</span>}
            </div>
            {i < 2 && <div className={`viz-arrow ${eveActive ? 'viz-arrow-alert' : ''}`}>⟶</div>}
          </React.Fragment>
        ))}
      </div>

      {/* Current photon detail */}
      {bit && (
        <div className={`viz-photon-card ${bit.discard ? 'discard' : bit.error ? 'error-card' : 'match-card'}`}>
          <div className="viz-photon-header">
            <span className="viz-pos-badge">PHOTON #{bit.position}</span>
            <span className={`viz-status-tag ${bit.discard ? 'tag-discard' : bit.error ? 'tag-error' : 'tag-match'}`}>
              {bit.discard ? 'BASIS MISMATCH · DISCARDED' : bit.error ? 'SIFTED · QBER ERROR' : bit.sample ? 'SIFTED · QBER SAMPLE' : 'SIFTED · KEY CANDIDATE'}
            </span>
            {bit.noise_flipped && <span className="viz-status-tag tag-noise">NOISE FLIP</span>}
          </div>

          <div className="viz-detail-grid">
            <div className="viz-detail-cell">
              <span>Alice bit</span><strong>{bit.alice}</strong>
            </div>
            <div className="viz-detail-cell">
              <span>Alice basis</span><strong>{basisLabel(bit.alice_basis)}</strong>
            </div>
            <div className="viz-detail-cell">
              <span>Alice state</span><strong className="mono">{bit.alice_state} {bit.alice_symbol}</strong>
            </div>
            {bit.intercepted && <div className="viz-detail-cell eve-cell">
              <span>Eve basis</span><strong>{basisLabel(bit.eve_basis ?? 0)}</strong>
            </div>}
            {bit.intercepted && <div className="viz-detail-cell eve-cell">
              <span>Eve measured</span><strong>{bit.eve_measured}</strong>
            </div>}
            <div className="viz-detail-cell">
              <span>Bob basis</span><strong>{basisLabel(bit.bob_basis)}</strong>
            </div>
            <div className="viz-detail-cell">
              <span>Bob result</span><strong>{bit.bob}</strong>
            </div>
          </div>

          <p className="viz-explanation">{stepGroups[2].detail}</p>
        </div>
      )}

      {/* Controls */}
      <div className="viz-controls">
        <button className="viz-btn" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>◀ PREV</button>
        <button className="viz-btn primary-btn" onClick={() => setPlaying(p => !p)}>
          {playing ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button className="viz-btn" onClick={() => setStepIdx(Math.min(bits.length - 1, stepIdx + 1))} disabled={stepIdx >= bits.length - 1}>NEXT ▶</button>

        <div className="viz-speed-row">
          <span className="mono">SPEED</span>
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="viz-speed-select">
            <option value={2000}>0.5×</option>
            <option value={1200}>1×</option>
            <option value={600}>2×</option>
            <option value={200}>5×</option>
          </select>
        </div>

        <span className="viz-progress mono">{stepIdx + 1} / {bits.length} PHOTONS</span>
      </div>

      {/* Mini bit rail */}
      <div className="viz-rail">
        {bits.slice(0, 64).map((b, i) => (
          <button
            key={b.position}
            className={`viz-rail-cell ${b.discard ? 'discard' : b.error ? 'error' : 'match'} ${b.sample ? 'sampled' : ''} ${i === stepIdx ? 'active' : ''}`}
            onClick={() => setStepIdx(i)}
            title={`Position ${b.position}`}
          />
        ))}
        {bits.length > 64 && <span className="mono" style={{ fontSize: '9px', color: 'var(--slate)' }}>+{bits.length - 64} more</span>}
      </div>
    </div>
  );
};
