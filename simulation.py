"""QORVEX 2.0 — Educational BB84 Quantum Key Distribution & Attack Simulation Engine.

Provides mathematically grounded simulation of the BB84 protocol with:
- Partial and full intercept-resend attacks
- Classical channel noise modeling
- Photon-level quantum state & polarization tracking
- Vectorized batch experiment simulation with statistical confidence intervals
- Educational key post-processing (error reconciliation & privacy amplification)
- Quantum circuit gate representations
"""
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import math
import numpy as np

# Basis representations
# Basis 0: Rectilinear (+) -> Bit 0 = |0> (0° / vertical), Bit 1 = |1> (90° / horizontal)
# Basis 1: Diagonal (x)    -> Bit 0 = |+> (45°), Bit 1 = |-> (135° / -45°)
STATE_NOTATIONS = {
    (0, 0): {"dirac": "|0⟩", "angle": "0°", "symbol": "↑", "basis_name": "Rectilinear (+)"},
    (0, 1): {"dirac": "|1⟩", "angle": "90°", "symbol": "→", "basis_name": "Rectilinear (+)"},
    (1, 0): {"dirac": "|+⟩", "angle": "45°", "symbol": "↗", "basis_name": "Diagonal (×)"},
    (1, 1): {"dirac": "|−⟩", "angle": "135°", "symbol": "↖", "basis_name": "Diagonal (×)"},
}

@dataclass(frozen=True)
class Config:
    bits: int = 64
    eve: bool = False
    eve_intensity: float = 1.0  # 0.0 to 1.0 (interception probability per photon)
    noise: bool = False
    noise_probability: float = 0.05  # 0.0 to 0.30
    threshold: float = 11.0  # QBER threshold percentage
    sample_fraction: float = 0.35  # fraction of sifted bits disclosed for QBER testing
    min_sample: int = 5
    seed: Optional[int] = None

