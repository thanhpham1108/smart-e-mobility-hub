# Fleet & Incident - Test Cases (Bonus)

Owner: Mai Hoang Phuong Dong - 2452265.

These are executable-by-review acceptance test specifications for the proposed design, not claims of passing backend tests. No backend implementation is included in this design submission. Each case starts from isolated fixtures unless a sequence explicitly shares state. The [method catalogue](../method-design/04-fleet-incident.md) defines error and transaction semantics.

## Shared fixtures

At 2026-11-08T09:00:00+07:00, OP1 is an authorized Operator, ST1 a Student, and TP1 a telemetry source permitted for the listed resources. Hub A has capacity 20 and physical occupancy 10. Hub B has capacity 10 and physical occupancy 6, leaving 4 currently free spaces. Vehicles V1/V2/V3 are healthy at A, with no rental, reservation or transfer commitment. All observations are current. Unless overridden, staleInterval is 15 minutes, lowVehicleThreshold is 2 and capacityWarningPercent is 85. These values are test configuration, not mandated production thresholds. Each write has a unique requestId and the current entity version; explicit retries reuse the original key and payload.

## TC-FI-01 - Dashboard freshness and read-only inspection

| Field | Value |
| --- | --- |
| Related use case | UC-F01/F02/F03, FR-NI-03 |
| Initial state / preconditions | Authorized OP1. Hub A's accepted observation is 08:45; now is 09:00. Charging point CP1 status source is unavailable. Snapshot all business entities before querying. |
| Input and steps | Evaluate health at 08:59:59 then 09:00; retrieve overview, V1 details and CP1 details. |
| Expected response | A is current before the threshold and stale at exactly 15 minutes; accepted timestamp remains visible. CP1 is unavailable, not represented as zero use/free. V1 shows condition, commitments and location. |
| Expected persisted state | Health projections/alerts may change; dashboard/detail queries change no order, reservation, session, ticket, location or physical occupancy. |

## TC-FI-02 - Feasible assignment and complete arrival

| Field | Value |
| --- | --- |
| Related use case | UC-F04, UC-S03, UC-F05, FR-NI-05 |
| Initial state / preconditions | Shared fixtures; two selected vehicles V1/V2. |
| Input and steps | Validate A to B; confirm proposal; verify state; then physically verify V1/V2 at B and submit arrival confirmation. |
| Expected response | Feasible proposal; Assigned order; then Completed order with two confirmed arrivals. |
| Expected persisted state | After creation: both confirmed locations remain A, occupancy remains A=10/B=6, and two vehicle transfer commitments exist; no destination capacity is reserved. After arrival: locations B, occupancy A=8/B=8, and transfer commitments are released. Resource availability is recalculated once. |

## TC-FI-03 - Insufficient destination capacity or conflicting vehicle

| Field | Value |
| --- | --- |
| Related use case | UC-F04, UC-S03 |
| Initial state / preconditions | Variant A: B occupancy=9, so only one space is free for the two selected vehicles. Variant B: original fixture but V2 has an active reservation. |
| Input and steps | Validate V1/V2 transfer for each variant; attempt creation with the rejected proposal. In B, remove V2 and revalidate the V1-only proposal. |
| Expected response | Capacity reason for A; V2 commitment reason for B. Rejected proposals cannot create an order. Revised V1-only selection can pass a new validation. |
| Expected persisted state | Rejected attempts create no order or vehicle commitment and change no physical state. No vehicle is silently dropped from a submitted confirmed request. |

## TC-FI-04 - Concurrent commitment after validation

| Field | Value |
| --- | --- |
| Related use case | UC-F04, UC-S03, FR-NI-05 |
| Initial state / preconditions | OP1 has a feasible proposal for V1 at version r1. |
| Input and steps | Before creation, commit a Rental reservation for V1 (version r2); submit the old proposal. Also run two creation commands for V1 against the same initial state under the shared lock. |
| Expected response | Old proposal receives Conflict/revalidation required. In the race, at most one competing commitment succeeds. |
| Expected persisted state | No resource is simultaneously assigned and reserved incompatibly. Losing requests create no order or vehicle commitment; occupancy is unchanged. |

## TC-FI-05 - Partial arrival, retry and mismatched confirmation

