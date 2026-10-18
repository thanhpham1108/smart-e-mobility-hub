# External IoT & Telemetry — Use Case Scenarios

## Scenario Assumptions

- **External Telemetry Provider (ACT-03)** represents an IoT platform, gateway, or external device system that reports observations to Smart E-Mobility Hub. These scenarios describe the complete system. The MVP may use a simulator to provide equivalent events without integrating physical hardware.
- Provider identities and their permitted vehicles, Hubs, parking spaces, and charging points are configured. Each incoming update must be authenticated and authorized as a machine interaction; no Student or Operator login is required.
- Each event identifies its source, resource, observation time, and event identifier or equivalent reference for recognizing retries. Required measurements and session references depend on the event type. Observation times are retained as reported and validated; they are not rounded to the parking reservation's 15-minute time points.
- The system validates event format, resource mapping, value ranges, freshness, and ordering before applying an observation. An older event cannot overwrite a newer accepted state. Duplicate delivery returns the previous processing result without repeating occupancy changes, incident creation, or capacity release. Conflicting events with the same identity are rejected for investigation.
- Accepted observations and their related state changes are recorded consistently. A concurrent booking, check-in/checkout, scheduling change, or Operator action must be rechecked before the update is finalized. Reported physical condition, actual occupancy, and business commitments are reconciled rather than treated as interchangeable states.
- A fresh healthy report does not by itself resolve an open incident or remove an Operator-imposed restriction. Missing or invalid data does not prove that a vehicle, space, or charging point is available. Last accepted observation times remain visible; stale-data detection follows the configured policy in FR-NI-03.
- Simulated operational events used by the MVP follow the same validation rules. Events belonging to a What-if Simulation run affect only that run's state, not live operational records or bookings.

## UC-T01 — Update Vehicle Telemetry

| Field | Specification |
| --- | --- |
| Use-case ID | UC-T01 |
| Use-case name | Update Vehicle Telemetry |
| Use-case overview | Receive vehicle observations and update the fleet's reported location, battery level, and operational condition while preserving valid business commitments. |
| Actors | External Telemetry Provider |
| Preconditions | The telemetry interface is available. Provider permissions, vehicle identifiers, and telemetry-validation policies are configured. Source identity and vehicle access are checked during execution. |
| Trigger | The provider sends a periodic vehicle update or an event reporting a change in vehicle condition. |
| Relationships | Supplies data to UC-R02, UC-F01, and UC-F02. Fault evidence may create or update an incident subsequently handled through UC-I02; the Operator's handling is a separate interaction. Supports FR-NI-01, FR-NI-02, FR-NI-03, FR-NI-05, and FR-NI-07. |

### Steps — Acceptance Flow (Main Success Flow)