def simulate(c: Config) -> Dict[str, Any]:
    rng = np.random.default_rng(c.seed)
    n = c.bits

    # 1. Alice generates random bits and preparation bases (0 = +, 1 = x)
    alice_bits = rng.integers(0, 2, n)
    ab = rng.integers(0, 2, n)

    # 2. Eve interception (partial or full)
    eb = rng.integers(0, 2, n) if c.eve else np.zeros(n, dtype=int)
    intercepted = np.zeros(n, dtype=bool)
    eve_measured = np.zeros(n, dtype=int)
    transmitted_bits = alice_bits.copy()

    if c.eve:
        # Probability of interception per photon
        p_intercept = np.clip(c.eve_intensity, 0.0, 1.0)
        intercepted = rng.random(n) < p_intercept
        
        # When Eve intercepts: if her basis matches Alice's, she reads the bit faithfully.
        # If basis differs, quantum measurement yields 0 or 1 with 50% probability.
        # She then prepares and resends a photon in her measured state.
        eve_random = rng.integers(0, 2, n)
        eve_measured = np.where(eb == ab, alice_bits, eve_random)
        transmitted_bits = np.where(intercepted, eve_measured, alice_bits)

    # 3. Bob chooses measurement bases and measures the transmitted state
    bb = rng.integers(0, 2, n)
    bob_random = rng.integers(0, 2, n)
    # If Bob's basis matches the state sent to him:
    # If Eve intercepted, transmitted state is in Eve's basis `eb`.
    # If Eve did not intercept, transmitted state is in Alice's basis `ab`.
    effective_basis = np.where(intercepted, eb, ab)
    bob_bits = np.where(bb == effective_basis, transmitted_bits, bob_random)

    # 4. Classical Channel Noise (depolarizing/bit-flip model on Bob's detection)
    noise_flipped = np.zeros(n, dtype=bool)
    if c.noise and c.noise_probability > 0:
        noise_flipped = rng.random(n) < c.noise_probability
        bob_bits = np.bitwise_xor(bob_bits, noise_flipped.astype(int))

    # 5. Basis reconciliation (Public discussion of bases only, never the bits)
    sifted_idx = np.flatnonzero(ab == bb)
    sifted_count = len(sifted_idx)

    # 6. Parameter estimation: Disclose a random fraction of sifted positions
    sample_count = max(1, int(sifted_count * c.sample_fraction)) if sifted_count > 0 else 0
    sampled_idx = rng.choice(sifted_idx, size=sample_count, replace=False) if sample_count > 0 else np.array([], dtype=int)
    sampled_set = set(map(int, sampled_idx))

    # 7. QBER calculation on the disclosed sample
    sample_errors = int(np.count_nonzero(alice_bits[sampled_idx] != bob_bits[sampled_idx])) if sample_count > 0 else 0
    qber = round(100.0 * sample_errors / sample_count, 2) if sample_count > 0 else None

    # Theoretical expected QBER calculation
    eve_p = c.eve_intensity if c.eve else 0.0
    noise_p = c.noise_probability if c.noise else 0.0
    # Expected sifted error: Eve introduces 25% error on intercepted bits.
    # Noise flips bits with probability noise_p.
    # Combined expected rate: p_eve * 0.25 * (1 - noise_p) + (1 - p_eve * 0.25) * noise_p
    theoretical_qber = round(100.0 * ((eve_p * 0.25) * (1.0 - noise_p) + (1.0 - eve_p * 0.25) * noise_p), 2)

    # 8. Security Decision Policy
    if sample_count < c.min_sample:
        status = 'INSUFFICIENT_DATA'
    elif qber is not None and qber > c.threshold:
        status = 'ABORT'
    else:
        status = 'PASS'

    # Build detailed per-photon records
    rows = []
    for i in range(n):
        a_b = int(ab[i])
        b_b = int(bb[i])
        e_b = int(eb[i]) if (c.eve and intercepted[i]) else None
        a_bit = int(alice_bits[i])
        b_bit = int(bob_bits[i])
        e_bit = int(eve_measured[i]) if (c.eve and intercepted[i]) else None
        
        a_state = STATE_NOTATIONS.get((a_b, a_bit), {})
        is_discard = bool(a_b != b_b)
        is_error = bool(a_b == b_b and a_bit != b_bit)
        is_sample = i in sampled_set

        rows.append({
            'position': i + 1,
            'alice': a_bit,
            'bob': b_bit,
            'alice_basis': a_b,
            'bob_basis': b_b,
            'eve_basis': e_b,
            'eve_measured': e_bit,
            'intercepted': bool(intercepted[i]),
            'noise_flipped': bool(noise_flipped[i]),
            'alice_state': a_state.get('dirac', ''),
            'alice_symbol': a_state.get('symbol', ''),
            'alice_angle': a_state.get('angle', ''),
            'discard': is_discard,
            'error': is_error,
            'sample': is_sample
        })

    # Determine scenario tag
    if c.eve and c.noise:
        scenario = 'combined'
    elif c.eve:
        scenario = 'eve' if c.eve_intensity >= 0.99 else 'partial_eve'
    elif c.noise:
        scenario = 'noise'
    else:
        scenario = 'clean'

    explanations = {
        'PASS': 'Sampled QBER is below threshold. Protocol allows proceeding to error reconciliation and privacy amplification. (Does not prove channel is eavesdropper-free).',
        'ABORT': 'Excessive disturbance detected. The sampled QBER exceeds the configured security threshold. Key establishment aborted to prevent compromised communication.',
        'INSUFFICIENT_DATA': 'Insufficient disclosed sifted test bits for statistical significance. Increase transmission size to establish high confidence.'
    }

    return {
        'scenario': scenario,
        'transmitted': n,
        'sifted': sifted_count,
        'sample_size': sample_count,
        'mismatches': sample_errors,
        'key_candidates': max(0, sifted_count - sample_count),
        'qber': qber,
        'theoretical_qber': theoretical_qber,
        'threshold': c.threshold,
        'eve_intensity': c.eve_intensity if c.eve else 0.0,
        'noise_probability': c.noise_probability if c.noise else 0.0,
        'status': status,
        'bits': rows,
        'seed': c.seed,
        'explanation': explanations[status]
    }

