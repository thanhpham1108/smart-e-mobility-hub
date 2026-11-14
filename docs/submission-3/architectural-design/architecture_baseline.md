# Architecture baseline — Submission 3

This is the team's starting contract for the required deployment and development/implementation views. It follows the [course brief](../../BTL_SoftwareEngineering_HK26_v1.pdf), [use-case catalogue](../../submission-1/use-case-diagram/use-case-catalogue.md), [non-functional requirements](../../submission-1/non-functional-requirements/non_functional_requirements.md), and Submission 2 interaction/state diagrams. It is a design model, not a claim that the MVP is already implemented.

## Deployment view

The [deployment diagram](../deployment-view/Deployment_View.puml) shows Student and Operator devices, each running a browser and portal artifact. Both connect over HTTPS to one application host. Its Web/API process contains API handlers, the six domain modules, an internal scheduler, and authoritative in-memory state with audit/event results. JSON fixtures on the same host seed state at startup. A separate telemetry simulator host sends identified, timestamped events to the API over authenticated HTTPS. The operating system is left unspecified. A physical IoT gateway, production database, separate web server and redundant application host are not part of this MVP design.

The browser may keep an in-progress selection in session/local storage, but authoritative reservation, charging, and vehicle state belongs to the application process. This prevents two clients from independently confirming the same resource. The API checks sessions, roles and telemetry sources; the process records key state transitions and request/event results for observation. Duplicate submissions and stale telemetry are handled idempotently. State and audit results last for the process lifetime; restart reloads JSON fixtures.

## Development/implementation view

The [development view](../development-view/Implementation_View.puml) is a UML component diagram of four layers: Presentation, Application, Domain modules, and Shared layer (contracts and data adapter). The six domain modules match the six owners in [task_assignment.md](../task_assignment.md). Dashed arrows denote compile-time/service-contract dependencies, not separate deployed machines. To keep the diagram readable, it shows only the main layer dependencies and What-if's snapshot read; the table below defines the module-to-module contracts.

Student and Operator Portals call API handlers, which check sessions, roles and telemetry sources before dispatching to the owning domain service. The internal scheduler evaluates future-start charging eligibility and invokes expiry, timeout and health checks. Domain owners write through Repository/Unit of Work contracts into the single in-memory adapter. What-if copies a versioned snapshot and does not write live state. UI components do not allocate resources or change lifecycle states themselves.

| Contract | Owner/provider | Consumers and rule |
| --- | --- | --- |
| Authentication and role check | Hub & Identity | All protected Student/Operator actions must verify the session and role. |
| Hub search, status, and alternatives | Hub & Identity | Rental and Parking request feasible alternatives; Fleet and What-if read Hub status. |
| Vehicle availability and rental state | Vehicle Rental | Fleet applies operational restrictions through an explicit service/port; What-if receives a snapshot. |
| Parking capacity and sessions | Parking & Private EV | Charging checks the linked parking window; What-if receives a snapshot. |
| Incident and telemetry intake | Fleet & Incident | Faults restrict Rental vehicles or Charging points through the owning module; telemetry does not override a committed booking/session. |
| Charging request and schedule | Smart Charging | Parking submits/cancels private-EV requests; Fleet reports point faults; What-if receives a snapshot. |
| Network snapshot | What-if Simulation | Reads versioned state from Hub, Rental, Parking, Fleet, and Charging. A simulation run mutates only its own snapshot. |

### Parking and Smart Charging handoff

ParkingService owns per-slot parking holds and actual occupancy. It checks capacity across the full interval for reservation review and confirmation. Rental can query capacity for returns, and Fleet forwards validated occupancy observations for comparison with the parking ledger. A discrepancy is available for operator review and cannot itself admit or check out a vehicle. The Student Portal sends the selected reference or QR to the API. The optional gate visualization runs only after a logical check-in succeeds.

