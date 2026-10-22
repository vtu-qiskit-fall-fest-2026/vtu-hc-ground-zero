# HTML baseline → full-stack mapping

| Baseline capability | React UI | Python backend | Test |
|---|---|---|---|
| Scenario presets: clean, Eve, noise, combined | Scenario selector in App.tsx | `simulation.py::simulate` | `test_ideal`, `test_eve_rate`, `test_noise_rate`, `test_combined_rate` |
| Transmission size | Controls | Request `bits` | `test_validation` |
| Eve / noise controls | Scenario-linked status and noise slider | `Config.eve/noise/noise_probability` | Combined/noise/eve tests |
| Bases, sifting, bit-level inspection | Communication pathway, bit grid | Returns every bit's Alice/Bob bases and flags | Ideal/Eve tests |
| QBER measurement and threshold | QBER gauge | Sampled error count / test sample size | `test_threshold`, `test_eve_rate` |
| PASS / ABORT / insufficient | Decision panel | `simulate` decision policy | `test_insufficient`, `test_threshold` |
| Event log | Session trace | API results provide log facts | API test payload |
| Payment demo | Mock ₹5,000 panel | `/api/payments/demo/verify` | `test_payment_outcomes` |
| Repeated seeded simulation | Seed input | NumPy Generator(seed) | `test_seed_reproducible` |
| Reset / loading / API failure | React state / reset | N/A | Manual browser check pending |

Baseline differences: original UI used independent toggles and offered smaller transmission sizes; new UI has four explicit combined scenario presets and additional larger sizes for stable statistical demonstrations. The sample and decision policy remain visible and configurable. Backend results rather than JavaScript determine QBER and session status.
