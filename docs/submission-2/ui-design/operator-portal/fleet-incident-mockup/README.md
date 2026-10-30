# Operator Fleet & Incident UI mockup

This is a standalone front-end mockup for the three Operator screens assigned to the Fleet & Incident module. It uses the shared [UI guidelines](../../ui_guidelines.md) and loads sample data from `fixtures.json`.

## Screens

1. **Network Map** — UC-F01 and UC-F02: Hub distribution, occupancy, charging status, alerts, and data freshness.
2. **Fleet & Redistribution** — UC-F04 and UC-F05: feasibility check, assignment creation, and confirmation of actual arrivals.
3. **Incidents** — UC-I02: fault evidence, affected commitments, repair progress, and guarded restoration.

The **Simulate fault event** button demonstrates FR-NI-02 and FR-NI-07. It creates or reuses an open incident, restricts the affected vehicle, and marks its incomplete redistribution order at risk. The incident screen also lets the Operator record the response to affected commitments before repair verification and restoration. All edits are session-only mockup interactions.

## View locally

From this folder, run `python3 -m http.server 8765` and open `http://127.0.0.1:8765/` in a browser. A local server is needed because the page loads `fixtures.json` with `fetch()`.

## Export submission images

`capture_mockups.cjs` exports the three `UI_OPERATOR_*.png` images to the parent `operator-portal/` folder at a 1440-pixel viewport, then checks the transfer and incident interactions. It requires Node.js, Playwright, and a local Chromium-compatible browser. For example, with Playwright available on `NODE_PATH`, run `node capture_mockups.cjs`.

The UI is a design prototype. Its in-memory transitions illustrate the documented rules; production authentication, persistent transactions, physical transfer, and actual telemetry integration are not part of this mockup.