def simulate_batch(c: Config, runs: int = 100) -> Dict[str, Any]:
    """Execute multiple independent simulation runs to generate empirical statistical distributions."""
    runs = int(np.clip(runs, 10, 1000))
    base_seed = c.seed if c.seed is not None else 42
    
    qbers = []
    statuses = {'PASS': 0, 'ABORT': 0, 'INSUFFICIENT_DATA': 0}
    sample_sizes = []
    sifted_sizes = []
    runs_summary = []

    for run_idx in range(runs):
        run_seed = (base_seed + run_idx * 7919) % 4294967295
        run_config = Config(
            bits=c.bits,
            eve=c.eve,
            eve_intensity=c.eve_intensity,
            noise=c.noise,
            noise_probability=c.noise_probability,
            threshold=c.threshold,
            sample_fraction=c.sample_fraction,
            min_sample=c.min_sample,
            seed=run_seed
        )
        res = simulate(run_config)
        q = res['qber'] if res['qber'] is not None else 0.0
        qbers.append(q)
        statuses[res['status']] = statuses.get(res['status'], 0) + 1
        sample_sizes.append(res['sample_size'])
        sifted_sizes.append(res['sifted'])

        if run_idx < 50:  # store up to 50 individual run summaries for frontend inspector
            runs_summary.append({
                'run_id': run_idx + 1,
                'qber': q,
                'status': res['status'],
                'sifted': res['sifted'],
                'mismatches': res['mismatches'],
                'sample_size': res['sample_size']
            })

    qbers_arr = np.array(qbers, dtype=float)
    mean_qber = float(np.mean(qbers_arr))
    std_qber = float(np.std(qbers_arr, ddof=1)) if runs > 1 else 0.0
    min_qber = float(np.min(qbers_arr))
    max_qber = float(np.max(qbers_arr))

    # 95% Confidence Interval for mean QBER: mean +- 1.96 * (std / sqrt(N))
    margin_of_error = 1.96 * (std_qber / math.sqrt(runs)) if runs > 1 else 0.0
    ci_lower = max(0.0, round(mean_qber - margin_of_error, 2))
    ci_upper = round(mean_qber + margin_of_error, 2)

    # 10-bin empirical histogram
    hist_counts, bin_edges = np.histogram(qbers_arr, bins=10, range=(0.0, max(50.0, max_qber + 5.0)))
    distribution = [
        {
            'bin_label': f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}%",
            'range_min': round(float(bin_edges[i]), 1),
            'range_max': round(float(bin_edges[i+1]), 1),
            'count': int(hist_counts[i])
        }
        for i in range(len(hist_counts))
    ]

    eve_p = c.eve_intensity if c.eve else 0.0
    noise_p = c.noise_probability if c.noise else 0.0
    theoretical_qber = round(100.0 * ((eve_p * 0.25) * (1.0 - noise_p) + (1.0 - eve_p * 0.25) * noise_p), 2)

    return {
        'runs_count': runs,
        'mean_qber': round(mean_qber, 2),
        'std_qber': round(std_qber, 2),
        'min_qber': round(min_qber, 2),
        'max_qber': round(max_qber, 2),
        'ci95_lower': ci_lower,
        'ci95_upper': ci_upper,
        'theoretical_qber': theoretical_qber,
        'threshold': c.threshold,
        'pass_count': statuses.get('PASS', 0),
        'abort_count': statuses.get('ABORT', 0),
        'insufficient_count': statuses.get('INSUFFICIENT_DATA', 0),
        'pass_rate': round(100.0 * statuses.get('PASS', 0) / runs, 1),
        'mean_sifted': round(float(np.mean(sifted_sizes)), 1),
        'mean_sample_size': round(float(np.mean(sample_sizes)), 1),
        'distribution': distribution,
        'runs_summary': runs_summary,
        'confidence_notes': (
            f"Based on {runs} repeated independent simulations with finite-sample variance. "
            f"The 95% confidence interval for the true mean QBER is [{ci_lower}%, {ci_upper}%]. "
            "Finite block size causes statistical fluctuation around theoretical expectations."
        )
    }

