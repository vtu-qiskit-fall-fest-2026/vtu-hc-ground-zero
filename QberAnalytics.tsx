import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Cell
} from 'recharts';
import { SimulationResult, BatchResult } from '../types';

type QberAnalyticsProps = {
  result: SimulationResult | null;
  batchResult: BatchResult | null;
  history: SimulationResult[];
};

const TEAL = '#477C78';
const AMBER = '#B7833F';
const SLATE = '#64717A';

export const QberAnalytics: React.FC<QberAnalyticsProps> = ({ result, batchResult, history }) => {
  if (!result && !batchResult && history.length === 0) {
    return (
      <div className="analytics-empty">
        <div className="analytics-empty-icon">◉</div>
        <p>Run simulations or a batch experiment to populate the QBER analytics dashboard.</p>
      </div>
    );
  }

  // Multi-run history scatter data
  const historyData = history.slice(0, 30).map((r, i) => ({
    run: i + 1,
    qber: r.qber ?? 0,
    threshold: r.threshold,
    scenario: r.scenario,
    status: r.status,
    theoretical: r.theoretical_qber ?? 0
  }));

  // Batch distribution data
  const distributionData = batchResult?.distribution ?? [];

  // QBER vs threshold comparison (current result)
  const gaugeData = result ? [
    { name: 'Measured QBER', value: result.qber ?? 0, fill: (result.qber ?? 0) > result.threshold ? AMBER : TEAL },
    { name: 'Threshold', value: result.threshold, fill: SLATE }
  ] : [];

  // Theoretical vs observed (from batch)
  const theoreticalVsObserved = batchResult ? [
    { name: 'Theoretical', value: batchResult.theoretical_qber, fill: SLATE },
    { name: 'Observed Mean', value: batchResult.mean_qber, fill: TEAL },
    { name: 'CI Upper', value: batchResult.ci95_upper, fill: AMBER },
  ] : [];

  return (
    <div className="analytics-container">
      {/* Headline Metrics */}
      {result && (
        <div className="metrics">
          {[
            ['BITS TRANSMITTED', result.transmitted, 'Quantum state preparations'],
            ['SIFTED POSITIONS', result.sifted, 'Matching basis positions'],
            ['SAMPLE CHECKED', result.sample_size, 'Disclosed test bits'],
            ['MISMATCHES', result.mismatches, 'Errors in disclosed sample'],
            ['QBER', result.qber != null ? result.qber.toFixed(2) + '%' : '—', `vs ${result.threshold}% threshold`],
            ['KEY CANDIDATES', result.key_candidates, 'Before post-processing'],
          ].map(([label, value, note]) => (
            <div className="metric" key={String(label)}>
              <small>{label}</small>
              <strong className={label === 'QBER' && result.status === 'ABORT' ? 'abort-value' : ''}>{value ?? '—'}</strong>
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Decision Panel */}
      {result && (
        <div className={`analytics-decision decision ${result.status.toLowerCase()}`}>
          <div>
            <strong>SECURITY DECISION: {result.status}</strong>
            <span>{result.explanation}</span>
          </div>
          <div className="analytics-qber-gauge">
            <div className="gauge">
              <div className="fill" style={{ width: `${Math.min(100, (result.qber ?? 0) * 2)}%`, background: result.status === 'ABORT' ? AMBER : TEAL }} />
              <div className="marker" style={{ left: `${result.threshold * 2}%` }} />
            </div>
            <div className="glabels">
              <span>0%</span>
              <span>THRESHOLD {result.threshold}%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
      )}

      {/* QBER vs Threshold Chart */}
      {result && (
        <div className="chart-panel panel">
          <div className="panelhead">
            <strong>QBER vs Threshold Comparison</strong>
            <small>SINGLE RUN</small>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gaugeData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DE" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} domain={[0, Math.max(30, (result.threshold ?? 11) + 5)]} />
                <Tooltip formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}%` : String(v)} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {gaugeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Batch Distribution */}
      {batchResult && (
        <div className="chart-panel panel">
          <div className="panelhead">
            <strong>QBER Distribution ({batchResult.runs_count} runs)</strong>
            <small>EMPIRICAL HISTOGRAM</small>
          </div>
          <div className="chart-body">
            <div className="batch-stats-row">
              {[
                ['Mean QBER', `${batchResult.mean_qber.toFixed(2)}%`],
                ['Std Dev', `±${batchResult.std_qber.toFixed(2)}%`],
                ['95% CI', `[${batchResult.ci95_lower}%, ${batchResult.ci95_upper}%]`],
                ['Theoretical', `${batchResult.theoretical_qber.toFixed(2)}%`],
                ['Pass Rate', `${batchResult.pass_rate}%`],
                ['Min / Max', `${batchResult.min_qber.toFixed(2)} / ${batchResult.max_qber.toFixed(2)}%`],
              ].map(([k, v]) => (
                <div key={k} className="batch-stat-cell">
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distributionData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DE" />
                <XAxis dataKey="bin_label" tick={{ fontSize: 9, fontFamily: 'IBM Plex Mono' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                <Tooltip formatter={(v: any) => `${v} runs`} />
                <Bar dataKey="count" fill={TEAL} radius={[2, 2, 0, 0]} />
                <ReferenceLine x={`${batchResult.theoretical_qber.toFixed(1)}-${(batchResult.theoretical_qber + 5).toFixed(1)}%`} stroke={AMBER} strokeDasharray="4 2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="paneldesc">{batchResult.confidence_notes}</div>
        </div>
      )}

      {/* Observed vs Theoretical */}
      {batchResult && (
        <div className="chart-panel panel">
          <div className="panelhead">
            <strong>Observed vs Theoretical QBER</strong>
            <small>STATISTICAL COMPARISON</small>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={theoreticalVsObserved} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DE" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => typeof v === 'number' ? `${v.toFixed(2)}%` : String(v)} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {theoreticalVsObserved.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History scatter */}
      {historyData.length > 1 && (
        <div className="chart-panel panel">
          <div className="panelhead">
            <strong>Multi-Run QBER History</strong>
            <small>LAST {historyData.length} SIMULATIONS</small>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DE" />
                <XAxis dataKey="run" tick={{ fontSize: 10 }} label={{ value: 'Run #', position: 'insideBottomRight', offset: -10, style: { fontSize: 10 } }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, name: any) => [typeof v === 'number' ? `${v.toFixed(2)}%` : String(v), name]} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <ReferenceLine y={historyData[0]?.threshold ?? 11} stroke={AMBER} strokeDasharray="4 2" label={{ value: 'Threshold', position: 'right', style: { fontSize: 9, fill: AMBER } }} />
                <Line type="monotone" dataKey="qber" stroke={TEAL} dot={{ r: 3 }} name="Measured QBER" strokeWidth={2} />
                <Line type="monotone" dataKey="theoretical" stroke={SLATE} dot={false} name="Theoretical QBER" strokeDasharray="4 2" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
