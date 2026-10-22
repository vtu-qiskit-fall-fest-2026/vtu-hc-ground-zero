import React, { useState } from 'react';
import { SimulationResult } from '../types';

type AttackControlProps = {
  onRunSimulation: (params: {
    bits: number; eve: boolean; eve_intensity: number; noise: boolean;
    noise_probability: number; threshold: number; seed?: number | null;
  }) => Promise<void>;
  result: SimulationResult | null;
  loading: boolean;
};

const SCENARIOS = [
  { key: 'clean', label: '01 / Clean Channel', eve: false, eveInt: 1.0, noise: false, noiseP: 0.0, description: 'No interceptor or noise. QBER expected ≈ 0%.' },
  { key: 'eve', label: '02 / Full Intercept-Resend', eve: true, eveInt: 1.0, noise: false, noiseP: 0.0, description: 'Eve intercepts every photon. QBER expected ≈ 25% (large samples).' },
  { key: 'partial_eve', label: '03 / Partial Interception', eve: true, eveInt: 0.5, noise: false, noiseP: 0.0, description: '50% Eve interception probability. Expected QBER ≈ 12.5%.' },
  { key: 'noise', label: '04 / Noisy Channel (No Eve)', eve: false, eveInt: 0.0, noise: true, noiseP: 0.1, description: 'Noise-only scenario. Demonstrates QBER rise without an attacker.' },
  { key: 'combined', label: '05 / Eve + Noise', eve: true, eveInt: 1.0, noise: true, noiseP: 0.08, description: 'Full intercept-resend combined with 8% channel noise.' },
  { key: 'custom', label: '06 / Custom Configuration', eve: false, eveInt: 0.0, noise: false, noiseP: 0.0, description: 'Manually configure all parameters.' },
];

const BIT_OPTIONS = [16, 32, 64, 128, 256, 512, 1024, 4096, 10000];