1. The provider submits the vehicle identifier, event reference, observation time, location or Hub information, battery level, and reported operational condition.
2. The system verifies the provider's identity and permission to report on that vehicle.
3. The system validates the vehicle and location identifiers, required fields, timestamp, battery range of 0–100%, and supported operational-condition values.
4. The system checks whether the event has already been processed and whether it is the first observation or is newer than the latest accepted observation under the configured ordering and freshness rules.
5. The system retrieves the vehicle's current reservations, rental, incident restrictions, and any redistribution assignment, then determines how the observation affects its reported status and eligibility for new allocations.
6. The system rechecks the current state and records the accepted observation, its source and observation time, and the resulting vehicle status as one consistent update. It preserves existing reservations and active rentals; receiving a location update alone does not confirm pickup, return, or redistribution completion.
7. The system makes the accepted location/Hub, battery level, reported condition, and freshness information available to the monitoring and vehicle-detail views.
8. The system acknowledges the event with its processing result and reference.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| T01-A1 | An accepted observation reports a fault or an ineligible condition at Step 5 | As part of Step 6, restrict new allocations and create a vehicle-failure incident, or append evidence to the equivalent open incident. Identify affected reservations, rentals, and redistribution assignments for Operator review; do not automatically complete or cancel them. Continue at Step 7. The Operator handles the incident separately through UC-I02. |
| T01-A2 | An identical event was already processed at Step 4 | Return the original processing result and end without reapplying the observation, refreshing its observation time, or creating another incident. |
| T01-A3 | A fresh healthy observation is received while an incident or Operator restriction remains open at Step 5 | Record the new observation and attach relevant evidence, but preserve the restriction until the applicable incident-handling process restores eligibility. Continue at Step 6. |
| T01-A4 | Reported location conflicts with the expected Hub or an incomplete redistribution assignment at Step 5 | Retain the accepted reported location and flag the discrepancy for Operator review. Preserve the business workflow state; do not mark a redistribution completed from telemetry alone. Continue at Step 6. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| T01-E1 | Source verification or authorization fails at Step 2 | Reject the update and record the access failure. Do not disclose protected vehicle details or change operational state. |
| T01-E2 | The vehicle is unknown or required telemetry is invalid at Step 3 | Reject the update with an appropriate validation result, such as unknown identifier, missing timestamp, or battery level outside 0–100%. Preserve the last accepted observation. |
| T01-E3 | The event is stale, out of order, or conflicts with a previously used event reference at Step 4 | Do not apply it to current state or advance data freshness. Return the reason; retain conflicting evidence for investigation where applicable. |
| T01-E4 | Required state cannot be read, or a concurrent change prevents a consistent update at Steps 5–6 | Do not acknowledge an applied update. Reload and re-evaluate the latest state before retrying; if that is not possible, report a retryable failure. Never overwrite a newer observation or business commitment. |
| T01-E5 | Saving fails or the acknowledgement is lost at Steps 6–8 | Do not leave a partial telemetry/incident update. For an uncertain outcome, retrieve the result using the original event reference before retrying; do not duplicate the update or incident effects. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The fresh observation and its effects are recorded once, or the original result is returned for an identical retry. Monitoring shows the accepted observation time. Faulted vehicles are restricted, and any required incident is available for Operator review. Existing business commitments are preserved or flagged for review. |
| Unsuccessful completion | A rejected update does not replace the last accepted state or reset its freshness. No partial update or duplicate incident is created. An uncertain result is reconciled before retrying. |

## UC-T02 — Update Parking Occupancy

| Field | Specification |
| --- | --- |
| Use-case ID | UC-T02 |
| Use-case name | Update Parking Occupancy |
| Use-case overview | Reconcile observed parking occupancy with the Hub's existing parking sessions and reservations so occupancy and availability remain consistent. |
| Actors | External Telemetry Provider |
| Preconditions | The telemetry interface is available. Provider permissions, Hub/space mappings, physical capacities, and the occupancy-reporting mode for each Hub are configured. |
| Trigger | The provider sends a parking-space occupancy change or a periodic Hub occupancy observation. |
| Relationships | Supplies occupancy information to UC-H03 and UC-F01 and to the availability checks in UC-S02. Reconciles with UC-P06 and UC-P07 without executing those Student flows. Supports FR-NI-03, FR-NI-05, and FR-NI-08. |

### Steps — Acceptance Flow (Main Success Flow)

