import React, { useState } from 'react';
import { SimulationResult, PaymentResponse } from '../types';
import { verifyPaymentDemo } from '../api';

type PaymentGatewayProps = {
  result: SimulationResult | null;
  onRun: () => Promise<void>;
  loading: boolean;
};

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({ result, onRun, loading }) => {
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [txId, setTxId] = useState('QVX-DEMO-001');
  const [sender, setSender] = useState('Institutional Customer');
  const [receiver, setReceiver] = useState('Global Clearing Merchant');
  const [amount, setAmount] = useState(500000);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState('');

  const verify = async () => {
    if (!result) return;
    setVerifying(true); setErr(''); setPayment(null);
    try {
      const p = await verifyPaymentDemo({
        simulation_id: result.simulation_id,
        transaction_id: txId,
        sender, receiver, amount
      });
      setPayment(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setVerifying(false);
    }
  };

  const statusColors: Record<string, string> = {
    COMPLETED: '#477C78',
    APPROVED: '#477C78',
    WARNING: '#B7833F',
    REJECTED: '#B7833F',
    HELD: '#B7833F',
    PENDING: '#64717A',
  };

  return (
    <div className="payment-layout">
      {/* Transaction form */}
      <div className="payment-form-col panel">
        <div className="panelhead">
          <strong>PENDING MOCK TRANSACTION</strong>
          <small className="amber-badge">DEMO ONLY</small>
        </div>
        <div className="payment-form-body">
          <div className="payment-eyebrow">SIMULATED INSTITUTIONAL PAYMENT</div>
          <div className="payment-amount-display">₹{amount.toLocaleString('en-IN')}</div>
          <p className="payment-disclaimer">No real funds, banking accounts, or financial networks involved. This is a simulation for educational purposes only.</p>

          <div className="payment-fields">
            <div className="field-row">
              <label>TRANSACTION ID</label>
              <input value={txId} onChange={e => setTxId(e.target.value)} className="param-input" />
            </div>
            <div className="field-row">
              <label>SENDER</label>
              <input value={sender} onChange={e => setSender(e.target.value)} className="param-input" />
            </div>
            <div className="field-row">
              <label>RECEIVER / MERCHANT</label>
              <input value={receiver} onChange={e => setReceiver(e.target.value)} className="param-input" />
            </div>
            <div className="field-row">
              <label>AMOUNT (₹)</label>
              <input type="number" value={amount} min={1} onChange={e => setAmount(Number(e.target.value))} className="param-input" />
            </div>
          </div>

          {!result ? (
            <div className="payment-prereq">
              <span>⚠</span>
              <div>
                <strong>BB84 Key Exchange Required</strong>
                <p>Run a quantum key exchange simulation first to establish a security session before evaluating this mock payment.</p>
                <button className="primary" onClick={onRun} disabled={loading}>
                  {loading ? '⟳ RUNNING...' : '▶ RUN BB84 SIMULATION'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="payment-session-info">
                <span className={`status-pill ${result.status.toLowerCase()}`}>{result.status}</span>
                <span className="mono">Session: {result.simulation_id.slice(0, 8)}... QBER: {result.qber?.toFixed(2) ?? '—'}%</span>
              </div>
              <button className="primary" onClick={verify} disabled={verifying}>
                {verifying ? '⟳ EVALUATING...' : 'EVALUATE DEMO PAYMENT →'}
              </button>
            </>
          )}

          {err && <div className="errorbox">{err}</div>}
        </div>
      </div>

      {/* Transaction timeline */}
      <div className="payment-result-col">
        <div className="panel">
          <div className="panelhead">
            <strong>TRANSACTION WORKFLOW TIMELINE</strong>
            <small>QUANTUM-GATED FINTECH FLOW</small>
          </div>
          <div className="timeline-body">
            {payment ? (
              <>
                {payment.timeline.map((step, i) => (
                  <div key={i} className="timeline-step">
                    <div className="timeline-marker">
                      <div className="timeline-dot" style={{ background: statusColors[step.status] ?? '#64717A' }} />
                      {i < payment.timeline.length - 1 && <div className="timeline-connector" />}
                    </div>
                    <div className="timeline-content">
                      <strong className="timeline-step-name">{step.step}</strong>
                      <span className="timeline-detail">{step.detail}</span>
                      <span className="timeline-status mono" style={{ color: statusColors[step.status] ?? '#64717A' }}>
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}

                <div className={`payment-outcome-box ${payment.demo_payment_status === 'BLOCKED' ? 'outcome-blocked' : payment.demo_payment_status === 'ADDITIONAL_VERIFICATION_REQUIRED' ? 'outcome-pass' : 'outcome-held'}`}>
                  <strong>{payment.demo_payment_status}</strong>
                  <p>{payment.message}</p>
                  <div className="payment-safe-labels">
                    <span>💰 Money Transferred: {payment.money_transferred ? 'YES' : 'NO'}</span>
                    <span>🏦 Bank Contacted: {payment.bank_contacted ? 'YES' : 'NO'}</span>
                  </div>
                </div>

                <div className="payment-edu-notice">{payment.educational_notice}</div>
              </>
            ) : (
              <div className="timeline-empty">
                <div className="timeline-step">
                  <div className="timeline-marker"><div className="timeline-dot pending-dot" /><div className="timeline-connector" /></div>
                  <div className="timeline-content"><strong>Transaction Initiated</strong><span>Awaiting BB84 key exchange...</span></div>
                </div>
                <div className="timeline-step">
                  <div className="timeline-marker"><div className="timeline-dot pending-dot" /><div className="timeline-connector" /></div>
                  <div className="timeline-content"><strong>BB84 Key Exchange</strong><span>Configure and run simulation</span></div>
                </div>
                <div className="timeline-step">
                  <div className="timeline-marker"><div className="timeline-dot pending-dot" /><div className="timeline-connector" /></div>
                  <div className="timeline-content"><strong>QBER Evaluation</strong><span>Evaluate channel integrity</span></div>
                </div>
                <div className="timeline-step">
                  <div className="timeline-marker"><div className="timeline-dot pending-dot" /></div>
                  <div className="timeline-content"><strong>Payment Gateway Decision</strong><span>Click Evaluate Demo Payment</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
