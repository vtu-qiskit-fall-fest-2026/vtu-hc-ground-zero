import React, { useState } from 'react';
import { BatchResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type BatchExperimentProps = {
  onRunBatch: (params: {
    runs: number; bits: number; eve: boolean; eve_intensity: number;
    noise: boolean; noise_probability: number; threshold: number; seed?: number | null;
  }) => Promise<void>;
  batchResults: { [key: string]: BatchResult };
  loading: boolean;
};

const COMPARE_SCENARIOS = [
  { key: 'clean', label: 'Clean Channel', eve: false, eveInt: 0, noise: false, noiseP: 0 },
  { key: 'eve', label: 'Full Eve Attack', eve: true, eveInt: 1.0, noise: false, noiseP: 0 },
  { key: 'noise', label: 'Noise Only (10%)', eve: false, eveInt: 0, noise: true, noiseP: 0.10 },
];

export const BatchExperiment: React.FC<BatchExperimentProps> = ({ onRunBatch, batchResults, loading }) => {
  const [runs, setRuns] = useState(100);
  const [bits, setBits] = useState(256);
  const [threshold, setThreshold] = useState(11);
  const [seed, setSeed] = useState('');
  const [eve, setEve] = useState(false);
  const [eveInt, setEveInt] = useState(100);
  const [noise, setNoise] = useState(false);
  const [noiseP, setNoiseP] = useState(5);
  const [runningComparison, setRunningComparison] = useState(false);

  const handleRun = async () => {
    await onRunBatch({
      runs, bits, eve, eve_intensity: eveInt / 100,
      noise, noise_probability: noiseP / 100, threshold,
      seed: seed ? Number(seed) : null
    });
  };

  const handleRunComparison = async () => {
    setRunningComparison(true);
    for (const sc of COMPARE_SCENARIOS) {
      await onRunBatch({
        runs, bits, eve: sc.eve, eve_intensity: sc.eveInt,
        noise: sc.noise, noise_probability: sc.noiseP, threshold,
        seed: seed ? Number(seed) : 42
      });
    }
    setRunningComparison(false);
  };

  const latestKey = Object.keys(batchResults).at(-1);
  const latest = latestKey ? batchResults[latestKey] : null;

  // Build side-by-side comparison data
  const comparisonData = COMPARE_SCENARIOS.map(sc => {
    const res = batchResults[sc.key];
    return res ? {
      name: sc.label,
      meanQBER: res.mean_qber,
      ciLow: res.ci95_lower,
      ciHigh: res.ci95_upper,
      passRate: res.pass_rate,
      theoretical: res.theoretical_qber,
    } : null;
  }).filter(Boolean);

  return (
    <div className="batch-layout">
      {/* Control Panel */}
      <div className="batch-controls panel">
        <div className="panelhead">
          <strong>MULTI-RUN EXPERIMENT CONFIGURATION</strong>
          <small>STATISTICAL BATCH ANALYSIS</small>
        </div>
        <div className="batch-params">
          <div className="param-group">
            <label className="param-label">NUMBER OF SIMULATION RUNS</label>
            <div className="run-options">
              {[10, 100, 500, 1000].map(n => (
                <button
                  key={n}
                  className={`run-option-btn ${runs === n ? 'active' : ''}`}
                  onClick={() => setRuns(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="param-group">
            <label className="param-label">BITS PER RUN</label>
            <select value={bits} onChange={e => setBits(Number(e.target.value))} className="param-select">
              {[64, 128, 256, 512, 1024].map(b => <option key={b} value={b}>{b} bits</option>)}
            </select>
          </div>

          <div className="param-group">
            <div className="param-toggle-row">
              <label className="param-label">EVE INTERCEPTION</label>
              <button type="button" className={`toggle-badge ${eve ? 'on' : ''}`} onClick={() => setEve(e => !e)}>
                {eve ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            {eve && <>
              <input type="range" min={0} max={100} value={eveInt} onChange={e => setEveInt(+e.target.value)} />
              <output className="param-output">{eveInt}% intensity</output>
            </>}
          </div>

          <div className="param-group">
            <div className="param-toggle-row">
              <label className="param-label">CHANNEL NOISE</label>
              <button type="button" className={`toggle-badge ${noise ? 'on' : ''}`} onClick={() => setNoise(n => !n)}>
                {noise ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            {noise && <>
              <input type="range" min={0} max={30} value={noiseP} onChange={e => setNoiseP(+e.target.value)} />
              <output className="param-output">{noiseP}% probability</output>
            </>}
          </div>

          <div className="param-group">
            <div className="param-slider-row">
              <label className="param-label">QBER THRESHOLD</label>
              <output className="param-output">{threshold}%</output>
            </div>
            <input type="range" min={5} max={25} value={threshold} onChange={e => setThreshold(+e.target.value)} />
          </div>

          <div className="param-group">
            <label className="param-label">BASE SEED (OPTIONAL)</label>
            <input type="number" value={seed} placeholder="Random" onChange={e => setSeed(e.target.value)} className="param-input" />
            <span className="param-hint">Seeds are incremented per run for independence.</span>
          </div>

          <button className="primary" disabled={loading} onClick={handleRun}>
            {loading ? '⟳ RUNNING...' : `▶ RUN ${runs} SIMULATIONS`}
          </button>
        </div>
      </div>

      {/* Results & Comparison */}
      <div className="batch-results-col">
        {/* Quick comparison button */}
        <div className="batch-comparison-btn-row">
          <button className="secondary" disabled={loading || runningComparison} onClick={handleRunComparison}>
            {runningComparison ? '⟳ RUNNING COMPARISON...' : '◈ RUN 3-WAY COMPARISON (Clean / Eve / Noise)'}
          </button>
        </div>

        {/* Latest batch stats */}
        {latest && (
          <div className="batch-stat-panel panel">
            <div className="panelhead">
              <strong>LATEST BATCH STATISTICS</strong>
              <small>{latest.runs_count} RUNS</small>
            </div>
            <div className="batch-stats-overview">
              {[
                ['Mean QBER', `${latest.mean_qber.toFixed(2)}%`],
                ['Std Deviation', `±${latest.std_qber.toFixed(2)}%`],
                ['95% Conf. Interval', `[${latest.ci95_lower}–${latest.ci95_upper}%]`],
                ['Theoretical', `${latest.theoretical_qber.toFixed(2)}%`],
                ['Min / Max', `${latest.min_qber.toFixed(2)} / ${latest.max_qber.toFixed(2)}%`],
                ['Pass Rate', `${latest.pass_rate}%`],
                ['PASS', latest.pass_count],
                ['ABORT', latest.abort_count],
                ['INSUF.', latest.insufficient_count],
              ].map(([k, v]) => (
                <div key={k} className="batch-stat-cell">
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>

            <div className="batch-ci-note">{latest.confidence_notes}</div>

            {/* Distribution chart */}
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={latest.distribution} margin={{ top: 10, right: 10, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DE" />
                  <XAxis dataKey="bin_label" tick={{ fontSize: 8, fontFamily: 'IBM Plex Mono' }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: any) => [`${v} runs`, 'Count']} />
                  <Bar dataKey="count" fill="#477C78" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3-way comparison */}
        {comparisonData.length === 3 && (
          <div className="panel">
            <div className="panelhead">
              <strong>SCENARIO COMPARISON: CLEAN vs EVE vs NOISE</strong>
              <small>SIDE-BY-SIDE QBER ANALYSIS</small>
            </div>
            <div className="comparison-grid">
              {comparisonData.map((d: any) => (
                <div key={d.name} className="comparison-card">
                  <strong className="comparison-scenario">{d.name}</strong>
                  <div className="comparison-qber">{d.meanQBER.toFixed(2)}%</div>
                  <small>Mean QBER</small>
                  <div className="comparison-ci">CI: [{d.ciLow}–{d.ciHigh}%]</div>
                  <div className="comparison-pass">Pass Rate: {d.passRate}%</div>
                  <div className="comparison-theory">Theory: {d.theoretical}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
