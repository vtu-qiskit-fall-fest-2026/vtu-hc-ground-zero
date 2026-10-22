import React from 'react';
import { AnalystReport } from '../analyst';

type AnalystBoxProps = {
  report: AnalystReport;
};

export const AnalystBox: React.FC<AnalystBoxProps> = ({ report }) => {
  const badgeClass = 
    report.verdict === 'CRITICAL' ? 'verdict-critical' :
    report.verdict === 'ELEVATED' ? 'verdict-elevated' :
    report.verdict === 'INSUFFICIENT' ? 'verdict-insufficient' : 'verdict-normal';

  return (
    <section className="analyst-panel panel" aria-label="Security Analyst Evaluation">
      <div className="panelhead">
        <div className="analyst-header-left">
          <span className="analyst-icon">🛡</span>
          <div>
            <strong>AI & EXPERT SECURITY ANALYST TELEMETRY</strong>
            <small>DETERMINISTIC CRYPTOGRAPHIC EVALUATION ENGINE</small>
          </div>
        </div>
        <span className={`verdict-badge ${badgeClass}`}>{report.verdict} STATUS</span>
      </div>

      <div className="analyst-body">
        <h4 className="analyst-headline">{report.headline}</h4>
        
        <div className="analyst-grid">
          <div className="analyst-card">
            <span className="analyst-label">QBER POLICY ASSESSMENT</span>
            <p>{report.qberAssessment}</p>
          </div>
          <div className="analyst-card">
            <span className="analyst-label">DISTURBANCE ROOT-CAUSE ANALYSIS</span>
            <p>{report.interceptionProbabilityAssessment}</p>
          </div>
          <div className="analyst-card">
            <span className="analyst-label">SAMPLE ADEQUACY & FINITE-KEY EFFECTS</span>
            <p>{report.sampleSufficiency}</p>
          </div>
          <div className="analyst-card">
            <span className="analyst-label">FINTECH PAYMENT GATEWAY VERDICT</span>
            <p>{report.paymentRiskVerdict}</p>
          </div>
        </div>

        <div className="scientific-disclaimer">
          <strong>SCIENTIFIC & CRYPTOGRAPHIC BOUNDARY:</strong> {report.scientificCaveat}
        </div>
      </div>
    </section>
  );
};
