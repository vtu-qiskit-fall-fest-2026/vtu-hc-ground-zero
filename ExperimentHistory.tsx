import React, { useState, useEffect } from 'react';
import { ExperimentHistoryRecord } from '../types';
import { fetchExperimentHistory, getExportUrl } from '../api';

export const ExperimentHistory: React.FC = () => {
  const [records, setRecords] = useState<ExperimentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetchExperimentHistory(50);
      setRecords(res.experiments);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusColor = (s: string) =>
    s === 'PASS' ? '#477C78' : s === 'ABORT' ? '#B7833F' : '#64717A';

  return (
    <div className="history-layout">
      <div className="history-header-row">
        <div>
          <h2 className="history-title">EXPERIMENT AUDIT LOG</h2>
          <p className="history-sub">Persistent SQLite history. All sessions are stored and exportable.</p>
        </div>
        <div className="history-actions">
          <button className="secondary" onClick={load} disabled={loading}>
            {loading ? '⟳ LOADING...' : '↻ REFRESH'}
          </button>
          <a href={getExportUrl('csv')} target="_blank" className="export-btn">⬇ CSV</a>
          <a href={getExportUrl('json')} target="_blank" className="export-btn">⬇ JSON</a>
          <a href={getExportUrl('report')} target="_blank" className="export-btn primary-export">⬇ BRANDED REPORT</a>
        </div>
      </div>

      {err && <div className="errorbox">{err}</div>}

      {records.length === 0 && !loading && (
        <div className="history-empty">
          <div className="history-empty-icon">◌</div>
          <p>No experiments recorded yet. Run simulations in the BB84 Lab or Attack Control Room.</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TIMESTAMP</th>
                <th>SCENARIO</th>
                <th>BITS TX</th>
                <th>SIFTED</th>
                <th>SAMPLE</th>
                <th>QBER</th>
                <th>THEORY</th>
                <th>THRESHOLD</th>
                <th>EVE INT.</th>
                <th>NOISE</th>
                <th>SEED</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.simulation_id}>
                  <td className="mono id-cell" title={r.simulation_id}>{r.simulation_id.slice(0, 8)}…</td>
                  <td className="mono ts-cell">{r.timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td className="scenario-cell">{r.scenario}</td>
                  <td>{r.transmitted}</td>
                  <td>{r.sifted}</td>
                  <td>{r.sample_size}</td>
                  <td className="mono qber-cell">{r.qber != null ? r.qber.toFixed(2) + '%' : '—'}</td>
                  <td className="mono">{r.theoretical_qber != null ? r.theoretical_qber.toFixed(2) + '%' : '—'}</td>
                  <td className="mono">{r.threshold}%</td>
                  <td className="mono">{r.eve_intensity != null ? Math.round(r.eve_intensity * 100) + '%' : '—'}</td>
                  <td className="mono">{r.noise_probability != null ? Math.round(r.noise_probability * 100) + '%' : '—'}</td>
                  <td className="mono">{r.seed ?? '—'}</td>
                  <td>
                    <span className="status-chip" style={{ color: statusColor(r.status), borderColor: statusColor(r.status) }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
