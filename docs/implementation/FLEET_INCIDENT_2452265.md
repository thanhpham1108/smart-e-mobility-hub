# Fleet & Incident — Mai Hoàng Phương Đông (2452265)

## Delivered scope

The Operator routes `#/operator/network`, `#/operator/fleet` and `#/operator/incidents` use the shared sidebar, demo clock, anonymous demo identity and PostgreSQL RPCs. Their feature service is `src/modules/fleet-incident/service.js`; UI code is scoped by `.fi-page` and does not replace another member's shell.

- **Network:** Hub selection, aggregate availability/utilization, low-supply and capacity alerts, stale observations, vehicle/point inspection, active charging commitments, restrictions and occupancy discrepancies.
- **Redistribution:** read-only feasibility review, confirmation token, vehicle commitment, dispatch, atomic arrival of a selected subset, partial progress, at-risk diagnosis/revalidation, cancellation before departure or after verified source disposition, and activity history.
- **Incidents:** report/evidence deduplication by resource and fault reference; investigation; assigned repair plan; repair evidence; explicit recovery verification; resolution and closure. Each ticket owns one restriction.
- **Telemetry:** identified vehicle, point and parking observations; timestamp and value validation; exact-event replay; automatic fault tickets; separate observed/confirmed location; occupancy reconciliation. A healthy observation does not resolve an incident or stop an active charging session.

## Database migration and release

Apply `supabase/migrations/20261121000700_fleet_incident.sql` after `20261121000600_demo_access.sql`, **before deploying the dependent frontend**. It adds five private tables: `fleet_policy`, `fleet_observations`, `incident_history`, `transfer_history`, `fleet_event_results`. Existing orders/tickets receive version and workflow fields. Existing AtRisk orders retain their inferred physical stage. The migration does not reset the shared dataset.

The public demo/account RPC entry points remain unchanged. New private helpers are not executable by browser roles. The reset wrapper clears observations, and foreign-key cascades clear ticket/order/event history. No service-role key is required in the browser.

This work was verified on a disposable PGlite PostgreSQL instance. Hosted Supabase deployment and teammate review are still integration/release steps; no shared demo reset, push or deployment was performed during implementation.

## Feature contracts

Payloads below use browser camelCase. Existing SQL row fields are camelized by the shared backend client.

| Read/command | Required inputs | Result / invariant |
| --- | --- | --- |
| `fleet.validate` read | `sourceHubId`, `destinationHubId`, `vehicleIds[]` | `feasible`, `reasons[]`, `availableCapacity`, `validationToken`; no hold or write |
| `fleet.create` | Same reviewed selection + `validationToken` | Rechecks current state; commits vehicles without moving them or holding destination capacity |
| `fleet.dispatch` | `orderId`, `expectedVersion` | Planned → Dispatched; releases source spaces, retains last confirmed Hub |
| `fleet.arrive` | `orderId`, `expectedVersion`, `vehicleIds[]` | Confirms only the selected outstanding vehicles; all selected arrivals succeed or none move |
| `fleet.revalidate` | `orderId`, `expectedVersion` | AtRisk → previous stage after current resource/capacity checks |
| `fleet.cancel` | `orderId`, `expectedVersion`; dispatched AtRisk additionally requires `sourceDispositionVerified: true`, `note` | Releases only outstanding commitments after confirming source disposition and capacity; preserves all prior arrivals |
| `incident.report` | Exactly one of `vehicleId` / `pointId`, `description`; optional `faultKey`, `severity` | Creates/reuses a nonclosed ticket for the resource/fault; repeated evidence invalidates earlier repair verification |
| `incident.investigate` | `incidentId`, `expectedVersion` | Open → Investigating |
| `incident.plan` | Above + `assignee`, `note` | Investigating → ActionAssigned |
| `incident.repair` | Above + `note`, `complete` boolean | ActionAssigned/InRepair → InRepair; completed evidence required for resolution |
| `incident.resolve` | `incidentId`, `expectedVersion`, `verified: true` | InRepair → Resolved; lifts only this ticket's restriction |
| `incident.close` | `incidentId`, `expectedVersion` | Resolved → Closed; keeps history |
| `telemetry.vehicle` | `eventId`, `vehicleId`, `batteryPercent`; optional `observedAt`, `condition`, `observedHubId`, `faultKey`, `description` | Valid battery/condition evidence; does not infer physical movement |
| `telemetry.point` | `eventId`, `pointId`, `status`; optional observation/fault fields | Updates point condition, preserves active sessions/allocations and independent restrictions |
| `telemetry.parking` | `eventId`, `hubId`, `occupiedCount`; optional `observedAt` | Compares with physical ledger; mismatches block new admissions until a newer matching observation |

