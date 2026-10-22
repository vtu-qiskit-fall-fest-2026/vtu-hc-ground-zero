import React, { useState } from 'react';
import { SimulationResult, PostProcessingResult } from '../types';
import { runPostProcessing } from '../api';

type PostProcessingPanelProps = {
  result: SimulationResult | null;
};

const STAGES = [
  { id: 'estimation', label: '1. Parameter Estimation', icon: '◈' },
  { id: 'reconciliation', label: '2. Error Reconciliation', icon: '⇌' },
  { id: 'leakage', label: '3. Information Leakage', icon: '◎' },
  { id: 'amplification', label: '4. Privacy Amplification', icon: '◉' },
  { id: 'finalkey', label: '5. Final Candidate Key', icon: '🔑' },
];

export const PostProcessingPanel: React.FC<PostProcessingPanelProps> = ({ result }) => {
  const [postResult, setPostResult] = useState<PostProcessingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [activeStage, setActiveStage] = useState<string>('estimation');

  const run = async () => {
    if (!result) return;
    setLoading(true); setErr('');
    try {
      const r = await runPostProcessing(result.simulation_id);
      setPostResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const pp = postResult;
  const qber = result?.qber ?? 0;

  return (
    <div className="pp-layout">
      {/* Introduction */}
      <div className="pp-intro panel">
        <div className="panelhead">
          <strong>BB84 KEY POST-PROCESSING PIPELINE</strong>
          <small>EDUCATIONAL DEMONSTRATION</small>
        </div>
        <div className="pp-intro-body">
          <p>In a real QKD system, raw sifted bits cannot be used directly as a secret key. Post-processing transforms them into provably secure key material through four stages:</p>
          <div className="pp-stage-nav">
            {STAGES.map(s => (
              <button
                key={s.id}
                className={`pp-stage-btn ${activeStage === s.id ? 'active' : ''}`}
                onClick={() => setActiveStage(s.id)}
              >
                <span className="pp-stage-icon">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <div className="pp-stage-detail">
            {activeStage === 'estimation' && (
              <div>
                <h4>1. Parameter Estimation</h4>
                <p>Alice and Bob publicly compare a random subset of their sifted bits to estimate the Quantum Bit Error Rate (QBER). This fraction is <strong>permanently sacrificed</strong> — it reveals bit values on the classical channel and cannot be used as key material.</p>
                {result && <p>In your session: <strong>{result.sample_size} bits disclosed, {result.mismatches} errors → QBER = {result.qber?.toFixed(2) ?? '—'}%</strong></p>}
                <div className="pp-warning">The disclosed sample fraction must be statistically large enough to accurately estimate the true channel error rate.</div>
              </div>
            )}
            {activeStage === 'reconciliation' && (
              <div>
                <h4>2. Error Reconciliation (Cascade/LDPC Model)</h4>
                <p>Alice and Bob compare parity bits of key blocks over the authenticated classical channel. When a parity mismatch is detected, binary search locates and corrects the differing bit. This demonstration uses a simplified block parity approach.</p>
                {pp && <p>Fixed: <strong>{pp.reconciled_errors_fixed} errors</strong> across {pp.raw_candidate_bits} candidate bits. Parity bits leaked: <strong>{pp.public_parity_bits_leaked}</strong></p>}
                <div className="pp-warning">Each parity bit revealed reduces theoretical security. Production systems use interactive Cascade or LDPC codes optimized for QKD channel error rates.</div>
              </div>
            )}
            {activeStage === 'leakage' && (
              <div>
                <h4>3. Information Leakage Accounting</h4>
                <p>Shannon entropy quantifies how much information Eve may have learned about each bit. The binary entropy function h(ε) = −ε log₂(ε) − (1−ε)log₂(1−ε) gives the information leaked per bit at error rate ε.</p>
                {pp && <>
                  <p>Shannon entropy h({qber.toFixed(2)}%) = <strong>{pp.shannon_entropy_per_bit} bits/bit</strong></p>
                  <p>Estimated Eve knowledge: <strong>{pp.estimated_eve_knowledge_bits} bits</strong> across {pp.raw_candidate_bits} candidate bits.</p>
                </>}
                <div className="pp-warning">This simplified model assumes standard intercept-resend. Advanced attacks may require more conservative leakage bounds.</div>
              </div>
            )}
            {activeStage === 'amplification' && (
              <div>
                <h4>4. Privacy Amplification (Universal Hashing)</h4>
                <p>A 2-universal hash function compresses the raw reconciled key into a shorter string with negligible correlation to Eve's information. The final key length is reduced by the estimated leakage plus a security parameter.</p>
                {pp && <>
                  <p>Raw candidates: <strong>{pp.raw_candidate_bits}</strong> → Privacy amplification reduces by <strong>{pp.privacy_amplification_reduction_bits}</strong> bits → Final: <strong>{pp.final_secure_key_length} bits</strong></p>
                </>}
                <div className="pp-warning">This demonstration uses a pseudo-random Toeplitz matrix. Production implementations require cryptographically verified 2-universal hash functions.</div>
              </div>
            )}
            {activeStage === 'finalkey' && (
              <div>
                <h4>5. Final Candidate Key</h4>
                {pp && pp.final_secure_key_length > 0 ? <>
                  <p>Final secure key length: <strong className="key-length-display">{pp.final_secure_key_length} bits</strong></p>
                  <div className="key-hex-display">
                    <span>HEX SAMPLE</span>
                    <code>{pp.final_key_hex.slice(0, 48)}{pp.final_key_hex.length > 48 ? '...' : ''}</code>
                  </div>
                  <div className="key-bits-display">
                    <span>BIT STRING SAMPLE</span>
                    <code>{pp.final_bit_sample}</code>
                  </div>
                </> : <p>Run post-processing to see the derived key material.</p>}
                <div className="pp-warning">
                  {pp?.educational_notice ?? 'This is a simplified educational demonstration. Production QKD requires formally verified post-processing implementations.'}
                </div>
              </div>
            )}
          </div>

          {!result ? (
            <div className="pp-prereq">Run a BB84 simulation first to enable post-processing.</div>
          ) : (
            <button className="primary" onClick={run} disabled={loading} style={{ marginTop: 16 }}>
              {loading ? '⟳ PROCESSING...' : '▶ RUN POST-PROCESSING PIPELINE'}
            </button>
          )}

          {err && <div className="errorbox">{err}</div>}
        </div>
      </div>

      {/* Results summary */}
      {pp && (
        <div className="pp-results panel">
          <div className="panelhead">
            <strong>POST-PROCESSING RESULTS</strong>
            <span className={`status-pill ${pp.status === 'SUCCESS' ? 'pass' : 'abort'}`}>{pp.status}</span>
          </div>
          <div className="pp-results-grid">
            {[
              ['Raw Candidate Bits', pp.raw_candidate_bits],
              ['Errors Corrected', pp.reconciled_errors_fixed],
              ['Parity Bits Leaked', pp.public_parity_bits_leaked],
              ['Shannon Entropy', `${pp.shannon_entropy_per_bit} b/b`],
              ['Eve Info. Estimate', `${pp.estimated_eve_knowledge_bits} bits`],
              ['PA Reduction', `${pp.privacy_amplification_reduction_bits} bits`],
              ['Final Key Length', `${pp.final_secure_key_length} bits`],
            ].map(([k, v]) => (
              <div key={k} className="pp-stat-cell">
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
