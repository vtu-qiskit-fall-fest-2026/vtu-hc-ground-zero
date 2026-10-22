export type Scenario = 'clean' | 'eve' | 'partial_eve' | 'noise' | 'combined' | 'custom';

export type BitState = {
  position: number;
  alice: number;
  bob: number;
  alice_basis: number; // 0 = +, 1 = x
  bob_basis: number;
  eve_basis: number | null;
  eve_measured: number | null;
  intercepted: boolean;
  noise_flipped: boolean;
  alice_state: string; // e.g. |0⟩, |+⟩
  alice_symbol: string; // ↑, →, ↗, ↖
  alice_angle: string; // 0°, 90°, 45°, 135°
  discard: boolean;
  error: boolean;
  sample: boolean;
};

export type SimulationResult = {
  simulation_id: string;
  scenario: string;
  transmitted: number;
  sifted: number;
  sample_size: number;
  mismatches: number;
  key_candidates: number;
  qber: number | null;
  theoretical_qber: number;
  threshold: number;
  eve_intensity: number;
  noise_probability: number;
  status: 'PASS' | 'ABORT' | 'INSUFFICIENT_DATA';
  bits: BitState[];
  seed: number | null;
  explanation: string;
};

export type BatchDistribution = {
  bin_label: string;
  range_min: number;
  range_max: number;
  count: number;
};

export type BatchResult = {
  runs_count: number;
  mean_qber: number;
  std_qber: number;
  min_qber: number;
  max_qber: number;
  ci95_lower: number;
  ci95_upper: number;
  theoretical_qber: number;
  threshold: number;
  pass_count: number;
  abort_count: number;
  insufficient_count: number;
  pass_rate: number;
  mean_sifted: number;
  mean_sample_size: number;
  distribution: BatchDistribution[];
  runs_summary: Array<{
    run_id: number;
    qber: number;
    status: string;
    sifted: number;
    mismatches: number;
    sample_size: number;
  }>;
  confidence_notes: string;
};

export type PostProcessingResult = {
  status: 'SUCCESS' | 'ABORTED' | 'HELD' | 'KEY_EXHAUSTED' | 'INSUFFICIENT_DATA';
  raw_candidate_bits: number;
  reconciled_errors_fixed: number;
  reconciliation_efficiency: number;
  public_parity_bits_leaked: number;
  shannon_entropy_per_bit: number;
  estimated_eve_knowledge_bits: number;
  privacy_amplification_reduction_bits: number;
  final_secure_key_length: number;
  final_key_hex: string;
  final_bit_sample: string;
  educational_notice: string;
  message?: string;
};

export type PaymentTimelineStep = {
  step: string;
  status: 'COMPLETED' | 'WARNING' | 'APPROVED' | 'REJECTED' | 'HELD' | 'PENDING';
  detail: string;
};

export type PaymentResponse = {
  transaction_id: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  simulation_id: string;
  security_session_status: string;
  demo_payment_status: 'ADDITIONAL_VERIFICATION_REQUIRED' | 'BLOCKED' | 'PENDING_INSUFFICIENT_DATA';
  money_transferred: boolean;
  bank_contacted: boolean;
  message: string;
  timeline: PaymentTimelineStep[];
  educational_notice: string;
};

export type CircuitGate = {
  step: number;
  actor: string;
  action: string;
  gate: string;
  detail: string;
};

export type CircuitSchema = {
  description: string;
  gates: CircuitGate[];
  fidelity_equations: Record<string, string>;
};

export type ExperimentHistoryRecord = {
  simulation_id: string;
  timestamp: string;
  scenario: string;
  transmitted: number;
  sifted: number;
  sample_size: number;
  mismatches: number;
  qber: number | null;
  theoretical_qber: number | null;
  threshold: number;
  eve_intensity: number;
  noise_probability: number;
  status: string;
  seed: number | null;
};
