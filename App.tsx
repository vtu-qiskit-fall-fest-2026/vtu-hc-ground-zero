import { useState, useRef, useCallback } from 'react';
import './style.css';
import { SimulationResult, BatchResult } from './types';
import { runSimulation, runBatchSimulation } from './api';
import { analyzeSimulation } from './analyst';

import { Header } from './components/Header';
import { Navbar, TabKey } from './components/Navbar';
import { AttackControl } from './components/AttackControl';
import { QberAnalytics } from './components/QberAnalytics';
import { BatchExperiment } from './components/BatchExperiment';
import { PaymentGateway } from './components/PaymentGateway';
import { PostProcessingPanel } from './components/PostProcessingPanel';
import { ExperimentHistory } from './components/ExperimentHistory';
import { AnalystBox } from './components/AnalystBox';
import { DemoMode } from './components/DemoMode';
import { QuantumPlayground } from './components/QuantumPlayground';

type Log = { time: string; title: string; description: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simHistory, setSimHistory] = useState<SimulationResult[]>([]);
  const [batchResults, setBatchResults] = useState<{ [key: string]: BatchResult }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  const seq = useRef(0);

  const addLog = useCallback((title: string, description: string) => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), title, description }, ...prev].slice(0, 8));
  }, []);

  const doRunSimulation = useCallback(async (params: Parameters<typeof runSimulation>[0]) => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try {
      const res = await runSimulation(params);
      if (id !== seq.current) return;
      setResult(res);
      setSimHistory(h => [res, ...h].slice(0, 30));
      addLog(
        `BB84 → ${res.status}`,
        `QBER=${res.qber?.toFixed(2) ?? '—'}% · ${res.sifted}/${res.transmitted} sifted · Scenario: ${res.scenario}`
      );
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [addLog]);

  const doRunBatch = useCallback(async (params: Parameters<typeof runBatchSimulation>[0]) => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try {
      const res = await runBatchSimulation(params);
      if (id !== seq.current) return;
      const key = params.eve
        ? (params.eve_intensity ?? 1) >= 0.99 ? 'eve' : 'partial_eve'
        : params.noise ? 'noise' : 'clean';
      setBatchResults(prev => ({ ...prev, [key]: res }));
      addLog(
        `Batch (${params.runs} runs) → Mean QBER: ${res.mean_qber.toFixed(2)}%`,
        `σ=${res.std_qber.toFixed(2)}% · 95%CI: [${res.ci95_lower}–${res.ci95_upper}%] · Pass: ${res.pass_rate}%`
      );
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [addLog]);

  const analyst = analyzeSimulation(result);

  // Default lab run (for overview quick launch)
  const quickRun = useCallback(async () => {
    await doRunSimulation({ bits: 256, eve: false, noise: false, threshold: 11 });
    setActiveTab('attack');
  }, [doRunSimulation]);

  return (
    <>
      <Header status={result?.status ?? ''} loading={loading} onOpenDemo={() => setShowDemo(true)} />
      <Navbar activeTab={showDemo ? 'overview' : activeTab} onSelectTab={(t) => { setShowDemo(false); setActiveTab(t); }} />

      <main className="shell">
        {/* Demo Mode Overlay */}
        {showDemo && (
          <div>
            <div className="demo-back-row">
              <button className="secondary" onClick={() => setShowDemo(false)}>← BACK TO LAB</button>
            </div>
            <DemoMode onResult={(r) => { setResult(r); setSimHistory(h => [r, ...h].slice(0, 30)); }} />
          </div>
        )}

        {/* Error Banner */}
        {error && !showDemo && (
          <div className="errorbox" role="alert">
            {error} — Ensure FastAPI backend is running at http://127.0.0.1:8000
          </div>
        )}

        {/* Tab: Overview */}
        {!showDemo && activeTab === 'overview' && (
          <div className="overview-layout">
            <section className="hero">
              <div>
                <div className="eyebrow">QUANTUM SECURITY PLATFORM V2.0 <span className="eyebrow-line" /></div>
                <h1>See the attack.<br /><em>Measure the disturbance.</em><br />Understand the decision.</h1>
                <p>QORVEX is an institutional-grade BB84 quantum key distribution simulation and fintech payment security gateway. Explore quantum attacks in real time, run statistical experiments, and evaluate their impact on digital payment authorization.</p>
                <div className="hero-action-row">
                  <button className="primary hero-btn" onClick={quickRun}>▶ LAUNCH QUICK SIMULATION</button>
                  <button className="secondary" onClick={() => setShowDemo(true)}>⚡ ONE-CLICK DEMO MODE</button>
                </div>
              </div>
              <div className="status-box">
                <span>PLATFORM STATUS</span>
                <strong>
                  <i className={`statusdot ${result?.status === 'PASS' ? 'pass' : result?.status === 'ABORT' ? 'abort' : ''}`} />
                  {loading ? 'Computing key exchange...' : result?.status ?? 'Ready'}
                </strong>
                {result && (
                  <div className="status-detail-rows">
                    <div className="status-detail-row">
                      <span>QBER</span><strong>{result.qber?.toFixed(2) ?? '—'}%</strong>
                    </div>
                    <div className="status-detail-row">
                      <span>Scenario</span><strong>{result.scenario}</strong>
                    </div>
                    <div className="status-detail-row">
                      <span>Sifted</span><strong>{result.sifted} / {result.transmitted}</strong>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Metric summary */}
            <div className="metrics">
              {[
                ['BB84 SIMULATION', result?.transmitted ?? '—', 'Transmitted qubits last run'],
                ['SIFTED KEY', result?.sifted ?? '—', 'Matching basis positions'],
                ['MEASURED QBER', result?.qber != null ? result.qber.toFixed(2) + '%' : '—', 'Quantum bit error rate'],
                ['SECURITY DECISION', result?.status ?? 'NONE', 'Session outcome'],
              ].map(([label, value, note]) => (
                <div key={String(label)} className="metric">
                  <small>{label}</small>
                  <strong className={String(value).includes('ABORT') ? 'abort-value' : ''}>{value}</strong>
                  <span>{note}</span>
                </div>
              ))}
            </div>

            {/* Navigation feature cards */}
            <div className="feature-grid">
              {[
                { tab: 'lab' as TabKey, icon: '⌁', title: 'BB84 Lab & Visualizer', desc: 'Photon-by-photon interactive visualization of the quantum key exchange protocol.' },
                { tab: 'attack' as TabKey, icon: '◇', title: 'Attack Control Room', desc: 'Configure Eve interception intensity (0–100%), channel noise, and 6 scenario presets.' },
                { tab: 'analytics' as TabKey, icon: '◉', title: 'QBER Analytics', desc: 'Professional security telemetry with charts, historical comparison, and threshold analysis.' },
                { tab: 'batch' as TabKey, icon: '◈', title: 'Multi-Run Batch', desc: 'Statistical batch experiments with 95% confidence intervals and 3-way scenario comparison.' },
                { tab: 'payment' as TabKey, icon: '₹', title: 'Fintech Gateway', desc: 'Mock quantum-gated payment workflow with visual transaction timeline.' },
                { tab: 'postprocess' as TabKey, icon: '🔑', title: 'Key Post-Processing', desc: 'Error reconciliation, information leakage accounting, and privacy amplification demo.' },
                { tab: 'history' as TabKey, icon: '◌', title: 'Audit Reports', desc: 'SQLite experiment history with JSON, CSV, and branded PDF report exports.' },
              ].map(({ tab, icon, title, desc }) => (
                <button key={tab} className="feature-card" onClick={() => setActiveTab(tab)}>
                  <div className="feature-icon">{icon}</div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </button>
              ))}
            </div>

            {/* Analyst box */}
            {result && <AnalystBox report={analyst} />}

            {/* Event log */}
            {logs.length > 0 && (
              <section className="panel eventlog">
                <div className="panelhead"><strong>Session Event Log</strong><small>ACTIVITY TRACE</small></div>
                {logs.map((l, i) => (
                  <div key={i} className="logrow">
                    <small>{l.time}</small>
                    <div><b>{l.title}</b><span>{l.description}</span></div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* Interactive featured quantum experiment */}
        {!showDemo && activeTab === 'lab' && (
          <QuantumPlayground onResult={r => {setResult(r);setSimHistory(h => [r,...h].slice(0,30));}} />
        )}

        {/* Tab: Attack Control */}
        {!showDemo && activeTab === 'attack' && (
          <div className="tab-section">
            <div className="tab-section-header">
              <h2>LIVE QUANTUM ATTACK CONTROL ROOM</h2>
              <p>Configure intercept-resend attack intensity, channel noise, and scenario presets. All results from Python BB84 engine.</p>
            </div>
            <AttackControl
              onRunSimulation={doRunSimulation}
              result={result}
              loading={loading}
            />
            {result && <AnalystBox report={analyst} />}
          </div>
        )}

        {/* Tab: QBER Analytics */}
        {!showDemo && activeTab === 'analytics' && (
          <div className="tab-section">
            <div className="tab-section-header">
              <h2>ADVANCED QBER SECURITY ANALYTICS</h2>
              <p>Professional telemetry dashboard. Run simulations or batch experiments to populate the charts.</p>
            </div>
            <QberAnalytics
              result={result}
              batchResult={Object.values(batchResults).at(-1) ?? null}
              history={simHistory}
            />
            {result && <AnalystBox report={analyst} />}
          </div>
        )}

        {/* Tab: Batch */}
        {!showDemo && activeTab === 'batch' && (
          <div className="tab-section">
            <div className="tab-section-header">
              <h2>MULTI-RUN QUANTUM SECURITY EXPERIMENT</h2>
              <p>Execute up to 1,000 independent simulations. View statistical distributions, confidence intervals, and multi-scenario comparisons.</p>
            </div>
            <BatchExperiment
              onRunBatch={doRunBatch}
              batchResults={batchResults}
              loading={loading}
            />
          </div>
        )}

        {/* Tab: Payment */}
        {!showDemo && activeTab === 'payment' && (
          <div className="tab-section">
            <div className="tab-section-header">
              <h2>MOCK FINTECH PAYMENT SECURITY GATEWAY</h2>
              <p>Simulated quantum-gated institutional payment workflow. No real funds or banking APIs.</p>
            </div>
            <PaymentGateway result={result} onRun={quickRun} loading={loading} />
          </div>
        )}

        {/* Tab: Post-Processing */}
        {!showDemo && activeTab === 'postprocess' && (
          <div className="tab-section">
            <div className="tab-section-header">
              <h2>BB84 KEY POST-PROCESSING PIPELINE</h2>
              <p>Educational demonstration of parameter estimation, error reconciliation, information leakage accounting, and privacy amplification.</p>
            </div>
            <PostProcessingPanel result={result} />
          </div>
        )}

        {/* Tab: History */}
        {!showDemo && activeTab === 'history' && (
          <div className="tab-section">
            <ExperimentHistory />
          </div>
        )}

        <footer>
          <strong>QORVEX 2.0</strong>
          <p>
            EDUCATIONAL PROTOTYPE ONLY · CLASSICAL SOFTWARE SIMULATION OF BB84 PROTOCOL · NO REAL QUANTUM HARDWARE ·
            NO REAL PAYMENT VERIFICATION · LOW QBER IS NOT PROOF OF CHANNEL SECURITY · PRIVACY AMPLIFICATION, ERROR
            CORRECTION, AND AUTHENTICATED CLASSICAL CHANNELS ARE REQUIRED FOR PRODUCTION QKD · 
            SECURITY AT THE QUANTUM EDGE
          </p>
        </footer>
      </main>
    </>
  );
}
