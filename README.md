# QORVEX — BB84 Interactive Simulation

An **educational** BB84 quantum key distribution simulation with a React/TypeScript frontend and Python/FastAPI/NumPy backend. It does not contact a bank, transfer money, use quantum hardware, perform QKD privacy amplification/error correction, or authenticate real transactions.

## Requirements
- Python 3.10+ (tested with Python 3.13)
- Node.js 20+ and npm (Node 22 available in the build environment)
- Network access to npm for the initial `npm install` (not available in the build environment)

## Run in Windows PowerShell / VS Code
Open the `qorvex` folder in VS Code. In terminal 1:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend health: http://127.0.0.1:8000/api/health
Interactive API docs: http://127.0.0.1:8000/docs

In terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173

Optional: copy `frontend/.env.example` to `frontend/.env` and change `VITE_API_BASE_URL`.

## Tests / build
```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm run build
```

## Backend API
- `GET /api/health`: health/version.
- `POST /api/simulations`: JSON with `bits`, `eve`, `noise`, `noise_probability` (fraction), `threshold` (percentage), optional `seed`, `sample_fraction`, `min_sample`. Returns bit-level trace, sifted counts, sampled mismatches, sampled QBER, threshold and decision.
- `GET /api/simulations/{id}`: retrieve one of the most recent 100 in-memory sessions.
- `POST /api/payments/demo/verify`: requires `simulation_id`, optional mock payment metadata; returns a demo-only gate status, never authorizes or transfers funds.

## Assumptions / boundaries
- Alice, Bob and Eve select random bases; with Eve intercept-resend in an ideal channel, expected sifted QBER tends toward 25% for large samples.
- Public basis reconciliation is modeled, not cryptographically authenticated.
- A random disclosed fraction (default 35%) of sifted bits is used to estimate QBER. Those disclosed sample bits are not counted as candidates for future key material.
- `INSUFFICIENT_DATA`: fewer than 5 test bits by default. `ABORT`: sufficient sample but QBER strictly greater than configured threshold. Otherwise `PASS` refers **only** to the toy security policy.
- Noise flips Bob's measured bits according to a user-set Bernoulli probability; this is a simplified classical noise model.
- No real key derivation, error correction, privacy amplification, authenticated classical messaging, fraud detection or real payment verification.
- The frontend's bit-inspection rendering is capped at the first 128 positions; backend calculation uses the full sequence.
- The brand logo shown is a pixel crop from the supplied brand guide because a separate transparent/vector logo asset was not provided. No alternative logo was invented. Brand colors follow the guide; fonts use Inter and IBM Plex Mono from Google Fonts, with graceful fallback offline.
- API in-memory sessions are erased when the server stops. CORS is limited to local development origins.

## Troubleshooting
- `Failed to fetch` in the UI: start FastAPI, verify `/api/health`, and check frontend `.env`.
- Browser shows CORS issue: launch the frontend from `http://127.0.0.1:5173` or `http://localhost:5173`.
- PowerShell blocks virtualenv activation: use `Set-ExecutionPolicy -Scope Process Bypass` in that terminal.
- `npm install` requires npm registry connectivity; if offline, connect once and retry.

## Verification performed in creation environment
- `python -m pytest -q` in `backend`: **11 passed**.
- `npm install --offline --no-audit --no-fund` in `frontend`: **failed** (`ENOTCACHED`, React typing packages not cached).
- Frontend build **not executed** because npm dependencies were unavailable; verify with `npm install && npm run build` on a network-connected machine.
