# Deployment view — Smart E-Mobility Hub

[PlantUML source](Deployment_View.puml) · [PNG](Deployment_View.png) · [SVG](Deployment_View.svg)

This is the runtime deployment model for the course MVP. A `«device»` is a machine or user device; a nested `«executionEnvironment»` is where software runs; each green `«artifact»` is deployed software or data. Solid lines between devices are communication paths. The [development view](../development-view/Implementation_View.puml) describes dependencies among the six modules in detail.

| Device | Runtime and deployed artifacts | Responsibility |
| --- | --- | --- |
| Student device | Browser → Student Portal | Student actions, display and temporary form/selection state. |
| Operator device | Browser → Operator Portal | Operations, schedules, incidents and simulation results. |
| Application host | One Web/API process → HTTPS API handlers, six domain modules, internal scheduler, authoritative in-memory state and audit/event log; JSON seed fixtures on the host | Authenticate and route requests; make resource decisions in one process; reconcile expiry and charging start timeouts; record state changes. |
| Telemetry simulator host | Mock event producer | Send identified, timestamped vehicle, parking and charging observations. |

## Communication, data and operation

- Both browser devices call the application host over HTTPS. The telemetry simulator sends authenticated events to the same API. The six modules communicate within the one process; there is no network hop between them.
- The API checks Student/Operator session and role, and validates the telemetry source. Authoritative reservations, vehicle state and charging allocations are held in the application process, not in browser storage.
- JSON fixtures initialize the in-memory state when the process starts. The Unit of Work coordinates dependent changes and the request/event ledger handles retries. Restarting the process reloads fixtures; this MVP does not promise durable operational state.
- The internal scheduler evaluates future-start charging requests when their requested start arrives, runs parking and charging waitlist expiry, applies the 15-minute charging start timeout and triggers Fleet health checks. A planned charging end does not free an active point; a verified stop or target-reached event does. The audit/event log records important state transitions and failures for demonstration and inspection.
- Fleet assignments commit vehicles without reserving destination Hub capacity. Arrival confirmation checks that capacity again before changing vehicle location or occupancy.
- This design uses one application host without failover. The operating system is not fixed by the course design. The telemetry source is a simulator; a physical IoT gateway, production database and external monitoring platform are outside this MVP deployment.