def post_process_key(simulation_result: Dict[str, Any]) -> Dict[str, Any]:
    """Educational demonstration of QKD Key Post-Processing:
    1. Parameter estimation (already done)
    2. Error reconciliation (block parity check Cascade-style)
    3. Information leakage accounting
    4. Privacy amplification (universal hashing)
    """
    status = simulation_result.get('status')
    if status == 'ABORT':
        return {
            'status': 'ABORTED',
            'message': 'Cannot post-process key: QBER threshold exceeded. Key establishment aborted.',
            'stages': []
        }
    if status == 'INSUFFICIENT_DATA':
        return {
            'status': 'HELD',
            'message': 'Cannot post-process key: insufficient sifted sample to estimate channel leakage safely.',
            'stages': []
        }

    bits = simulation_result.get('bits', [])
    # Candidate key bits: sifted matching positions that were NOT disclosed for QBER test
    candidate_alice = [b['alice'] for b in bits if not b['discard'] and not b['sample']]
    candidate_bob = [b['bob'] for b in bits if not b['discard'] and not b['sample']]
    raw_length = len(candidate_alice)

    if raw_length == 0:
        return {
            'status': 'INSUFFICIENT_DATA',
            'message': 'No candidate bits remain after disclosure of sample bits. Use a larger transmission size.',
            'stages': []
        }

    # Stage 1: Parameter Estimation
    qber = simulation_result.get('qber', 0.0) or 0.0
    qber_frac = min(0.5, qber / 100.0)

    # Shannon binary entropy h(e) = -e log2(e) - (1-e) log2(1-e)
    if qber_frac <= 0.0:
        shannon_entropy = 0.0
    elif qber_frac >= 0.5:
        shannon_entropy = 1.0
    else:
        shannon_entropy = - (qber_frac * math.log2(qber_frac) + (1.0 - qber_frac) * math.log2(1.0 - qber_frac))

    # Stage 2: Error Reconciliation (Parity-block correction demo)
    block_size = max(2, min(8, int(1.0 / max(0.01, qber_frac)))) if qber_frac > 0 else 8
    reconciled_bob = candidate_bob.copy()
    blocks_count = math.ceil(raw_length / block_size)
    reconciled_errors = 0
    leaked_parity_bits = 0

    for blk in range(blocks_count):
        start = blk * block_size
        end = min(raw_length, start + block_size)
        a_sub = candidate_alice[start:end]
        b_sub = reconciled_bob[start:end]
        a_parity = sum(a_sub) % 2
        b_parity = sum(b_sub) % 2
        leaked_parity_bits += 1

        if a_parity != b_parity:
            # Parity mismatch indicates an odd number of errors in this block.
            # In real Cascade, a binary search locates the error.
            # For demonstration, locate the first mismatch and correct it.
            for idx in range(start, end):
                if candidate_alice[idx] != reconciled_bob[idx]:
                    reconciled_bob[idx] = candidate_alice[idx]
                    reconciled_errors += 1
                    break

    # Stage 3: Information Leakage Accounting
    # Eve's known bits estimated as: raw_length * h(QBER) + leaked_parity_bits
    estimated_eve_info_bits = min(raw_length, int(raw_length * shannon_entropy + leaked_parity_bits))

    # Stage 4: Privacy Amplification (Universal Hashing demo)
    # Final secure key length = raw_length - estimated_eve_info_bits - security_parameter (e.g. 4 bits)
    security_param = 4
    final_length = max(0, raw_length - estimated_eve_info_bits - security_param)
    
    # Hash candidate bits into final cryptographic key string
    if final_length > 0:
        # Pseudo-random Toeplitz matrix compression simulation
        np_rng = np.random.default_rng(42)
        random_matrix = np_rng.integers(0, 2, (final_length, raw_length))
        final_bits = np.dot(random_matrix, np.array(candidate_alice)) % 2
        final_bit_string = ''.join(map(str, final_bits.tolist()))
        # Convert to hex bytes
        pad_len = (4 - len(final_bit_string) % 4) % 4
        padded = final_bit_string + '0' * pad_len
        hex_key = hex(int(padded, 2))[2:].upper() if padded else '0'
    else:
        final_bit_string = ''
        hex_key = 'INSUFFICIENT_KEY_LENGTH'

    return {
        'status': 'SUCCESS' if final_length > 0 else 'KEY_EXHAUSTED',
        'raw_candidate_bits': raw_length,
        'reconciled_errors_fixed': reconciled_errors,
        'reconciliation_efficiency': round(leaked_parity_bits / max(1, reconciled_errors), 2) if reconciled_errors > 0 else 1.0,
        'public_parity_bits_leaked': leaked_parity_bits,
        'shannon_entropy_per_bit': round(shannon_entropy, 4),
        'estimated_eve_knowledge_bits': estimated_eve_info_bits,
        'privacy_amplification_reduction_bits': raw_length - final_length,
        'final_secure_key_length': final_length,
        'final_key_hex': hex_key,
        'final_bit_sample': final_bit_string[:32] + ('...' if len(final_bit_string) > 32 else ''),
        'educational_notice': (
            'Demonstration post-processing model. Production QKD requires mathematically proven '
            'information-theoretic Cascade or LDPC error correction and 2-universal hash functions.'
        )
    }

