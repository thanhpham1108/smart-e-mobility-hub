# Operator Portal - What-if Simulation Mockups

This package contains the three Operator screens assigned to Member 6.

| Screen | Use cases | Screenshot |
| --- | --- | --- |
| Configure operating scenario | UC-W01 | `UI_OPERATOR_Configure_WhatIf_Scenario.png` |
| Simulation results and recommendations | UC-W03, UC-W04 | `UI_OPERATOR_Simulation_Results.png` |
| Compare completed scenarios | UC-W05 | `UI_OPERATOR_Compare_Scenarios.png` |

## Run locally

Open `index.html` directly, or serve this directory with a local HTTP server. The prototype is self-contained and uses fictional, deterministic data.

## Export and verify screenshots

Run `capture_mockups.cjs` with Node.js, Playwright and a local Chromium installation. The script exports each screen at exactly 1440 x 900, rejects viewport overflow, verifies that saving creates a `ReadyToRun` scenario without starting a run, then exercises an isolated simulation and a read-only comparison without changing the live-network fixture.

The UI follows the shared emerald/cyan/slate design system and the Operator Portal layout. It is a design prototype; it does not connect to a backend, IoT gateway or production simulation engine.
