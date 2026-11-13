# Submission 3 - Fleet & Incident

Author: Mai Hoang Phuong Dong - 2452265. Module owner: member 4.

This is the individual design contribution for Operator Fleet & Incident, including its assigned telemetry scope and the member-4 integration contribution to the team's architectural views. It builds on the submitted Submission 2 sections 1.4, 2.4, 3.4 and 4.4, plus the external telemetry flows in sections 2.7 and 3.7.

## Deliverable index

| Deliverable | Editable source / output |
| --- | --- |
| Individual report | [Submission3_Fleet_Incident_2452265.pdf](../../output/pdf/Submission3_Fleet_Incident_2452265.pdf) |
| Deployment view contribution | [PlantUML](deployment-view/Deployment_View.puml), [PNG](deployment-view/Deployment_View.png), [SVG](deployment-view/Deployment_View.svg) |
| Team Implementation view consolidation | [PlantUML](development-view/Implementation_View.puml), [PNG](development-view/Implementation_View.png), [SVG](development-view/Implementation_View.svg) |
| Individual class diagram | [PlantUML](class-diagram/fleet-incident/04-fleet-incident.puml), [PNG](class-diagram/fleet-incident/04-fleet-incident.png), [SVG](class-diagram/fleet-incident/04-fleet-incident.svg) |
| Complete method catalogue | [22 operation descriptions and data contracts](method-design/04-fleet-incident.md) |
| Bonus test cases | [14 acceptance test specifications](test-cases/04-fleet-incident.md) |
| Shared design agreement | [Architecture baseline](architectural-design/architecture_baseline.md) |

## Scope and architectural contribution

Deployment: Student and Operator browsers communicate with a single application/API process. A mock telemetry producer sends timestamped vehicle, parking and charging-point observations. FleetService, IncidentService, TelemetryAdapter and an internal health scheduler run inside the same process as the other five domain modules. JSON fixtures initialize authoritative in-memory state. The deployment diagram shows host/runtime/artifact placement; in-process dependencies are described by the Implementation view. The simulator may share the application laptop during the demonstration.

Implementation: presentation invokes authorized API handlers, which route to the six owning modules. Fleet aggregates Hub/resource data, coordinates transfers via Rental and Parking contracts, and handles point incidents via Charging. TelemetryAdapter validates intake then delegates reconciliation to each resource owner. Repository/Unit of Work contracts publish one consistent state and result record per command/event. What-if consumes a copied versioned snapshot; its recommendations do not modify live state.

The views are a proposed group design contribution, ready for review by the other owners. They are not evidence of a running integrated backend. Existing Submission 2 screens remain browser mockups; the current src and tests scaffolds are not expanded by this design task.

## Individual class design

Five owned classes cover the module: FleetService, IncidentService, TelemetryAdapter, RedistributionOrder and IncidentTicket. IncidentService is the one added service relative to the original four-class assignment; it keeps repair/restoration separate from transfer coordination. The architecture baseline records that ownership change.

The diagram shows attributes, 22 typed operations, entity associations and multiplicities. External classes MobilityHub, SharedVehicle and ChargingPoint retain their original owners. ParkingSession remains accessed through the Parking contract described in the method catalogue. IncidentTicket targets exactly one vehicle or charging point. An order keeps historical assigned IDs and a subset of confirmed arrivals; a vehicle may not have incompatible concurrent active commitments.

All class-diagram operations have exactly one method description. Data types, states, atomicity, request/event deduplication and error rules are defined alongside the catalogue. Method names refine the Submission 2 controller messages into application services without changing the core business rules.

## Critical behavior preserved from Submissions 1 and 2

- Dashboard queries are read-only and expose missing/stale data.
- Creating an assignment reserves resources but does not change physical location or occupancy.
- Only confirmed new arrivals change vehicle location and Hub counts; partial arrival and safe retries are supported.
- Faults restrict new allocations and flag affected incomplete transfers. Repair evidence and current owner checks are required before restoration.
- Telemetry cannot overwrite a valid booking/session, infer physical transfer completion or clear an unresolved incident from an idle report.
- All effects of a command/event, including its deduplication result, commit together within the single-process MVP.
- Background imbalance rules create alerts/recommendations, not live redistribution orders.

## Review handoff and limitations

Member 1 reviews Hub counters and the shared Deployment view. Member 2 reviews vehicle commitments and restriction/restoration. Member 3 reviews capacity and parking observation reconciliation. Member 5 reviews charging-point/session evidence and recovery. Member 6 reviews snapshot isolation and UC-to-method traceability. Proposed strict event ordering and freshness boundaries must use the same conventions across owners.

The 14 bonus cases specify success, rejection, concurrency, retry, failure, incident recurrence and cross-module effects. They are design-level acceptance specifications; backend execution remains future implementation work. In-memory state and deduplication records last for one process lifetime; a restart reloads fixtures. Durable recovery would require a persistent implementation of the same transaction contract.

## Sources and AI contribution

Sources: course brief, page 5 (Submission 3 deliverables); submitted Submission 2 report (Fleet and external telemetry sections); repository use-case catalogue, Operator Fleet & Incident scenarios, external_iot scenarios, non-interactive functional requirements, Submission 2 fleet sequence/state diagrams, and the Submission 3 task assignment and architecture baseline.

Generative AI disclosure: OpenAI Codex was used to assist with reviewing project materials, drafting and refining design documentation, and checking diagram rendering and method coverage. The student and team remain responsible for reviewing and understanding the submitted work.

## Rebuild and verification

Render the three referenced .puml files with PlantUML using -tpng and -tsvg. Then run `python3 docs/submission-3/tools/build_fleet_report.py` from the repository root with reportlab, Pillow and pypdf installed. The builder checks exact one-to-one operation coverage before exporting the PDF to output/pdf. It uses Arial from the macOS system font directory, with a ReportLab font fallback on other systems. Diagram pages use A3 sheets to preserve label readability; text pages use A4.