Telemetry timestamps must be no later than demo time, strictly less than 15 demo minutes old, and newer than the resource's preceding observation. The first sample may equal the seed timestamp. Matching event ID and payload returns `duplicate: true`; reusing an event ID with different data returns `EVENT_CONFLICT`. Faulty observations enter the same incident workflow as manual reports.

Transfer review and revalidation reject stale selected vehicle observations and destination capacity observations. After advancing the demo clock, send fresh vehicle observations and a matching parking count at the destination. Before any parking observation, the initial point snapshot provides the conservative Hub timestamp. An arrival confirmation itself attests current physical presence and always checks the current authoritative occupancy ledger.

Network freshness is conservative: a Hub is Live only when all its charging-point timestamps fall inside the configured 15-minute window. Stale Hubs show a freshness alert instead of supply/capacity recommendations. The latest timestamp is shown for inspection; individual point timestamps remain visible. Policy values are stored in `fleet_policy` (defaults: shortage below 2 vehicles, capacity warning at 85%).

### Cross-module effects

- Rental restrictions preserve RESERVED, IN_USE and REDISTRIBUTING commitments. Resolving one ticket does not clear another ticket or make a committed vehicle available.
- Shared Parking capacity is checked at review and again for arrival. A capacity failure rolls back the entire selected batch and records AtRisk. A subsequent partial arrival is allowed after revalidation if at least one space is available. Destination parking is never reserved by order creation. AtRisk cancellation after departure requires explicit source-return evidence and atomically admits all outstanding vehicles through `parking_return_transfer`; previously arrived vehicles stay untouched.
- `rental_incident_restriction`, `charging_incident_restriction`, `parking_observe` and the guarded `free_space`/`parking_review` functions are SQL integration boundaries. Vehicle arrival delegates to the existing atomic Fleet/Parking transaction. Members 2, 3 and 5 should review these boundaries before merging.
- Charging physical condition, incident restriction and session state are independent. Point recovery requires Operational telemetry and no reconciliation hold. Charging remains responsible for verified session stop and release.
- All commands use the existing serialized transaction and command receipt. Version checks prevent a stale tab from silently repeating an order/incident transition.

## Repeatable classroom demonstration

Start from **Reset Demo** on a local instance or an agreed shared-demo slot. Seed time is 09:00 ICT on 24 October 2026.

1. Open **Network Map**. Inspect KTX Khu A: `rental-a-01` and `rental-a-02` are available; inspect destination **Trường ĐH Bách khoa — Dĩ An** (`hcmut`) with two free spaces.
2. Open **Fleet & Redistribution**, source KTX Khu A, destination Dĩ An. Select both vehicles → **Review feasibility** → **Confirm reviewed transfer**. Show that vehicles are committed but destination parking is still free.
3. **Dispatch vehicles**. Select only `rental-a-01` → **Confirm selected arrivals**. Show **Partial, 1/2 arrived** and one newly occupied destination space.
4. Open **Incidents**. Report a fault on `rental-a-02` with reference `brake-demo`, priority High and a description. The outstanding transfer becomes AtRisk; the first arrival stays at destination.
5. **Start investigation** → enter repair owner and plan → **Assign repair plan** → enter repair evidence, check **Repair work is complete** → **Save repair update** → **Verify recovery and resolve** → **Close incident**.
6. Return to Fleet → **Revalidate order** → select `rental-a-02` → confirm arrival. Show **Completed, 2/2 arrived**. Inspect Network to verify both destination vehicles and occupancy.
7. In Network's **Telemetry simulator**, send a battery observation. **Replay same event** shows that no event or incident is applied twice. For another observation, advance **+15 min**, then **Use current demo time** before sending.

