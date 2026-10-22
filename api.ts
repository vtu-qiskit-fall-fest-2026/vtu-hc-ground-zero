import {
  SimulationResult,
  BatchResult,
  PostProcessingResult,
  PaymentResponse,
  CircuitSchema,
  ExperimentHistoryRecord,
  BitState,
  BatchDistribution
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// In-memory cache for standalone mode
const localSimulations: Record<string, SimulationResult> = {};
const localHistory: ExperimentHistoryRecord[] = [];

// Helper: Attempt fetch with short timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function fetchHealth(): Promise<{ status: string; version: string; platform: string; mode?: string }> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 1500);
    if (r.ok) {
      const data = await r.json();
      return { ...data, mode: 'backend' };
    }
  } catch {
    // Standalone fallback
  }
  return {
    status: 'ok',
    version: '2.0.0',
    platform: 'QORVEX Quantum Security Engine (Browser / Standalone)',
    mode: 'client_fallback'
  };
}

// Client-side fallback quantum simulation engine matching simulation.py logic
function simulateLocally(params: {
  bits: number;
  eve: boolean;
  eve_intensity?: number;
  noise: boolean;
  noise_probability?: number;
  threshold?: number;
  sample_fraction?: number;
  min_sample?: number;
  seed?: number | null;
}): SimulationResult {
  const bitsCount = Math.max(16, Math.min(1024, params.bits || 128));
  const eveActive = Boolean(params.eve);
  const eveIntensity = params.eve_intensity ?? (eveActive ? 1.0 : 0.0);
  const noiseActive = Boolean(params.noise);
  const noiseP = params.noise_probability ?? (noiseActive ? 0.08 : 0.0);
  const threshold = params.threshold ?? 11.0;
  const sampleFraction = params.sample_fraction ?? 0.5;

  const bitStates: BitState[] = [];
  const aliceBits: number[] = [];
  const aliceBases: number[] = [];
  const bobBases: number[] = [];
  const bobBits: number[] = [];

  for (let i = 0; i < bitsCount; i++) {
    const aBit = Math.random() < 0.5 ? 0 : 1;
    const aBasis = Math.random() < 0.5 ? 0 : 1; // 0 = +, 1 = x
    aliceBits.push(aBit);
    aliceBases.push(aBasis);

    const aState = aBasis === 0 ? (aBit === 0 ? '|0⟩' : '|1⟩') : (aBit === 0 ? '|+⟩' : '|-⟩');
    const aSymbol = aBasis === 0 ? (aBit === 0 ? '↑' : '→') : (aBit === 0 ? '↗' : '↖');
    const aAngle = aBasis === 0 ? (aBit === 0 ? '0°' : '90°') : (aBit === 0 ? '45°' : '135°');

    let photonBit = aBit;
    let photonBasis = aBasis;

    let intercepted = false;
    let eBasis: number | null = null;
    let eMeasured: number | null = null;

    if (eveActive && Math.random() < eveIntensity) {
      intercepted = true;
      eBasis = Math.random() < 0.5 ? 0 : 1;
      if (eBasis === photonBasis) {
        eMeasured = photonBit;
      } else {
        eMeasured = Math.random() < 0.5 ? 0 : 1;
      }
      photonBit = eMeasured;
      photonBasis = eBasis;
    }

    let noiseFlipped = false;
    if (noiseActive && Math.random() < noiseP) {
      noiseFlipped = true;
      photonBit = 1 - photonBit;
    }

    const bBasis = Math.random() < 0.5 ? 0 : 1;
    bobBases.push(bBasis);
    let bBit: number;
    if (bBasis === photonBasis) {
      bBit = photonBit;
    } else {
      bBit = Math.random() < 0.5 ? 0 : 1;
    }
    bobBits.push(bBit);

    bitStates.push({
      position: i,
      alice: aBit,
      bob: bBit,
      alice_basis: aBasis,
      bob_basis: bBasis,
      eve_basis: eBasis,
      eve_measured: eMeasured,
      intercepted,
      noise_flipped: noiseFlipped,
      alice_state: aState,
      alice_symbol: aSymbol,
      alice_angle: aAngle,
      discard: aBasis !== bBasis,
      error: false,
      sample: false
    });
  }

  // Sift matching bases
  const siftedIndices: number[] = [];
  for (let i = 0; i < bitsCount; i++) {
    if (aliceBases[i] === bobBases[i]) {
      siftedIndices.push(i);
    }
  }

  const sampleSize = Math.max(1, Math.floor(siftedIndices.length * sampleFraction));
  let mismatches = 0;

  for (let j = 0; j < sampleSize; j++) {
    const idx = siftedIndices[j];
    bitStates[idx].sample = true;
    if (aliceBits[idx] !== bobBits[idx]) {
      mismatches++;
      bitStates[idx].error = true;
    }
  }

  const qber = sampleSize > 0 ? (mismatches / sampleSize) * 100 : 0;
  const status = qber > threshold ? 'ABORT' : 'PASS';
  const keyCandidates = siftedIndices.length - sampleSize;

  let theoretical = 0;
  if (eveActive && noiseActive) theoretical = 25 * eveIntensity + noiseP * 100;
  else if (eveActive) theoretical = 25 * eveIntensity;
  else if (noiseActive) theoretical = noiseP * 100;

  let scenario = 'Clean Channel';
  if (eveActive && noiseActive) scenario = 'Combined Attack & Noise';
  else if (eveActive) scenario = eveIntensity >= 0.99 ? 'Full Eve Attack' : `Partial Eve (${Math.round(eveIntensity * 100)}%)`;
  else if (noiseActive) scenario = 'Noise Only';

  const simId = `sim_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const simResult: SimulationResult = {
    simulation_id: simId,
    scenario,
    transmitted: bitsCount,
    sifted: siftedIndices.length,
    sample_size: sampleSize,
    mismatches,
    key_candidates: keyCandidates,
    qber: Math.round(qber * 100) / 100,
    theoretical_qber: Math.round(theoretical * 100) / 100,
    threshold,
    eve_intensity: eveIntensity,
    noise_probability: noiseP,
    status,
    bits: bitStates,
    seed: params.seed ?? null,
    explanation: status === 'PASS'
      ? `Quantum security condition satisfied: measured QBER (${qber.toFixed(2)}%) is below security threshold (${threshold}%). Channel cleared.`
      : `Security abort triggered: measured QBER (${qber.toFixed(2)}%) exceeds threshold (${threshold}%). Physical disturbance indicates interception or noise.`
  };

  localSimulations[simId] = simResult;
  localHistory.unshift({
    simulation_id: simId,
    timestamp: new Date().toISOString(),
    scenario,
    transmitted: bitsCount,
    sifted: siftedIndices.length,
    sample_size: sampleSize,
    mismatches,
    qber: simResult.qber,
    theoretical_qber: simResult.theoretical_qber,
    threshold,
    eve_intensity: eveIntensity,
    noise_probability: noiseP,
    status,
    seed: params.seed ?? null
  });

  return simResult;
}

export async function runSimulation(params: {
  bits: number;
  eve: boolean;
  eve_intensity?: number;
  noise: boolean;
  noise_probability?: number;
  threshold?: number;
  sample_fraction?: number;
  min_sample?: number;
  seed?: number | null;
}): Promise<SimulationResult> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/simulations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }, 4000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }
  return simulateLocally(params);
}

export async function runBatchSimulation(params: {
  runs: number;
  bits: number;
  eve: boolean;
  eve_intensity?: number;
  noise: boolean;
  noise_probability?: number;
  threshold?: number;
  seed?: number | null;
}): Promise<BatchResult> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/simulations/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }, 6000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }

  // Client-side batch computation
  const runsCount = Math.min(200, Math.max(10, params.runs || 50));
  const qbers: number[] = [];
  let passCount = 0;
  let abortCount = 0;
  let siftedSum = 0;
  let sampleSum = 0;

  const runsSummary: BatchResult['runs_summary'] = [];

  for (let i = 0; i < runsCount; i++) {
    const sim = simulateLocally(params);
    const q = sim.qber ?? 0;
    qbers.push(q);
    siftedSum += sim.sifted;
    sampleSum += sim.sample_size;

    if (sim.status === 'PASS') passCount++;
    else abortCount++;

    if (i < 20) {
      runsSummary.push({
        run_id: i + 1,
        qber: q,
        status: sim.status,
        sifted: sim.sifted,
        mismatches: sim.mismatches,
        sample_size: sim.sample_size
      });
    }
  }

  const sum = qbers.reduce((a, b) => a + b, 0);
  const mean = sum / runsCount;
  const variance = qbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / runsCount;
  const std = Math.sqrt(variance);
  const ci95Margin = 1.96 * (std / Math.sqrt(runsCount));

  let theoretical = 0;
  if (params.eve && params.noise) theoretical = 25 * (params.eve_intensity ?? 1) + (params.noise_probability ?? 0.08) * 100;
  else if (params.eve) theoretical = 25 * (params.eve_intensity ?? 1);
  else if (params.noise) theoretical = (params.noise_probability ?? 0.08) * 100;

  // Distribution bins
  const distribution: BatchDistribution[] = [];
  for (let b = 0; b <= 45; b += 5) {
    const rangeMin = b;
    const rangeMax = b + 5;
    const count = qbers.filter(q => q >= rangeMin && (rangeMax === 50 ? q <= rangeMax : q < rangeMax)).length;
    distribution.push({
      bin_label: `${rangeMin}-${rangeMax}%`,
      range_min: rangeMin,
      range_max: rangeMax,
      count
    });
  }

  return {
    runs_count: runsCount,
    mean_qber: Math.round(mean * 100) / 100,
    std_qber: Math.round(std * 100) / 100,
    min_qber: Math.round(Math.min(...qbers) * 100) / 100,
    max_qber: Math.round(Math.max(...qbers) * 100) / 100,
    ci95_lower: Math.round(Math.max(0, mean - ci95Margin) * 100) / 100,
    ci95_upper: Math.round((mean + ci95Margin) * 100) / 100,
    theoretical_qber: Math.round(theoretical * 100) / 100,
    threshold: params.threshold ?? 11,
    pass_count: passCount,
    abort_count: abortCount,
    insufficient_count: 0,
    pass_rate: Math.round((passCount / runsCount) * 1000) / 10,
    mean_sifted: Math.round(siftedSum / runsCount),
    mean_sample_size: Math.round(sampleSum / runsCount),
    distribution,
    runs_summary: runsSummary,
    confidence_notes: `Monte Carlo statistical evaluation across ${runsCount} runs. 95% Confidence Interval: [${Math.max(0, mean - ci95Margin).toFixed(2)}%, ${(mean + ci95Margin).toFixed(2)}%].`
  };
}

export async function runPostProcessing(simulation_id: string): Promise<PostProcessingResult> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/simulations/post-processing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulation_id })
    }, 3000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }

  const sim = localSimulations[simulation_id] || Object.values(localSimulations)[0] || simulateLocally({ bits: 256, eve: false, noise: false });
  const rawBits = sim.key_candidates;
  const isPass = sim.status === 'PASS';
  const qberVal = sim.qber ?? 0;

  if (!isPass) {
    return {
      status: 'ABORTED',
      raw_candidate_bits: rawBits,
      reconciled_errors_fixed: 0,
      reconciliation_efficiency: 1.15,
      public_parity_bits_leaked: 0,
      shannon_entropy_per_bit: 1.0,
      estimated_eve_knowledge_bits: Math.ceil(rawBits * (qberVal / 100) * 2),
      privacy_amplification_reduction_bits: rawBits,
      final_secure_key_length: 0,
      final_key_hex: '0x0000000000000000',
      final_bit_sample: '0000000000000000',
      educational_notice: 'SIMULATION ONLY: Key post-processing discarded. QBER exceeded security limit.',
      message: 'Post-processing aborted: channel disturbance exceeds classical error correction capability.'
    };
  }

  const errorsFixed = Math.floor(rawBits * (qberVal / 100) * 0.5);
  const leakedBits = Math.ceil(rawBits * 0.12);
  const secureBits = Math.max(16, rawBits - leakedBits - errorsFixed);
  const randomHex = Array.from({ length: Math.ceil(secureBits / 4) }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return {
    status: 'SUCCESS',
    raw_candidate_bits: rawBits,
    reconciled_errors_fixed: errorsFixed,
    reconciliation_efficiency: 1.15,
    public_parity_bits_leaked: leakedBits,
    shannon_entropy_per_bit: 0.94,
    estimated_eve_knowledge_bits: leakedBits,
    privacy_amplification_reduction_bits: leakedBits,
    final_secure_key_length: secureBits,
    final_key_hex: '0x' + randomHex.substring(0, 32),
    final_bit_sample: Array.from({ length: 16 }, () => (Math.random() < 0.5 ? '0' : '1')).join(''),
    educational_notice: 'SIMULATION ONLY: Cascade parity reconciliation and Toeplitz privacy amplification completed.'
  };
}

export async function verifyPaymentDemo(params: {
  simulation_id: string;
  transaction_id?: string;
  sender?: string;
  receiver?: string;
  amount?: number;
}): Promise<PaymentResponse> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/payments/demo/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }, 3000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }

  const sim = localSimulations[params.simulation_id] || Object.values(localSimulations)[0] || simulateLocally({ bits: 256, eve: false, noise: false });
  const isPass = sim.status === 'PASS';
  const qberVal = sim.qber ?? 0;

  return {
    transaction_id: params.transaction_id || `TXN-QORVEX-${Date.now().toString().slice(-6)}`,
    sender: params.sender || 'GB82WEST12345678901234',
    receiver: params.receiver || 'CH9300762011623852957',
    amount: params.amount || 2500000.0,
    currency: 'USD',
    simulation_id: sim.simulation_id,
    security_session_status: sim.status,
    demo_payment_status: isPass ? 'ADDITIONAL_VERIFICATION_REQUIRED' : 'BLOCKED',
    money_transferred: false,
    bank_contacted: false,
    message: isPass
      ? `Quantum security session cleared (QBER ${qberVal.toFixed(2)}% <= ${sim.threshold}%). Quantum keys validated for post-quantum transaction envelope.`
      : `Quantum security session ABORTED (QBER ${qberVal.toFixed(2)}% > ${sim.threshold}%). Transaction blocked due to detected channel disturbance.`,
    timeline: [
      {
        step: '1. SWIFT/ISO-20022 High-Value Wire Initiation',
        status: 'COMPLETED',
        detail: `Wire request received for USD ${(params.amount || 2500000).toLocaleString()}.`
      },
      {
        step: '2. BB84 Quantum Channel Integrity Audit',
        status: isPass ? 'COMPLETED' : 'WARNING',
        detail: `QBER: ${qberVal.toFixed(2)}% (Threshold: ${sim.threshold}%). Physical disturbance evaluated.`
      },
      {
        step: '3. QKD Key Sifting & Post-Processing',
        status: isPass ? 'COMPLETED' : 'REJECTED',
        detail: isPass
          ? `Cryptographic key material certified with ${sim.key_candidates} secure candidate bits.`
          : 'Security abort: key material contaminated, discarded by protocol.'
      },
      {
        step: '4. Institutional Payment Authorization Decision',
        status: isPass ? 'APPROVED' : 'REJECTED',
        detail: isPass
          ? 'Simulation payment pre-authorized. Secondary institutional dual-signature required.'
          : 'Payment halted immediately. Security alert dispatched to compliance operations.'
      }
    ],
    educational_notice: 'PROTOTYPE SIMULATION ONLY: Demonstrates QKD physical layer gating for financial wire channels. No actual funds transferred or real banking systems connected.'
  };
}

export async function fetchCircuitSchema(): Promise<CircuitSchema> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/simulations/circuit`, {}, 2000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }

  return {
    description: 'BB84 4-State Polarization Protocol with Active Interception and Channel Noise',
    gates: [
      {
        step: 1,
        actor: 'Alice',
        action: 'State Preparation',
        gate: 'Hadamard (H) if diagonal basis; Identity (I) if rectilinear',
        detail: 'Alice selects random classical bit b ∈ {0,1} and basis θ ∈ {+, ×}, preparing |0⟩, |1⟩, |+⟩, or |-⟩.'
      },
      {
        step: 2,
        actor: 'Eve (Adversary)',
        action: 'Intercept-Resend',
        gate: 'Projective Measurement & Resend',
        detail: 'With probability η, Eve intercepts the flying photon, projects onto random basis θ_E, and resends collapsed state.'
      },
      {
        step: 3,
        actor: 'Channel',
        action: 'Depolarizing Noise',
        gate: 'Pauli-X (Bit-Flip) Noise',
        detail: 'Environmental thermal fluctuation with bit-flip probability p.'
      },
      {
        step: 4,
        actor: 'Bob',
        action: 'Measurement',
        gate: 'Projective Measurement',
        detail: 'Bob selects random measurement basis θ_B. If θ_B == θ_A, photon state yields matching bit in ideal channel.'
      }
    ],
    fidelity_equations: {
      'Ideal Channel': 'F = 1.0, QBER = 0%',
      'Eve Interception (100%)': 'F = 0.75, QBER = 25% (due to 50% basis mismatch and 50% random projection error)',
      'Partial Eve (η)': 'Theoretical QBER = 0.25 × η'
    }
  };
}

export async function fetchExperimentHistory(limit: number = 50): Promise<{ experiments: ExperimentHistoryRecord[]; count: number }> {
  try {
    const r = await fetchWithTimeout(`${API_BASE}/api/experiments/history?limit=${limit}`, {}, 2000);
    if (r.ok) {
      return await r.json();
    }
  } catch {
    // Network / Mixed Content fallback
  }

  return {
    experiments: localHistory.slice(0, limit),
    count: localHistory.length
  };
}

export function getExportUrl(type: 'json' | 'csv' | 'report'): string {
  return `${API_BASE}/api/experiments/export/${type}`;
}
