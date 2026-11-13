# Architecture baseline — Submission 3

This is the team's starting contract for the required deployment and development/implementation views. It follows the [course brief](../../BTL_SoftwareEngineering_HK26_v1.pdf), [use-case catalogue](../../submission-1/use-case-diagram/use-case-catalogue.md), [non-functional requirements](../../submission-1/non-functional-requirements/non_functional_requirements.md), and Submission 2 interaction/state diagrams. It is a design model, not a claim that the MVP is already implemented.

## Deployment view

The [deployment diagram](../deployment-view/Deployment_View.puml) has two browser clients: Student Portal and Operator Portal. They call one application/API process, which serves the UI and hosts the six domain modules. JSON fixtures seed an in-memory state store for the MVP. A separate telemetry simulator sends identified, timestamped events to the application's telemetry endpoint. A physical IoT gateway and a production database are not required by the brief.

The browser may keep an in-progress selection in session/local storage, but authoritative reservation, charging, and vehicle state belongs to the application process. This prevents two clients from independently confirming the same resource. The application checks role permissions for each operation and treats duplicate submissions and stale telemetry idempotently.

## Development/implementation view

The [implementation diagram](../development-view/Implementation_View.puml) separates presentation, application/domain modules, shared contracts, and data adapters. The six domain modules match the six owners in [task_assignment.md](../task_assignment.md). Controllers/API handlers validate requests and delegate business decisions to their owning service; UI components do not allocate resources or change lifecycle states themselves.

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
4. **Charging policy:** Process pending requests by submission time, oldest first. Only identical timestamps are ordered by lower battery percentage first. An unavailable point or conflicting interval remains unscheduled with a reason.
5. **Telemetry:** Verify source, resource identity, timestamp, freshness, and duplicates. A reported fault restricts new allocations; an idle observation does not cancel a future allocation.
6. **Simulation isolation:** Clone the live network snapshot for each run. Recommendations are reviewable outputs and never apply themselves to live operations.

The method catalogues should describe the inputs, outputs, effects, and failure behavior necessary to enforce these rules. Every operation drawn in a class diagram must have exactly one matching description.