1. The provider submits the Hub identifier, event reference, observation time, and either an identified space's occupied/free state or an aggregate occupied-space count, according to the configured reporting mode.
2. The system verifies the provider's identity and permission to report on the selected Hub or space.
3. The system validates the Hub/space mapping, timestamp, and occupancy values. A reported count must be a whole number between zero and the Hub's physical parking capacity.
4. The system checks for duplicate, stale, or out-of-order events against the accepted observation for the same reporting scope.
5. The system retrieves current occupancy records, active parking sessions, reserved capacity, and unavailable spaces, then reconciles the observation with them. Aggregate counts are treated as observations of total occupancy, not increments to add to existing sessions; a space-level observation must not count an already occupied space twice.
6. The system rechecks the current state and consistently records the reconciled occupancy, observation time, and any discrepancy. It updates availability using both occupancy and existing commitments; a free-space report does not release a reservation or confirm a Student's checkout.
7. The system exposes the occupancy, freshness, and any discrepancy in the relevant Hub and Operator views. Future parking requests still require sufficient capacity throughout their requested interval under UC-S02.
8. The system acknowledges the event with its processing result and reference.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| T02-A1 | The observation disagrees with active sessions or expected occupancy at Step 5 | Record the observed value separately from the expected value and raise or update a discrepancy for Operator review. Until reconciled, do not expose disputed capacity as newly available. Preserve reservations and session states, then continue at Step 6. |
| T02-A2 | The observation agrees with an already recorded check-in or checkout at Step 5 | Update the observation and its freshness without adding or subtracting occupancy again. Continue at Step 6. |
| T02-A3 | An identical event was already processed at Step 4 | Return the original processing result. Do not repeat occupancy changes, discrepancy alerts, or capacity release. End the use case. |
| T02-A4 | A fresh observation reports no physical change at Step 5 | Record the new observation time while keeping the occupancy count unchanged. Preserve reservations and unresolved discrepancies unless the new evidence resolves them under the reconciliation policy. Continue at Step 6. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| T02-E1 | Source verification or authorization fails at Step 2 | Reject the update and record the access failure without exposing protected Hub details or changing occupancy. |
| T02-E2 | The Hub/space is unknown, the reporting mode is unsupported, or the observation is invalid at Step 3 | Return the validation reason. Do not infer an empty Hub from missing data or apply an impossible count. Preserve the last accepted observation. |
| T02-E3 | The event is stale, out of order, or conflicts with a previous event reference at Step 4 | Reject it without replacing current occupancy or advancing freshness. Retain conflicting evidence for investigation where applicable. |
| T02-E4 | Required parking state is unavailable, or concurrent check-in/checkout or reservation changes prevent reconciliation at Steps 5–6 | Reload and reconcile against the latest state before applying the event. If consistency cannot be established, report a retryable failure and do not publish newly available capacity. |
| T02-E5 | Saving fails or the acknowledgement is lost at Steps 6–8 | Avoid partial occupancy and availability updates. Resolve an uncertain result using the original event reference before retrying; never count an observation or release capacity twice. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The observation is recorded once, or an identical retry returns its original result. Occupancy is reconciled without double-counting; unresolved differences are visible and disputed capacity is not newly offered. Parking reservations and sessions are not created, cancelled, checked in, or checked out by this observation. |
| Unsuccessful completion | Invalid or unverifiable observations do not overwrite accepted occupancy or make capacity appear free. No partial or duplicate occupancy change is made; uncertain outcomes are reconciled before retrying. |

## UC-T03 — Update Charging-Point Status

| Field | Specification |
| --- | --- |
| Use-case ID | UC-T03 |
| Use-case name | Update Charging-Point Status |
| Use-case overview | Receive charging-point condition and charging-session observations, reconcile them with the schedule, and maintain accurate status and resource availability. |
| Actors | External Telemetry Provider |
| Preconditions | The telemetry interface is available. Provider permissions, charging-point/Hub mappings, and supported point and session states are configured. Session-specific events must identify the relevant session and vehicle. |
| Trigger | The provider sends a charging-point status update, charging progress, a confirmed start/stop event, or a fault report. |
| Relationships | Supplies data to UC-H03, UC-F01, UC-F03, and UC-C01–UC-C03. Confirmed session outcomes inform UC-P07; faults may create or update an incident for later handling through UC-I03. Supports FR-NI-03, FR-NI-05, FR-NI-10, and FR-NI-11. |

### Steps — Acceptance Flow (Main Success Flow)