For the two-minute presentation slot, stop after step 3, show the prepared fault/repair ticket, then explain revalidation and completion using the captured screens. For a point-fault demonstration, use a free point such as `charge-a-03`; after repair, send a newer Operational observation before resolving. Use `charge-a-01` only when intentionally demonstrating preservation of its active charging session.

### Negative paths to demonstrate

- Select no vehicles or an ineligible source → clear review rejection.
- Submit new telemetry with the same resource timestamp → stale observation rejection; replay the same event → acknowledgement.
- Report a second fault reference on the same vehicle, resolve the first → the second restriction remains.
- Send parking occupancy different from the ledger → reconciliation warning; new admissions are blocked. Send a newer matching count after physical verification to clear it.
- Attempt to resolve before completed repair evidence, or before an Operational point observation → rejection.
- On a partial AtRisk order, open **Cancel remaining work after verified return**, record disposition evidence and confirm the outstanding vehicles are physically at source. Cancellation restores only those vehicles' source occupancy, preserving arrived vehicles and any active fault restrictions. Without evidence or sufficient source capacity, the entire cancellation is rejected.

## Verification and local preview

After installing the repository dependencies:

```bash
npm test
node scripts/fleet-preview.mjs
```

The preview serves `http://127.0.0.1:4173/#/operator/network` and runs the actual sorted migrations and RPCs in memory. Only this development server substitutes the Supabase transport with local RPC calls; production `backend.js` is unchanged. Stop it with Ctrl+C. Nothing persists after the server stops.

Optional browser regression: install Playwright in the development environment, ensure Chromium is available, start the preview, then run `node scripts/check-fleet-ui.mjs`. Alternatively set `PLAYWRIGHT_MODULE` to an installed `index.mjs` and `BROWSER_EXECUTABLE` to a compatible local browser. The script only targets loopback port 4173 and resets its disposable database.

Verified on 21 November 2026:

- Shared SQL regression: demo access, Parking/Charging, rental, retries, simulation isolation, reset.
- Fleet SQL integration: read-only/stale review, invalid selection, version conflict, dispatch, atomic failed arrival, partial arrival, incident-driven AtRisk, independent restrictions, repair gates, fault recurrence, telemetry duplication/order, physical occupancy mismatch and reset.
- Browser workflow: review → create → dispatch → partial arrival → incident repair/recovery → revalidate → completed transfer; telemetry replay, verified cancellation after partial arrival and draft preservation through polling. No page errors or horizontal page overflow at 1440, 1024 and 390 pixels.
- Screenshots are in [`output/fleet-incident/`](../../output/fleet-incident/): `01-network` through `07-telemetry-replay` form the ordered demonstration; `08-verified-cancellation` shows the alternate cancellation branch; additional width-specific captures document responsive layouts.

### MVP limits and lessons

Telemetry is simulated; physical repair, recovery, arrival and return-to-source are operator attestations. The network is schematic. Post-dispatch cancellation requires an AtRisk order and verified disposition of all outstanding vehicles at the source; it cannot abandon an unlocated vehicle. Automated rerouting to a third Hub is outside this slice.

PGlite checks PostgreSQL behavior but do not replace hosted PostgREST, Auth, browser-CORS and deployment checks. Test the merged migration on the team's Supabase environment before classroom rehearsal. Supabase schema deployment must precede frontend deployment.

The key implementation lesson is to keep observed state separate from confirmed movement and resource ownership. A healthy sample is evidence, a completed repair is a workflow milestone, and releasing an operational restriction is a separate verified transition.

## Generative AI declaration for the Final report

**Tool:** OpenAI Codex. **Scope:** interpreting the existing assignment/contracts; drafting Fleet & Incident UI/service logic, SQL migration, integration/browser tests and this handoff guide; running local checks and capturing screens. **Contribution level:** substantial AI-assisted implementation and documentation for Member 4. The feature owner must review and understand the generated code, replay the demo and validate cross-module behavior with Members 2, 3 and 5. No claim is made that human review or hosted acceptance has already occurred. Include this record when consolidating the team's required AI declaration.