export const AttackControl: React.FC<AttackControlProps> = ({ onRunSimulation, result, loading }) => {
  const [selectedScenario, setSelectedScenario] = useState('clean');
  const [bits, setBits] = useState(256);
  const [eve, setEve] = useState(false);
  const [eveIntensity, setEveIntensity] = useState(100);
  const [noise, setNoise] = useState(false);
  const [noiseP, setNoiseP] = useState(5);
  const [threshold, setThreshold] = useState(11);
  const [seed, setSeed] = useState('');

  const applyScenario = (key: string) => {
    const s = SCENARIOS.find(sc => sc.key === key);
    if (!s || key === 'custom') { setSelectedScenario(key); return; }
    setSelectedScenario(key);
    setEve(s.eve);
    setEveIntensity(Math.round(s.eveInt * 100));
    setNoise(s.noise);
    setNoiseP(Math.round(s.noiseP * 100));
  };

  const handleRun = async () => {
    await onRunSimulation({
      bits,
      eve,
      eve_intensity: eveIntensity / 100,
      noise,
      noise_probability: noiseP / 100,
      threshold,
      seed: seed ? Number(seed) : null
    });
  };

  const scenarioDesc = SCENARIOS.find(s => s.key === selectedScenario)?.description ?? '';

  return (
    <div className="attack-layout">
      {/* Scenario selector column */}
      <aside className="attack-sidebar panel">
        <div className="panelhead">
          <strong>SCENARIO PRESETS</strong>
          <small>ATTACK CONFIGURATION</small>
        </div>
        <div className="scenario-list">
          {SCENARIOS.map(s => (
            <button
              key={s.key}
              className={`scenario-btn ${selectedScenario === s.key ? 'active' : ''}`}
              onClick={() => applyScenario(s.key)}
            >
              <span className="scenario-label">{s.label}</span>
              <span className="scenario-desc">{s.description}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Configuration panel */}
      <div className="attack-main">
        <div className="attack-params panel">
          <div className="panelhead">
            <strong>EXPERIMENT PARAMETERS</strong>
            <small>CONFIG / ATTACK CONTROL</small>
          </div>
          <div className="attack-params-grid">
            {/* Transmission Size */}
            <div className="param-group">
              <label className="param-label">TRANSMISSION SIZE</label>
              <select value={bits} onChange={e => setBits(Number(e.target.value))} className="param-select">
                {BIT_OPTIONS.map(b => <option key={b} value={b}>{b.toLocaleString()} bits</option>)}
              </select>
              <span className="param-hint">Larger sizes give more reliable statistical estimates.</span>
            </div>

            {/* Eve Interception */}
            <div className="param-group">
              <div className="param-toggle-row">
                <label className="param-label">EVE INTERCEPTION</label>
                <button
                  type="button"
                  className={`toggle-badge ${eve ? 'on' : ''}`}
                  onClick={() => { setEve(e => !e); setSelectedScenario('custom'); }}
                >
                  {eve ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>
              <div className="param-slider-row">
                <span className="param-hint">INTENSITY</span>
                <output className="param-output">{eveIntensity}%</output>
              </div>
              <input
                type="range" min={0} max={100} value={eveIntensity} disabled={!eve}
                onChange={e => { setEveIntensity(+e.target.value); setSelectedScenario('custom'); }}
              />
              <span className="param-hint">Full intercept-resend introduces ~25% QBER per intercepted photon.</span>
            </div>

            {/* Channel Noise */}
            <div className="param-group">
              <div className="param-toggle-row">
                <label className="param-label">CHANNEL NOISE</label>
                <button
                  type="button"
                  className={`toggle-badge ${noise ? 'on' : ''}`}
                  onClick={() => { setNoise(n => !n); setSelectedScenario('custom'); }}
                >
                  {noise ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>
              <div className="param-slider-row">
                <span className="param-hint">PROBABILITY</span>
                <output className="param-output">{noiseP}%</output>
              </div>
              <input
                type="range" min={0} max={30} value={noiseP} disabled={!noise}
                onChange={e => { setNoiseP(+e.target.value); setSelectedScenario('custom'); }}
              />
              <span className="param-hint">Bernoulli bit-flip noise model (no attacker presence).</span>
            </div>

            {/* QBER Threshold */}
            <div className="param-group">
              <div className="param-slider-row">
                <label className="param-label">QBER ABORT THRESHOLD</label>
                <output className="param-output">{threshold}%</output>
              </div>
              <input
                type="range" min={5} max={25} value={threshold}
                onChange={e => setThreshold(+e.target.value)}
              />
              <span className="param-hint">Configurable for this demo. Not a universal operational parameter.</span>
            </div>

            {/* Seed */}
            <div className="param-group">
              <label className="param-label">REPRODUCIBLE SEED</label>
              <input
                type="number" min={0} max={4294967295} value={seed}
                placeholder="Leave blank for random"
                onChange={e => setSeed(e.target.value)}
                className="param-input"
              />
              <span className="param-hint">Identical seeds produce identical bit sequences for reproducible demos.</span>
            </div>
          </div>

          {scenarioDesc && <p className="scenario-hint-bar">{scenarioDesc}</p>}

          <div className="attack-actions">
            <button className="primary attack-run-btn" disabled={loading} onClick={handleRun}>
              {loading ? '⟳  COMPUTING KEY EXCHANGE...' : '▶  LAUNCH KEY EXCHANGE'}
            </button>
          </div>
        </div>

        {/* Results panel */}
        {result && (
          <div className="attack-result panel">
            <div className="panelhead">
              <strong>QUANTUM ATTACK OUTCOME</strong>
              <span className={`status-pill ${result.status.toLowerCase()}`}>{result.status}</span>
            </div>
            <div className="attack-result-body">
              <div className="attack-result-grid">
                {[
                  ['Transmitted', result.transmitted],
                  ['Sifted', result.sifted],
                  ['Sample', result.sample_size],
                  ['Mismatches', result.mismatches],
                  ['Key Candidates', result.key_candidates],
                ].map(([k, v]) => (
                  <div key={k} className="attack-stat">
                    <span>{k}</span><strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="attack-qber-display">
                <div>
                  <span className="attack-qber-label">MEASURED QBER</span>
                  <div className={`attack-qber-value ${result.status === 'ABORT' ? 'abort-color' : 'pass-color'}`}>
                    {result.qber != null ? result.qber.toFixed(2) : '—'}%
                  </div>
                </div>
                <div>
                  <span className="attack-qber-label">THEORETICAL</span>
                  <div className="attack-qber-theoretical">{result.theoretical_qber.toFixed(2)}%</div>
                </div>
                <div>
                  <span className="attack-qber-label">THRESHOLD</span>
                  <div className="attack-qber-threshold">{result.threshold}%</div>
                </div>
              </div>
              <div className={`decision ${result.status.toLowerCase()}`}>
                <strong>{result.status}</strong>
                <span>{result.explanation}</span>
              </div>
            </div>

            {/* Bit grid */}
            <div className="bithead">
              <b>Bit-Level Inspection</b>
              <small>{result.bits.length} positions · sample bits highlighted</small>
            </div>
            <div className="bit-grid">
              {result.bits.slice(0, 128).map(b => (
                <div
                  key={b.position}
                  className={`bit ${b.discard ? 'discard' : b.error ? 'error' : 'match'}${b.sample ? ' sampled' : ''}`}
                  title={`#${b.position}: Alice=${b.alice}(${b.alice_basis === 0 ? '+' : '×'}), Bob=${b.bob}(${b.bob_basis === 0 ? '+' : '×'})${b.intercepted ? `, Eve(${b.eve_basis === 0 ? '+' : '×'})` : ''} ${b.discard ? '[DISCARD]' : b.error ? '[ERROR]' : '[MATCH]'}${b.sample ? '[SAMPLE]' : ''}`}
                >
                  <b>{b.discard ? '×' : b.bob}</b>
                  <small>{b.position}</small>
                </div>
              ))}
              {result.bits.length > 128 && (
                <div className="placeholder">+{result.bits.length - 128} more positions</div>
              )}
            </div>
            <div className="legend">
              <span>● Match</span><span>● Error</span><span>● Discarded</span><span>□ QBER Sample</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