1. The provider submits the charging-point and Hub identifiers, event reference, observation time, and reported point condition. For a session event, it also supplies the session/vehicle references and the relevant state, progress, or stop reason.
2. The system verifies the provider's identity and permission to report on the charging point.
3. The system validates the resource mapping, event type, timestamp, supported state values, and required session measurements and references.
4. The system checks the event's identity, freshness, and ordering against the latest accepted observations for the point and, when applicable, the session.
5. The system retrieves the point's operational restrictions, current schedule, and any referenced session and charging request. It checks that the session belongs to the reported point/vehicle and that the reported transition is compatible with the current state and allocation. An idle report does not remove a future commitment, and a start report cannot bypass the scheduled-start eligibility checks.
6. The system rechecks the latest state and records the accepted point/session observation and observation time as a consistent update. For a valid session transition, it records the actual event time and updates the linked session/request status without creating a second charging session.
7. The system updates the monitoring and charging views. If the confirmed transition releases eligible capacity, the charging queue is re-evaluated under the configured scheduling policy; a faulted point remains unavailable for new allocations.
8. The system acknowledges the event with its processing result and reference.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| T03-A1 | A valid start or progress event is matched to an eligible allocation at Step 5 | For a confirmed start, mark the linked session/request **Active** and record the actual start time. For progress, update valid measurements on the existing session without restarting it. Preserve its resource commitment and continue at Step 6. |
| T03-A2 | A confirmed stop/completion event is matched to the session at Step 5 | Record the actual stop time and outcome: **Completed** when the charging target is met, **Interrupted** for a final stop before the target, or **Paused** for a reported pause permitted by the session policy. Release only capacity no longer committed under that outcome; a pause alone does not prove that the point is free. Continue at Step 6. Parking stays active until UC-P07 completes. |
| T03-A3 | A validated event reports a charging-point fault at Step 5 | Record the fault, restrict new allocations, and create or update the equivalent open charging-point incident. Identify affected sessions and future allocations for handling through UC-I03 and the charging-schedule use cases. If cessation of charging is not confirmed, retain the last confirmed session state and mark it as requiring verification; do not infer a completed/interrupted session or free point. Continue at Step 6. |
| T03-A4 | A fresh healthy/idle report arrives while an incident, restriction, or future allocation remains at Step 5 | Record the reported condition while preserving unresolved restrictions and valid commitments. Operator recovery and scheduling decisions remain separate. Continue at Step 6. |
| T03-A5 | An identical event was already processed at Step 4 | Return the original processing result and end. Do not repeat a session transition, incident creation, or capacity release. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| T03-E1 | Source verification or authorization fails at Step 2 | Reject the update and record the access failure. Do not reveal protected session details or alter charging state. |
| T03-E2 | Required data is invalid or the point/Hub mapping is unknown at Step 3 | Return the validation reason and preserve the last accepted point/session state. Missing progress or state must not be interpreted as a stopped session. |
| T03-E3 | The event is stale, out of order, or conflicts with an earlier event reference at Step 4 | Do not replace newer point/session information or advance freshness. Retain conflicting evidence for investigation where applicable. |
| T03-E4 | Session references do not match, or the reported transition violates the current allocation/state at Step 5 | Retain the report as unresolved evidence and flag it for Operator reconciliation. Do not fabricate a booking, mark an unrelated session complete, or declare the point available. An unexpected report that charging has started makes the point unavailable for new allocations pending verification. |
| T03-E5 | Current schedule/session state cannot be verified, or changes concurrently at Steps 5–6 | Reload and reconcile before applying the event. If it cannot be verified, report a retryable failure and preserve existing commitments; do not confirm that charging has stopped or release capacity. |
| T03-E6 | Saving fails or the acknowledgement is lost at Steps 6–8 | Avoid partial point/session updates or repeated capacity release. Retrieve the original event's result before retrying when its outcome is uncertain. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | Valid point/session observations and their effects are recorded once, or an identical retry returns its original result. Confirmed transitions retain actual event times; eligible capacity is released once. Faults remain visible with affected commitments identified for Operator handling. Parking reservations and sessions remain unchanged. |
| Unsuccessful completion | An invalid or unverifiable event does not overwrite confirmed session history, invent a valid allocation, or falsely free a charging point. An unresolved physical-state report is retained and may restrict new allocations pending reconciliation. No partial update or duplicate release occurs; uncertain outcomes are reconciled before retrying. |
