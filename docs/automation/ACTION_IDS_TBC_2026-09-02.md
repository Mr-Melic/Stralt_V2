# ACTION_IDs — 2026-09-02 Telemetry-Driven Balance & Content Analyst

Durable ledger for the Master Technical Director and Report Action Orchestrator.  
Source: Telemetry-Driven Balance & Content Analyst (`2786666f-a4a0-11f1-a7d1-d6b4613131ce`).  
Full report: [`TELEMETRY_BALANCE_2026-09-02.md`](./TELEMETRY_BALANCE_2026-09-02.md).  
This run ships **docs only**. No balance or collector implementation.

---

## Still-open IDs (not re-filed)

| ACTION_ID | STATUS | Notes |
| :--- | :--- | :--- |
| `AQA-2026-08-30-012` | NEW | Smallest persist/victory/recap/shop counters. Still unimplemented at HEAD `58302bc`. Implement **off** the persist lock (`GTAD-2026-09-01-002`); do not enqueue on `progressPersistRef`. |
| `TBC-2026-08-31-001` | NEW | Keep this analyst gated until real rows exist. Validation from that ID: this report is still `WAITING_FOR_TELEMETRY` with a fresh search. |
| `TBC-2026-08-31-002` | NEW | Human-designed `battle_end` / `spell_cast` / discovery / Doka ledger set. Depends on AQA-012. Names must not be confused with SFX. |
| `TBC-2026-09-01-001` | NEW | Do not treat design docs, `longHorizonSim`, or debug click-trace as live telemetry. Still applies. |

Do not open a second persist-counter PR. Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID.

---

ACTION_ID: TBC-2026-09-02-001  
SOURCE_AUTOMATION: Telemetry-Driven Balance & Content Analyst  
TITLE: After 2026-09-01 gameplay merges (through GameKey shop), collectors and event rows are still absent  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: HEAD `58302bc` (`#258` GameKey shop). Prior TBC at `dd275aa`. `src/backend` and bindgen have 0 `recordTelemetry` / `adminGetTelemetry` / `telemetrySidecar` hits. GitHub code search for those symbols: `total_count: 0`. Open collector PRs: 0 (only `#259` EOP migration). `longHorizonSim.ts` 514–520 still `telemetry.available: false` (asserted at `longHorizonSim.test.ts` 65). Persistence table (`docs/ARCHITECTURE.md` 37–46) has no event store. AdminDashboard tabs 5534–5548 have no Intelligence tab. Event dumps: 0 `csv`/`jsonl`/`parquet` files.  
SYSTEMS_AFFECTED: Master Technical Director priority queue; Quality Auditor / Game Balance specialists; this analyst’s next cron; `longHorizonSim.telemetry.available`  
RECOMMENDED_ACTION: Keep TBC in WAITING_FOR_TELEMETRY. Do not open enemy, spell, XP, Doka, or GameKey retune PRs from this run. Do not treat `#258` shop or persist/combat merges as telemetry. Leave the gate until collectors 1–9 exist and ≥1 UTC day of rows is queryable.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None (does not re-file AQA-012 / TBC-08-31-002)  
REGRESSION_RISK: LOW (documentation / priority hygiene only).  
VALIDATION_REQUIRED: Next director or TBC run either still cites WAITING_FOR_TELEMETRY, or cites real event counts with sample sizes — not sim output, not SFX names, not wallet snapshots.  
STATUS: NEW

---

ACTION_ID: TBC-2026-09-02-002  
SOURCE_AUTOMATION: Telemetry-Driven Balance & Content Analyst  
TITLE: Do not treat sound-engine SoundEvent names spell_cast / battle_end as telemetry  
CATEGORY: telemetry  
PRIORITY: P3  
CONFIDENCE: HIGH  
EVIDENCE: `useSoundHooks.ts` 7–16 defines `SoundEvent` including `"spell_cast"` and `"battle_end"`. `soundEngine.ts` 272–275 plays a sine sweep; 306–310 plays an arpeggio. `WorldExploration.tsx` calls `playSound` with those names. No backend increment API, no append-only store, no export. A grep for `battle_end` / `spell_cast` in `src/` now hits audio, not collectors.  
SYSTEMS_AFFECTED: TBC / Quality Auditor search methodology; `longHorizonSim.telemetry.available`; future sidecar naming  
RECOMMENDED_ACTION: Classify `playSound("spell_cast"|"battle_end")` as audio. Do not flip the adequacy gate or `telemetry.available` from those strings. If collectors later reuse the same event names, they must be a distinct backend/export path, not the WebAudio switch.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW (search hygiene). HIGH only if someone later wires SFX dispatch into persist or treats tone playback as a win/loss counter.  
VALIDATION_REQUIRED: Next TBC grep table still separates SFX from collectors; `longHorizonSim.telemetry.available` stays false until real APIs are populated.  
STATUS: NEW