| Caller → provider | Data and decision |
| --- | --- |
| Parking → Hub & Identity | Verify the Student session and obtain Hub status. On request, obtain alternative Hubs and recheck the chosen Hub's full parking interval. |
| Parking → Smart Charging | Submit the owned parking reference, Hub, vehicle, battery levels and requested window. Read back the request status and allocation for booking details. Charging owns creation, cancellation, allocation release and any confirmed stop. |
| Smart Charging → Parking | Read the linked parking window and current eligibility before accepting or starting charging. Serialize the final decision with parking cancellation, checkout and no-show expiry. |
| Parking and Smart Charging → shared in-memory state | Within the single application process, commit a parking transition and its dependent charging cancellations/releases as one update. A charging-only cancellation leaves the parking holds intact. Stopping Active charging for checkout is a separate confirmed step. |

[Parking class diagram](../class-diagram/parking/03-parking-private-ev.puml) · [Method contracts](../method-design/03-parking-private-ev.md) · [Acceptance cases](../test-cases/03-parking-private-ev.md)

## Shared design rules

1. **Single ownership:** One module defines each entity and its state transitions. Other modules use identifiers and service/port contracts rather than duplicate class definitions.
2. **Reservation integrity:** Recheck availability at confirmation. Allocate an entire requested interval or nothing, and make retries return the original result rather than duplicate records.
3. **Time:** Use ISO 8601 timestamps normalized to GMT+7 for user-facing intervals and queue order. Compare charging request submission timestamps exactly for the FCFS tie rule.
4. **Charging policy:** Process eligible requests by submission time, oldest first. Only identical timestamps are ordered by lower battery percentage first. A future-start request is Waiting without an allocation until its requested start. A currently eligible request blocked by full capacity is Waiting and returns Full with its waitlist position. The planned end time and duration estimate are display-only; they never release an active point or reject a valid request. Promote eligible Waiting requests when capacity actually opens; expire them when their requested window ends. Do not guarantee future point assignments.
5. **Telemetry:** Verify source, resource identity, timestamp, freshness, and duplicates. A reported fault restricts new allocations; an idle observation does not cancel a held Scheduled allocation.
6. **Simulation isolation:** Clone the live network snapshot for each run. Recommendations are reviewable outputs and never apply themselves to live operations.

The method catalogues should describe the inputs, outputs, effects, and failure behavior necessary to enforce these rules. Every operation drawn in a class diagram must have exactly one matching description.

## Member 4 detailed design contribution

The [Fleet & Incident class design](../class-diagram/fleet-incident/04-fleet-incident.puml) retains member 4 ownership of `RedistributionOrder`, `IncidentTicket`, `FleetService` and `TelemetryAdapter`, and adds `IncidentService` to separate incident recovery from transfer coordination. This is a refinement within the existing Fleet & Incident module. Its DTOs, lifecycle guards, owner contracts and all operation descriptions are defined in [the method catalogue](../method-design/04-fleet-incident.md).

The development view locates Fleet & Incident telemetry intake and the internal scheduler within the application. The contracts above define the detailed routing: Fleet reads Hub/Charging status, checks capacity through Parking and updates vehicle state through Rental. IncidentService applies resource restrictions/restoration through Rental or Charging. TelemetryAdapter does not own parking or charging sessions. Simulation receives copied, versioned Fleet/Incident data through the shared snapshot contract.

For this single-process MVP, all authoritative owner writes participate in one staged Unit of Work guarded by the application state lock. Commit publishes resource changes, request/event result and audit together; failure discards the working copy. Idempotency is scoped by principal/provider, operation/event ID and payload hash. Identical retries return the original result; conflicting payload reuse rejects. This guarantee lasts for the process lifetime with in-memory storage. A persistent backend would need to persist both state and idempotency records atomically.

Telemetry's observed location is distinct from confirmed redistribution arrival; UC-F05 remains the authority for transfer completion. A healthy or idle observation cannot clear unresolved incidents, rentals or held Scheduled allocations. Dashboard freshness becomes stale at the configured interval boundary; non-duplicate equal-timestamp observations are rejected by the proposed strict ordering policy. These are explicit design decisions to review with the resource owners.

The updated architectural views are member 4's integration contribution for group review. They do not certify implementation or completion of the other five class designs. Review handoff: member 1 for Hub/projections and deployment aggregation; member 2 for vehicle commitments; member 3 for capacity/reconciliation; member 5 for point/session faults and recovery; member 6 for copied snapshots.
