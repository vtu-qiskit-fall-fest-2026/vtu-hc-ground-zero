"""QORVEX 2.0 — Institutional Quantum Security & Fintech Simulation Platform API.

Provides:
- Real-time BB84 Quantum Key Distribution simulations with partial intercept-resend
- Vectorized batch multi-run experiments with statistical confidence intervals
- Educational key post-processing (error reconciliation & privacy amplification)
- Quantum circuit model schemas
- Mock fintech payment gateway verification
- Persistent experiment history (SQLite) and exports (JSON, CSV, branded report)
"""
import csv
import io
import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, ConfigDict

from .simulation import Config, simulate, simulate_batch, post_process_key, get_quantum_circuit_schema

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "experiments.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                simulation_id TEXT PRIMARY KEY,
                timestamp TEXT,
                scenario TEXT,
                transmitted INTEGER,
                sifted INTEGER,
                sample_size INTEGER,
                mismatches INTEGER,
                qber REAL,
                theoretical_qber REAL,
                threshold REAL,
                eve_intensity REAL,
                noise_probability REAL,
                status TEXT,
                seed INTEGER,
                raw_json TEXT
            )
        """)
    conn.close()

init_db()

app = FastAPI(
    title="QORVEX 2.0 — Advanced Quantum Security & Fintech Simulation Platform",
    description="Educational BB84 QKD attack laboratory and fintech payment gating gateway.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for fast access
store: Dict[str, Dict[str, Any]] = {}

def save_experiment(res: Dict[str, Any]):
    uid = res["simulation_id"]
    store[uid] = res
    if len(store) > 200:
        store.pop(next(iter(store)))

    try:
        conn = sqlite3.connect(DB_PATH)
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO experiments (
                    simulation_id, timestamp, scenario, transmitted, sifted, sample_size,
                    mismatches, qber, theoretical_qber, threshold, eve_intensity,
                    noise_probability, status, seed, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                uid,
                datetime.now(timezone.utc).isoformat(),
                res.get("scenario", "custom"),
                res.get("transmitted", 0),
                res.get("sifted", 0),
                res.get("sample_size", 0),
                res.get("mismatches", 0),
                res.get("qber"),
                res.get("theoretical_qber"),
                res.get("threshold", 11.0),
                res.get("eve_intensity", 0.0),
                res.get("noise_probability", 0.0),
                res.get("status", "UNKNOWN"),
                res.get("seed"),
                json.dumps({k: v for k, v in res.items() if k != "bits"})  # exclude full bits from raw_json in DB
            ))
        conn.close()
    except Exception as e:
        print(f"Warning: Failed to persist experiment to SQLite: {e}")

# --- Request / Response Models ---

class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bits: int = Field(default=64, ge=16, le=100000, description="Total transmitted qubits")
    eve: bool = Field(default=False, description="Enable Eve interception")
    eve_intensity: float = Field(default=1.0, ge=0.0, le=1.0, description="Eve interception probability (0.0 to 1.0)")
    noise: bool = Field(default=False, description="Enable channel noise")
    noise_probability: float = Field(default=0.05, ge=0.0, le=0.30, description="Noise bit-flip probability")
    threshold: float = Field(default=11.0, ge=5.0, le=25.0, description="Configured QBER abort threshold (%)")
    sample_fraction: float = Field(default=0.35, gt=0.0, le=1.0, description="Fraction of sifted bits disclosed for test")
    min_sample: int = Field(default=5, ge=1, le=10000, description="Minimum test sample size")
    seed: Optional[int] = Field(default=None, ge=0, le=4294967295, description="Reproducible random seed")

class BatchSimulationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    runs: int = Field(default=100, ge=10, le=1000, description="Number of independent simulation runs")
    bits: int = Field(default=64, ge=16, le=10000)
    eve: bool = Field(default=False)
    eve_intensity: float = Field(default=1.0, ge=0.0, le=1.0)
    noise: bool = Field(default=False)
    noise_probability: float = Field(default=0.05, ge=0.0, le=0.30)
    threshold: float = Field(default=11.0, ge=5.0, le=25.0)
    sample_fraction: float = Field(default=0.35, gt=0.0, le=1.0)
    min_sample: int = Field(default=5, ge=1, le=10000)
    seed: Optional[int] = Field(default=None, ge=0, le=4294967295)

class PostProcessRequest(BaseModel):
    simulation_id: str

class PaymentRequest(BaseModel):
    simulation_id: str
    transaction_id: str = Field(default="QVX-DEMO-001", min_length=1, max_length=120)
    sender: str = Field(default="Demo Institutional Customer", min_length=1, max_length=100)
    receiver: str = Field(default="Global Clearing Merchant", min_length=1, max_length=100)
    amount: float = Field(default=5000.0, gt=0, le=1_000_000_000)
    currency: str = Field(default="INR", max_length=10)

# --- Endpoints ---

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "platform": "QORVEX Institutional Quantum Security & Fintech Laboratory",
        "scope": "education-only",
        "features": [
            "bb84_simulation",
            "partial_interception",
            "batch_experiments",
            "key_post_processing",
            "quantum_circuit_schema",
            "payment_gateway_demo",
            "persistent_history",
            "reports_export"
        ]
    }

@app.post("/api/simulations")
def run_simulation(req: SimulationRequest):
    cfg = Config(
        bits=req.bits,
        eve=req.eve,
        eve_intensity=req.eve_intensity,
        noise=req.noise,
        noise_probability=req.noise_probability,
        threshold=req.threshold,
        sample_fraction=req.sample_fraction,
        min_sample=req.min_sample,
        seed=req.seed
    )
    result = simulate(cfg)
    uid = str(uuid4())
    result["simulation_id"] = uid
    save_experiment(result)
    return result

@app.post("/api/simulations/batch")
def run_batch_simulation(req: BatchSimulationRequest):
    cfg = Config(
        bits=req.bits,
        eve=req.eve,
        eve_intensity=req.eve_intensity,
        noise=req.noise,
        noise_probability=req.noise_probability,
        threshold=req.threshold,
        sample_fraction=req.sample_fraction,
        min_sample=req.min_sample,
        seed=req.seed
    )
    batch_result = simulate_batch(cfg, runs=req.runs)
    return batch_result

@app.post("/api/simulations/post-processing")
def run_post_processing(req: PostProcessRequest):
    sim = store.get(req.simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found in active cache. Please run or rerun a simulation first.")
    processed = post_process_key(sim)
    return processed

@app.get("/api/simulations/circuit")
def get_circuit_schema():
    return get_quantum_circuit_schema()

@app.get("/api/simulations/{simulation_id}")
def get_simulation(simulation_id: str):
    if simulation_id in store:
        return store[simulation_id]
    
    # Check SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT raw_json FROM experiments WHERE simulation_id = ?", (simulation_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    raise HTTPException(404, "Simulation not found")

@app.post("/api/payments/demo/verify")
def payment_demo(req: PaymentRequest):
    result = store.get(req.simulation_id)
    if result is None:
        raise HTTPException(404, "Simulation not found. Run a key exchange first.")
    
    status = result["status"]
    outcome_map = {
        "PASS": "ADDITIONAL_VERIFICATION_REQUIRED",
        "ABORT": "BLOCKED",
        "INSUFFICIENT_DATA": "PENDING_INSUFFICIENT_DATA"
    }
    demo_status = outcome_map.get(status, "UNKNOWN")

    messages = {
        "PASS": "QBER is within allowable security threshold. Key session passed. In a real fintech system, separate independent identity and authorization checks are still required before funds can move.",
        "ABORT": "Simulated payment transaction BLOCKED. Excessive quantum channel disturbance detected (QBER exceeded threshold). Key establishment was aborted to protect payment integrity.",
        "INSUFFICIENT_DATA": "Simulated payment HELD on pending review. Sifted sample size was too small to statistically guarantee channel error rate. Run a larger transmission."
    }

    timeline = [
        {"step": "Initiated", "status": "COMPLETED", "detail": f"Mock order {req.transaction_id} of ₹{req.amount:,.2f} initiated"},
        {"step": "BB84 Key Exchange", "status": "COMPLETED", "detail": f"{result.get('transmitted')} bits transmitted across simulated quantum channel"},
        {"step": "QBER Security Evaluation", "status": "COMPLETED" if status != "INSUFFICIENT_DATA" else "WARNING", "detail": f"Measured QBER {result.get('qber', 0.0)}% vs threshold {result.get('threshold')}% ({status})"},
        {"step": "Simulated Payment Gate", "status": "APPROVED" if status == "PASS" else "REJECTED" if status == "ABORT" else "HELD", "detail": demo_status},
        {"step": "Independent Fintech Auth", "status": "PENDING", "detail": "Separate 2FA & banking authentication (outside QKD scope)"}
    ]

    return {
        "transaction_id": req.transaction_id,
        "sender": req.sender,
        "receiver": req.receiver,
        "amount": req.amount,
        "currency": req.currency,
        "simulation_id": req.simulation_id,
        "security_session_status": status,
        "demo_payment_status": demo_status,
        "money_transferred": False,
        "bank_contacted": False,
        "message": messages.get(status, "Unknown session state"),
        "timeline": timeline,
        "educational_notice": "DEMONSTRATION ONLY. No banking networks were contacted and no real funds exist or transferred."
    }

@app.get("/api/experiments/history")
def get_history(limit: int = Query(default=50, ge=1, le=200)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT simulation_id, timestamp, scenario, transmitted, sifted, sample_size,
               mismatches, qber, theoretical_qber, threshold, eve_intensity,
               noise_probability, status, seed
        FROM experiments
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"experiments": rows, "count": len(rows)}

@app.get("/api/experiments/export/json")
def export_json():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments ORDER BY timestamp DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return Response(
        content=json.dumps(rows, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=qorvex_experiments_export.json"}
    )

@app.get("/api/experiments/export/csv")
def export_csv():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT simulation_id, timestamp, scenario, transmitted, sifted, sample_size,
               mismatches, qber, theoretical_qber, threshold, eve_intensity,
               noise_probability, status, seed
        FROM experiments
        ORDER BY timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        for r in rows:
            writer.writerow(dict(r))
    else:
        output.write("simulation_id,timestamp,scenario,transmitted,sifted,sample_size,mismatches,qber,threshold,status\n")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=qorvex_experiments_export.csv"}
    )

@app.get("/api/experiments/export/report", response_class=HTMLResponse)
def export_branded_report():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments ORDER BY timestamp DESC LIMIT 25")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    total_runs = len(rows)
    passes = sum(1 for r in rows if r['status'] == 'PASS')
    aborts = sum(1 for r in rows if r['status'] == 'ABORT')
    insufficient = sum(1 for r in rows if r['status'] == 'INSUFFICIENT_DATA')

    rows_html = ""
    for r in rows:
        status_color = "#477C78" if r['status'] == 'PASS' else "#B7833F" if r['status'] == 'ABORT' else "#64717A"
        qber_val = f"{r['qber']:.2f}%" if r['qber'] is not None else "—"
        rows_html += f"""
        <tr>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;">{r['simulation_id'][:8]}...</td>
            <td>{r['timestamp'][:19].replace('T', ' ')}</td>
            <td style="text-transform:uppercase;font-weight:600;">{r['scenario']}</td>
            <td>{r['transmitted']}</td>
            <td>{r['sifted']}</td>
            <td>{r['sample_size']}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;">{qber_val}</td>
            <td style="font-family:'IBM Plex Mono',monospace;">{r['threshold']}%</td>
            <td><span style="color:{status_color};font-weight:800;font-family:'IBM Plex Mono',monospace;">{r['status']}</span></td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>QORVEX 2.0 — Executive Quantum Security Audit Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;600;700;800&display=swap');
  body {{ font-family: 'Inter', sans-serif; background: #F5F2EA; color: #17252F; margin: 0; padding: 40px; }}
  .sheet {{ max-width: 960px; margin: auto; background: #FFFDF7; border: 1px solid #D5D6D1; padding: 48px; box-shadow: 0 4px 20px rgba(23,37,47,0.06); }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #17252F; padding-bottom: 24px; margin-bottom: 32px; }}
  .title h1 {{ margin: 0 0 6px; font-size: 28px; letter-spacing: -0.5px; font-weight: 800; }}
  .title p {{ margin: 0; color: #64717A; font-size: 13px; font-family: 'IBM Plex Mono', monospace; }}
  .badge {{ background: #17252F; color: #F5F2EA; padding: 6px 14px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 1px; font-weight: 700; }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }}
  .summary-card {{ background: #F5F2EA; border: 1px solid #D5D6D1; padding: 18px; }}
  .summary-card small {{ display: block; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #64717A; letter-spacing: 0.5px; }}
  .summary-card strong {{ display: block; font-size: 24px; font-weight: 800; margin-top: 8px; color: #17252F; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }}
  th {{ background: #17252F; color: #F5F2EA; padding: 10px 12px; text-align: left; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #E5E4DE; }}
  tr:nth-child(even) {{ background: #FAF8F2; }}
  .disclaimer {{ margin-top: 40px; padding: 18px; background: #FAF8F2; border-left: 3px solid #B7833F; font-size: 11px; color: #64717A; line-height: 1.6; }}
  .print-btn {{ display: inline-block; background: #17252F; color: #F5F2EA; padding: 10px 18px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; font-family: 'IBM Plex Mono', monospace; margin-bottom: 20px; }}
  @media print {{ .print-btn {{ display: none; }} body {{ padding: 0; background: white; }} .sheet {{ border: none; box-shadow: none; padding: 0; }} }}
</style>
</head>
<body>
<div class="sheet">
  <button class="print-btn" onclick="window.print()">PRINT / SAVE AS PDF</button>
  <div class="header">
    <div class="title">
      <h1>QORVEX 2.0 — SECURITY AUDIT REPORT</h1>
      <p>PROTOCOL: BB84 QUANTUM KEY DISTRIBUTION & FINTECH GATEWAY</p>
    </div>
    <div class="badge">OFFICIAL DEMO REPORT</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <small>RECORDED RUNS</small>
      <strong>{total_runs}</strong>
    </div>
    <div class="summary-card">
      <small>SESSIONS PASSED</small>
      <strong style="color:#477C78;">{passes}</strong>
    </div>
    <div class="summary-card">
      <small>SESSIONS ABORTED</small>
      <strong style="color:#B7833F;">{aborts}</strong>
    </div>
    <div class="summary-card">
      <small>INSUFFICIENT DATA</small>
      <strong style="color:#64717A;">{insufficient}</strong>
    </div>
  </div>

  <h3 style="font-size:14px;letter-spacing:1px;font-family:'IBM Plex Mono',monospace;margin-bottom:8px;">RECENT AUDITED EXPERIMENT SESSIONS</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>TIMESTAMP</th><th>SCENARIO</th><th>TX</th><th>SIFTED</th><th>SAMPLE</th><th>QBER</th><th>THRESH</th><th>STATUS</th>
      </tr>
    </thead>
    <tbody>
      {rows_html if rows_html else '<tr><td colspan="9" style="text-align:center;padding:24px;">No simulation records logged yet.</td></tr>'}
    </tbody>
  </table>

  <div class="disclaimer">
    <strong>PROTOTYPE & SECURITY ACCURACY NOTICE:</strong><br>
    This report was generated by the QORVEX 2.0 educational quantum security laboratory. Calculations are computed using a classical simulation of the BB84 protocol. Quantum Bit Error Rate (QBER) indicates physical disturbance on the quantum channel caused either by an eavesdropper or natural decoherence/noise. A PASS outcome signifies only that the disclosed test sample did not exceed the configured threshold; it does not constitute proof that the channel is free of sophisticated adversaries or that a payment is authorized. Real payment security mandates independent authentication, integrity controls, and classical financial risk governance.
  </div>
</div>
</body>
</html>"""
    return HTMLResponse(content=html)
