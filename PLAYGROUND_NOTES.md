# QORVEX Quantum Playground — implementation notes

The existing QORVEX 2.0 structure is retained. The **BB84 Lab** navigation tab now displays `QuantumPlayground.tsx` instead of the previous static step visualizer. Other tabs and existing backend/API modules remain intact.

## What is functional

- Alice/Eve/Bob SVG scene, polarization symbols and recorded bit-state playback.
- Drag Eve on/off the channel to configure the **next** simulated run.
- Clean, full interception, partial interception, noise-only and combined scenario presets.
- Seed, bit-count, threshold, noise and interception-intensity controls.
- Play/pause, step, replay, adjustable speed and seekable timeline over the recorded simulation.
- Actual QBER derived from sample bits returned by the existing API.
- Sifting ribbon, bit inspector, running sampled QBER graph and PASS/ABORT/INSUFFICIENT_DATA display.
- Three experience modes: discover tutorial, spy comparison, and threshold-decision challenge.
- Desktop/mobile responsive layout, keyboard-focus styling and reduced-motion handling.
- Simulation engine indicator distinguishes Python backend from browser fallback.

## Important limitations and honest scope

- The animation is a **playback of authentic simulated outcomes**, not quantum hardware nor real-time streaming of photons. For accuracy, changes to Eve/noise configure the next run; they do not alter already recorded results.
- The on-screen animation uses discrete bit-event progression, not a physically modeled optical propagation system.
- The QBER gauge and timeline are animated from actual returned records; statistical confidence bands and manual basis overrides are not implemented here.
- Sound is disabled; the UI explicitly identifies it as silent mode. No fabricated sound effect is presented.
- The original standalone browser fallback in `src/api.ts` is unmodified; its seed support should be verified before relying on reproducibility in offline mode. Python backend seed replay is the preferred reproducible mode.
- The Security Challenge is a short policy-decision exercise, not yet a multi-level scored game.
- The QBER test cannot establish an attacker or authorize real payments.

## Verification in this environment

- `python -m pytest -q backend/tests`: **16 passed**.
- `npm ci --offline`: not completed: npm cache lacks dependency `yallist`.
- `npm run build`: **not verified** here because frontend dependencies are incomplete; TypeScript reports missing `@types/react` and other package type declarations.

## Run on a development workstation

From `frontend/` run `npm ci` then `npm run build` / `npm run dev` with working npm registry access. From `backend/` install `requirements.txt`, then run `uvicorn app.main:app --reload`. See the existing README for the original setup.
