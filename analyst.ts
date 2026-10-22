import { SimulationResult } from './types';

export type AnalystReport = {
  headline: string;
  verdict: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'INSUFFICIENT';
  qberAssessment: string;
  interceptionProbabilityAssessment: string;
  noiseAssessment: string;
  sampleSufficiency: string;
  paymentRiskVerdict: string;
  scientificCaveat: string;
};

export function analyzeSimulation(res: SimulationResult | null): AnalystReport {
  if (!res) {
    return {
      headline: 'Awaiting Simulation Telemetry',
      verdict: 'NORMAL',
      qberAssessment: 'No active session data. Configure experiment parameters and execute the key exchange.',
      interceptionProbabilityAssessment: 'N/A',
      noiseAssessment: 'N/A',
      sampleSufficiency: 'N/A',
      paymentRiskVerdict: 'Simulation must be completed before evaluating fintech gateway security.',
      scientificCaveat: 'Simulated environment only. Disturbance metrics require statistical sampling.'
    };
  }

  const { qber, threshold, status, sample_size, transmitted, eve_intensity, noise_probability, mismatches } = res;

  if (status === 'INSUFFICIENT_DATA') {
    return {
      headline: 'Statistical Sample Insufficient for Trust Decision',
      verdict: 'INSUFFICIENT',
      qberAssessment: `Only ${sample_size} test bits were available after basis sifting. Statistical variance on small samples is too wide to compute a dependable error rate.`,
      interceptionProbabilityAssessment: eve_intensity > 0 ? `Eve interception is set at ${Math.round(eve_intensity * 100)}%, but sample is too small to detect disturbance reliably.` : 'No active attacker configured.',
      noiseAssessment: noise_probability > 0 ? `Channel noise modeled at ${Math.round(noise_probability * 100)}%.` : 'No channel noise configured.',
      sampleSufficiency: `CRITICAL: Disclosed sample (${sample_size}) is below threshold of 5 bits. Minimum 64–512 transmitted qubits recommended.`,
      paymentRiskVerdict: 'GATE HELD: The transaction workflow must remain suspended until a statistically meaningful sample verifies channel integrity.',
      scientificCaveat: 'A low error count on a tiny sample does not rule out interception; it merely reflects finite-sample blind spots.'
    };
  }

  const q = qber ?? 0;
  const isAborted = status === 'ABORT';
  const margin = Math.abs(q - threshold);

  let verdict: 'NORMAL' | 'ELEVATED' | 'CRITICAL' = 'NORMAL';
  let headline = 'Quantum Channel Disturbance Below Security Threshold';

  if (isAborted) {
    verdict = q > 20 ? 'CRITICAL' : 'ELEVATED';
    headline = q > 20 
      ? 'Severe Disturbance Detected: Probable Intercept-Resend Attack'
      : 'Security Policy Threshold Exceeded: Key Session Aborted';
  } else if (q > threshold * 0.7) {
    verdict = 'ELEVATED';
    headline = 'Elevated Error Rate Nearing Security Threshold Boundary';
  }

  const eveContribution = Math.round(eve_intensity * 25 * 10) / 10;
  const noiseContribution = Math.round(noise_probability * 100 * 10) / 10;

  let rootCauseAnalysis = '';
  if (res.scenario === 'clean') {
    rootCauseAnalysis = 'Ideal quantum channel. In the absence of an interceptor and channel noise, expected QBER is 0.00%. Observed zero mismatches confirm theoretical baseline.';
  } else if (res.scenario === 'eve' || res.scenario === 'partial_eve') {
    rootCauseAnalysis = `Modeled intercept-resend attack active with ${Math.round(eve_intensity * 100)}% interception intensity. Theoretical expected QBER is ~${eveContribution}%. When Eve measures non-commuting bases, she collapses quantum superpositions, injecting ~25% error on intercepted photons.`;
  } else if (res.scenario === 'noise') {
    rootCauseAnalysis = `Classical channel noise active (${Math.round(noise_probability * 100)}% bit-flip probability). Crucial finding: Channel noise independently raises QBER to ~${noiseContribution}% without any malicious eavesdropper present.`;
  } else {
    rootCauseAnalysis = `Combined threat environment: ${Math.round(eve_intensity * 100)}% Eve interception combined with ${Math.round(noise_probability * 100)}% classical noise. Both physical decoherence and quantum measurement collapse contribute to the elevated ${q.toFixed(2)}% QBER.`;
  }

  const sampleAssessment = sample_size >= 100
    ? `High statistical confidence: Sample of ${sample_size} disclosed bits across ${transmitted} transmitted photons provides tight error bounds.`
    : sample_size >= 20
    ? `Moderate statistical confidence: ${sample_size} test bits disclosed. Finite sample variance of ±${(1 / Math.sqrt(sample_size) * 100).toFixed(1)}% expected.`
    : `Low statistical sample (${sample_size} bits). Results exhibit wider fluctuations around theoretical expectation.`;

  const paymentVerdict = isAborted
    ? 'TRANSACTION BLOCKED: Key establishment aborted. Simulated fintech gateway stops authorization to protect against compromised session keys.'
    : 'GATEWAY CLEAR TO PROCEED: QBER check passed. Proceed to mock independent banking 2FA/authentication (QKD only secures key transmission, not payment intent).';

  return {
    headline,
    verdict,
    qberAssessment: `Measured QBER: ${q.toFixed(2)}% vs ${threshold.toFixed(1)}% threshold (${isAborted ? `+${margin.toFixed(2)}% over` : `${margin.toFixed(2)}% under`}). ${mismatches} mismatches observed across ${sample_size} test bits.`,
    interceptionProbabilityAssessment: rootCauseAnalysis,
    noiseAssessment: `Noise parameter: ${Math.round(noise_probability * 100)}% bit-flip probability.`,
    sampleSufficiency: sampleAssessment,
    paymentRiskVerdict: paymentVerdict,
    scientificCaveat: 'EDUCATIONAL PRINCIPLE: A low QBER is necessary but not sufficient for transaction security. Real-world systems require authenticated classical communication, physical channel calibration, and separate financial fraud controls.'
  };
}