| Field | Value |
| --- | --- |
| Related use case | UC-F05, FR-NI-05 |
| Initial state / preconditions | Assigned order O1 contains V1/V2; B currently has enough free spaces but none is reserved for the transfer. |
| Input and steps | Confirm only V1 using request K1. Retry K1 with identical payload/old expectedVersion. Submit a new command that incorrectly includes already-arrived V1 or unassigned V3. Finally confirm only V2 with current version. |
| Expected response | First result PartiallyCompleted; identical retry returns original result. New invalid subset is rejected. Final valid confirmation returns Completed. |
| Expected persisted state | After K1 and its retry: V1 at B, V2 at A; occupancy A=9/B=7; V2 retains its vehicle transfer commitment. Invalid subset has no effects. Before V2's arrival, destination capacity is checked again; final totals are A=8/B=8. |

Capacity-race variant: after O1 is created but before either arrival, unrelated activity fills B to 10/10. A new `recordArrival` attempt must report destination capacity full to the Operator and leave vehicle locations, occupancy, order progress and transfer commitments unchanged. No destination space was reserved by O1.

## TC-FI-06 - Atomic failure and lost acknowledgement

| Field | Value |
| --- | --- |
| Related use case | UC-F05, UC-I02, FR-NI-05 |
| Initial state / preconditions | O1 assigned V1/V2. Separately, ticket I1 is ready for restoration. Enable controlled failure before transaction publication. |
| Input and steps | Stage vehicle movement, then fail before Hub/order publication. Repeat with failure between staged ticket resolution and owner restriction release. Retry after removing the failure. In another variant, commit successfully but drop the response; retry the same key. |
| Expected response | Failed publication returns retryable failure, never success. Successful retry commits once. Lost-response retry returns the original result. |
| Expected persisted state | Failed attempts preserve complete before-state including vehicle commitments and incident restrictions. No partial movement, falsely resolved ticket or duplicate occupancy/eligibility effect. |

## TC-FI-07 - Repeated fault evidence and transfer risk

| Field | Value |
| --- | --- |
| Related use case | UC-T01, UC-I02, FR-NI-01/02/07 |
| Initial state / preconditions | V1 is in an Assigned order O1; no open fault ticket. |
| Input and steps | Send TP1 event E1 at 09:01 reporting motor fault. Retry identical E1. Send newer E2 at 09:02 for the same faultKey. Try to record arrival while O1 is AtRisk. |
| Expected response | First event applied; retry returns original result without new effects. E2 adds evidence to the same ticket. AtRisk arrival is rejected pending review. |
| Expected persisted state | One equivalent ticket, two distinct evidence records, vehicle restricted and O1 AtRisk with resumeStatus=Assigned. Original confirmed location and both Hub occupancies remain unchanged. |

## TC-FI-08 - Incident repair, guarded restoration and recurrence

| Field | Value |
| --- | --- |
| Related use case | UC-I02; IncidentTicket lifecycle |
| Initial state / preconditions | Reported I1 on V1 with an affected reservation. |
| Input and steps | ACCEPT, PLAN and START_REPAIR. Request restoration without completed repair: reject. Record completed inspection but leave affected reservation unresolved: reject. Record verified owner response and make current owner state safe; resolve and close. In a separate branch, send a newer matching fault after Resolved but before Closed. |
| Expected response | RepairIncomplete then UnresolvedCommitment; later Resolved and Closed. A recurrence before closure reopens Investigating and requires fresh recovery evidence. |
| Expected persisted state | Vehicle restricted on both failed restorations. Successful resolution removes only I1's restriction, preserving any valid compatible assignment/booking. Recurrence invalidates old repair clearance and restricts the vehicle again. A new fault after Closed starts a new ticket. |

## TC-FI-09 - Invalid, stale and conflicting telemetry

| Field | Value |
| --- | --- |
| Related use case | UC-T01, FR-NI-01/03 |
| Initial state / preconditions | V1's last accepted observation is E2 at 09:02; V1 remains restricted by a fault. |
| Input and steps | Submit older healthy event at 09:01, a different event at equal timestamp 09:02, battery=101, unknown resource, unauthorized provider and reused E2 ID with changed content. Then submit a fresh healthy event at 09:03. |
| Expected response | Invalid/stale/unauthorized/conflicting events rejected with reasons. Fresh valid observation applied without incident restoration. |
| Expected persisted state | Rejections change neither accepted observation time nor condition/commitments. Healthy observation updates reported condition only; unresolved incident restriction remains. |

