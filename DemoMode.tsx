import React, { useState, useRef } from 'react';
import { SimulationResult } from '../types';
import { runSimulation } from '../api';

type DemoStage = {
  id: number;
  title: string;
  description: string;
  config: Parameters<typeof runSimulation>[0];
  outcome: string;
};

const DEMO_STAGES: DemoStage[] = [
  {
    id: 1, title: 'Stage 1 — Clean Channel',
    description: 'Running ideal BB84 key exchange with no attacker and no noise.',
    config: { bits: 4096, eve: false, noise: false, threshold: 11, seed: 42 },
    outcome: 'Expected: QBER ≈ 0%, Status: PASS'
  },
  {
    id: 2, title: 'Stage 2 — Full Eve Intercept-Resend',
    description: 'Activating full intercept-resend attack. Eve intercepts every photon.',
    config: { bits: 4096, eve: true, eve_intensity: 1.0, noise: false, threshold: 11, seed: 42 },
    outcome: 'Expected: QBER ≈ 25%, Status: ABORT'
  },
  {
    id: 3, title: 'Stage 3 — 50% Partial Interception',
    description: 'Eve intercepts only 50% of photons. Lower but still elevated QBER.',
    config: { bits: 4096, eve: true, eve_intensity: 0.5, noise: false, threshold: 11, seed: 42 },
    outcome: 'Expected: QBER ≈ 12.5%'
  },
  {
    id: 4, title: 'Stage 4 — Channel Noise (No Eve)',
    description: 'No attacker. Classical channel noise alone raises QBER. Security context: noise ≠ eavesdropper.',
    config: { bits: 4096, eve: false, noise: true, noise_probability: 0.10, threshold: 11, seed: 42 },
    outcome: 'Expected: QBER ≈ 10%, demonstrates noise ambiguity'
  },
  {
    id: 5, title: 'Stage 5 — Combined: Eve + Noise',
    description: 'Worst-case: active interception plus physical channel decoherence.',
    config: { bits: 4096, eve: true, eve_intensity: 1.0, noise: true, noise_probability: 0.08, threshold: 11, seed: 42 },
    outcome: 'Expected: QBER > 30%, Status: ABORT'
  },
];

type DemoModeProps = {
  onResult: (res: SimulationResult) => void;
};

export const DemoMode: React.FC<DemoModeProps> = ({ onResult }) => {
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stageResults, setStageResults] = useState<(SimulationResult | null)[]>(new Array(DEMO_STAGES.length).fill(null));
  const [aborted, setAborted] = useState(false);
  const cancelRef = useRef(false);

  const runDemo = async () => {
    setRunning(true); setAborted(false); cancelRef.current = false;
    const results: (SimulationResult | null)[] = new Array(DEMO_STAGES.length).fill(null);
    
    for (let i = 0; i < DEMO_STAGES.length; i++) {
      if (cancelRef.current) { setAborted(true); break; }
      setCurrentStage(i);
      try {
        const res = await runSimulation(DEMO_STAGES[i].config);
        results[i] = res;
        setStageResults([...results]);
        onResult(res);
        await new Promise(r => setTimeout(r, 800)); // brief pause between stages
      } catch (e) {
        console.error(`Demo stage ${i + 1} failed:`, e);
      }
    }
    setRunning(false);
  };

  const cancel = () => { cancelRef.current = true; setRunning(false); };
  const reset = () => { setStageResults(new Array(DEMO_STAGES.length).fill(null)); setCurrentStage(0); setAborted(false); };

  const statusColor = (res: SimulationResult | null) => {
    if (!res) return '#64717A';
    return res.status === 'PASS' ? '#477C78' : '#B7833F';
  };

  return (
    <div className="demo-layout">
      <div className="demo-hero">
        <div className="eyebrow">ONE-CLICK HACKATHON DEMONSTRATION</div>
        <h2>Complete Quantum Security Laboratory Showcase</h2>
        <p>Executes all 5 scenarios automatically with reproducible seeds for reliable presentation.</p>
        <div className="demo-actions">
          {!running ? (
            <button className="primary demo-launch-btn" onClick={runDemo}>
              ⚡ LAUNCH FULL DEMONSTRATION
            </button>
          ) : (
            <button className="secondary" onClick={cancel}>⏹ STOP DEMO</button>
          )}
          {!running && stageResults.some(r => r !== null) && (
            <button className="secondary" onClick={reset}>↺ RESET</button>
          )}
        </div>
        {aborted && <div className="demo-aborted">Demo stopped by user.</div>}
      </div>

      <div className="demo-stages">
        {DEMO_STAGES.map((stage, i) => {
          const res = stageResults[i];
          const isActive = running && currentStage === i;
          const isDone = res !== null;

          return (
            <div
              key={stage.id}
              className={`demo-stage-card ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
            >
              <div className="demo-stage-header">
                <div className="demo-stage-num">0{stage.id}</div>
                <div>
                  <strong className="demo-stage-title">{stage.title}</strong>
                  {isActive && <span className="demo-running-badge">⟳ RUNNING</span>}
                  {isDone && res && <span className="status-pill-inline" style={{ color: statusColor(res) }}>{res.status}</span>}
                </div>
              </div>
              <p className="demo-stage-desc">{stage.description}</p>
              <div className="demo-stage-expected mono">{stage.outcome}</div>

              {res && (
                <div className="demo-stage-result">
                  <div className="demo-result-grid">
                    <span>Measured QBER</span>
                    <strong style={{ color: statusColor(res) }}>{res.qber?.toFixed(2) ?? '—'}%</strong>
                    <span>Theoretical</span>
                    <strong>{res.theoretical_qber.toFixed(2)}%</strong>
                    <span>Sifted Bits</span>
                    <strong>{res.sifted} / {res.transmitted}</strong>
                    <span>Decision</span>
                    <strong style={{ color: statusColor(res) }}>{res.status}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stageResults.every(r => r !== null) && (
        <div className="demo-report-section panel">
          <div className="panelhead">
            <strong>DEMONSTRATION COMPLETE — GENERATE REPORT</strong>
            <small>QORVEX BRANDED SECURITY AUDIT</small>
          </div>
          <div className="demo-report-body">
            <p>All 5 demonstration stages completed. Export a branded QORVEX security audit report.</p>
            <div className="demo-report-actions">
              <a href={`http://127.0.0.1:8000/api/experiments/export/report`} target="_blank" className="primary demo-report-btn">
                📄 OPEN BRANDED SECURITY REPORT
              </a>
              <a href={`http://127.0.0.1:8000/api/experiments/export/csv`} target="_blank" className="secondary">
                ⬇ CSV EXPORT
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