def get_quantum_circuit_schema() -> Dict[str, Any]:
    """Provides schematic gate representation of the BB84 protocol for a single qubit."""
    return {
        'description': '1-Qubit Quantum Circuit model of BB84 protocol',
        'gates': [
            {'step': 1, 'actor': 'Alice', 'action': 'State Preparation', 'gate': '|0⟩', 'detail': 'Initialize single photon in ground state |0⟩'},
            {'step': 2, 'actor': 'Alice', 'action': 'Bit Encoding', 'gate': 'X (if bit=1)', 'detail': 'Pauli-X NOT gate flips |0⟩ to |1⟩ if Alice bit is 1'},
            {'step': 3, 'actor': 'Alice', 'action': 'Basis Encoding', 'gate': 'H (if basis=×)', 'detail': 'Hadamard gate maps computational to diagonal basis {|+⟩, |−⟩}'},
            {'step': 4, 'actor': 'Eve', 'action': 'Eavesdrop Measure', 'gate': 'H (if basis=×) + M', 'detail': 'Optional projection onto Eve chosen basis and state collapse'},
            {'step': 5, 'actor': 'Eve', 'action': 'Resend State', 'gate': 'Prep(Eve Outcome)', 'detail': 'Eve transmits replacement photon in her measured state'},
            {'step': 6, 'actor': 'Bob', 'action': 'Basis Selection', 'gate': 'H (if basis=×)', 'detail': 'Hadamard gate applied if Bob measures in diagonal basis'},
            {'step': 7, 'actor': 'Bob', 'action': 'Measurement', 'gate': 'Measurement [Z]', 'detail': 'Standard computational basis projective detector'}
        ],
        'fidelity_equations': {
            'matched_basis_no_eve': 'P(match) = 1.00 (100% fidelity without noise)',
            'mismatched_basis': 'P(match) = 0.50 (50% random discard)',
            'eve_intercept_matched_bob': 'P(Bob error | Eve intercept) = 25% due to non-commuting bases [X, Z] ≠ 0'
        }
    }