## TC-FI-10 - Parking observation does not double-count or check out

| Field | Value |
| --- | --- |
| Related use case | UC-T02, FR-NI-08 |
| Initial state / preconditions | A has occupancy=10 including an already checked-in vehicle, and two future reservations. |
| Input and steps | Send aggregate occupiedCount=10; repeat the event. Send a newer count=9 without a matching checkout. Also race a newer observation against a check-in. |
| Expected response | Matching observation refreshes time; duplicate returns previous result. Disagreement returns RECONCILIATION_REQUIRED with expected/observed counts. Concurrent update is reconciled against current owner state. |
| Expected persisted state | Count never becomes 20. The count=9 report does not check out a vehicle, release a reservation or expose disputed space. Existing sessions/holds remain until owner reconciliation. |

## TC-FI-11 - Charging fault, waiting request and session evidence

| Field | Value |
| --- | --- |
| Related use case | UC-F03, UC-I03, UC-T03, FR-NI-05 |
| Initial state / preconditions | CP1 has active session S1 plus a second request W2 Waiting for that point; associated private-EV parking is active. W2 has no allocation. |
| Input and steps | Send point fault without confirmed stop, then healthy/idle observation. Submit wrong-session stop and unexpected start events. Finally submit verified S1 stop with correct resource/time references; repeat it. Process the fault ticket through repair and restoration using owner checks. |
| Expected response | Fault incident and point restriction; idle cannot restore it. Mismatched events require reconciliation. Verified stop records its actual outcome once. Restoration requires verified repair and reconciliation, not merely idle telemetry. |
| Expected persisted state | Fault alone does not fabricate S1 completion or free CP1. W2 remains Waiting without an allocation. Correct stop updates only S1; any queue reevaluation follows Charging policy once, with a still-faulted point excluded. Parking remains active. |

## TC-FI-12 - Recover or cancel an at-risk partial transfer

| Field | Value |
| --- | --- |
| Related use case | UC-F04/F05, FR-NI-07; RedistributionOrder lifecycle |
| Initial state / preconditions | O1 assigned V1/V2; V1 already arrived at B. V2 faults at A; O1 AtRisk, resumeStatus=PartiallyCompleted. |
| Input and steps | Resolve V2 fault via its incident workflow. REVALIDATE O1 with owner state/capacity checked. Separately, attempt CANCEL while V2 disposition is unknown; then reconcile V2 as remaining at A and cancel. |
| Expected response | Revalidation returns PartiallyCompleted, never resets to Assigned. Unknown-disposition cancellation rejects. Verified cancellation returns Cancelled. |
| Expected persisted state | V1 remains at B and its occupancy effect remains. Cancellation releases only V2's outstanding vehicle transfer commitment, leaves V2's confirmed location at A and derives its availability from remaining owner restrictions. |

## TC-FI-13 - Imbalance alert does not dispatch vehicles

| Field | Value |
| --- | --- |
| Related use case | UC-F01, FR-NI-03/06 |
| Initial state / preconditions | B has 1 available vehicle with threshold 2; current reliable data. |
| Input and steps | Run evaluateNetworkHealth twice at the same state; inspect alerts/orders. Restore availability to 3 with a confirmed owner event and run again. Repeat with stale Hub input. |
| Expected response | One shortage alert updated, then resolved when current data clears the shortage. Stale data receives a data-quality warning. |
| Expected persisted state | No duplicate alert, new order, physical transfer or reservation cancellation is produced by the background check. |

## TC-FI-14 - Access control, closed-ticket guards and snapshot isolation

| Field | Value |
| --- | --- |
| Related use case | UC-F01/F04/I02, integration with UC-W02 and FR-NI-12 |
| Initial state / preconditions | ST1 is a Student; I1 is Closed. Capture a versioned Fleet snapshot through the shared snapshot contract. |
| Input and steps | ST1 requests dashboard/redistribution/incident restoration. Submit a Student report for another user's rental. OP1 tries a repair update on I1. Change order/ticket data inside a simulated copy. |
| Expected response | Protected operations/report are rejected; Closed update rejected. Simulation may change only its own copied state. |
| Expected persisted state | No unauthorized changes or protected data disclosure. Live orders, tickets, occupancy and commitments equal their pre-simulation values. |
