# Vehicle Rental — Test cases (bonus)

**Owner:** Nguyễn Khải Ca — 2452159

**Related class diagram:** `../class-diagram/02-vehicle-rental.puml`

**Related method descriptions:** `../method-design/02-vehicle-rental.md`

## TC-RENTAL-01 — Successful reservation and pickup

| Field | Value |
| --- | --- |
| Related use case | `UC-R03 — Reserve a Shared Vehicle`, `UC-R04 — Pick Up a Shared Vehicle` |
| Initial state / preconditions | Student `S-001` has a valid Student session. Vehicle `VEH-001` is parked at eligible Hub `H-001` in occupied space `P-001`, with battery level 80%, status `AVAILABLE`, and condition `OPERATIONAL`. No conflicting reservation or active trip exists. Authoritative time is `2026-11-12T09:00:00+07:00`. The lock simulator is configured to unlock successfully; parking and state updates succeed. |
| Input and steps | 1. At 09:00, call `RentalService.reserveVehicle("S-001", "VEH-001")`. Record the returned reservation ID (`RES-001` denotes this generated ID). 2. Check that the reservation is `CONFIRMED`, expires at 09:15, and the vehicle is `RESERVED`. 3. At 09:05, call `RentalService.pickupVehicle("S-001", "RES-001", "VEH-001")`. 4. The service checks ownership, matching vehicle, eligibility before expiry and operational condition, successfully unlocks the vehicle, and commits trip creation, reservation consumption and pickup parking updates. 5. Record the returned trip ID (`TRIP-001` denotes this generated ID). |
| Expected response | Reservation succeeds and returns `RES-001` with a 15-minute hold. Pickup succeeds and returns `TRIP-001` with status `ACTIVE`, start Hub `H-001` and start time 09:05. The Student receives pickup confirmation. |
| Expected persisted state | Exactly one reservation `RES-001` exists for the request with `studentId = S-001`, `vehicleId = VEH-001`, `createdAt = 09:00`, `expiresAt = 09:15`, and status `PICKED_UP`. Exactly one active trip `TRIP-001` references that reservation, Student and vehicle; end Hub/time, duration and distance are not yet set. Vehicle status is `IN_USE`, condition remains `OPERATIONAL`, and current parked Hub reference is absent while travelling. Space `P-001` is released and Hub occupancy is synchronized. No duplicate allocation or trip exists. |

## TC-RENTAL-02 — Conflicting reservation and pickup at the expiry boundary

| Field | Value |
| --- | --- |
| Related use case | `UC-R03 — Reserve a Shared Vehicle`, `UC-R04 — Pick Up a Shared Vehicle`; `FR-NI-04 — Reservation expiry` |
| Initial state / preconditions | Students `S-001` and `S-002` have separate valid Student sessions. Vehicle `VEH-002` is parked at eligible Hub `H-001` in space `P-002`, with battery level 90%, status `AVAILABLE`, and condition `OPERATIONAL`. No conflicting reservation or active trip exists. Authoritative time is `2026-11-12T10:00:00+07:00`. Both requests satisfy all non-conflict eligibility checks. |
| Input and steps | 1. At 10:00, submit `RentalService.reserveVehicle("S-001", "VEH-002")` and `RentalService.reserveVehicle("S-002", "VEH-002")` concurrently. The test harness arranges for S-001's allocation to commit first while S-002's request overlaps it. 2. Record the winning reservation ID (`RES-002` denotes this generated ID); inspect both responses and state after both requests finish. 3. At 10:14:59, verify `VehicleReservation.isEligibleForPickup(now)` returns `true` for `RES-002` without performing pickup. 4. At exactly 10:15:00, verify eligibility returns `false` and call `RentalService.pickupVehicle("S-001", "RES-002", "VEH-002")` before the expiry job runs. 5. At 10:15:01, invoke `RentalService.expireReservations(now)` through the trusted scheduler, then invoke it again with the same timestamp. 6. Attempt pickup again with the original reservation. |
| Expected response | S-001 receives the confirmed reservation with expiry 10:15; S-002 receives a vehicle-unavailable/allocation-conflict result and no reservation. The winning reservation is eligible immediately before expiry but not at the deadline. Both pickup attempts at or after expiry are rejected; no unlock or trip creation occurs. The repeated expiry invocation produces no duplicate effect. |
| Expected persisted state | After the concurrent requests, exactly one reservation exists for `VEH-002`: `RES-002`, owned by `S-001`, status `CONFIRMED`, vehicle status `RESERVED`; no record or allocation is created for S-002. After the deadline and expiry processing, `RES-002` is `EXPIRED`, vehicle status is `AVAILABLE` and condition is `OPERATIONAL`. The vehicle remains at `H-001` in `P-002`; parking occupancy is unchanged. No rental trip exists for either Student. Repeated expiry and rejected pickup leave the final state unchanged. |

## TC-RENTAL-03 — Returning a reported faulted vehicle does not make it available

| Field | Value |
| --- | --- |
| Related use case | `UC-R05 — Return a Shared Vehicle`, `UC-R08 — Report a Vehicle Problem`; `FR-NI-02 — Vehicle fault restriction` |
| Initial state / preconditions | Student `S-001` has a valid Student session and owns active trip `TRIP-003` for vehicle `VEH-003`. Its reservation `RES-003` is `PICKED_UP`; the trip started at `2026-11-12T11:00:00+07:00` from Hub `H-001`. Vehicle status is `IN_USE`, condition is initially `OPERATIONAL`, and current parked Hub reference is absent. Destination Hub `H-002` is eligible for return, space `P-003` belongs to it and is free. Fleet accepts incident creation and subsequently confirms the reported fault through the trusted restriction contract. The lock simulator succeeds; validated simulated distance is 3.5 km; state and parking updates succeed. |
| Input and steps | 1. At 11:25, call `RentalService.reportVehicleProblem("S-001", "VEH-003", "Brake malfunction")`. Record the returned incident ID (`INC-003` denotes the generated ID). 2. Check that reporting alone leaves `TRIP-003` active. 3. Fleet confirms the fault and invokes `RentalService.setVehicleCondition("VEH-003", FAULTED)` through the trusted internal contract. Verify the vehicle remains `IN_USE` with condition `FAULTED`. 4. At 11:30, call `RentalService.returnVehicle("S-001", "VEH-003", "H-002", "P-003")`. The service rechecks the trip and return space, allocates the space, locks the vehicle, and commits trip completion and resource updates. 5. Verify `SharedVehicle.isAvailable()` returns `false` after return. |
| Expected response | The problem report succeeds and returns the saved `IncidentTicket`. The confirmed fault does not prevent the authorized Student from returning the vehicle. Return succeeds and returns completed `TRIP-003` with end Hub `H-002`, end time 11:30, duration 30 minutes and distance 3.5 km. The vehicle is not available for a new rental. |
| Expected persisted state | Exactly one incident ticket exists for the submitted report and is linked to the relevant Student, vehicle and rental context through Fleet's contract. `TRIP-003` is `COMPLETED`, with the expected end Hub, end time, duration and distance; no active trip remains for `VEH-003`. `RES-003` remains `PICKED_UP`. Vehicle current Hub is `H-002`, status `UNDER_MAINTENANCE`, condition `FAULTED`. Space `P-003` is occupied by the returned vehicle and Hub occupancy reflects the new allocation exactly once. No new reservation or duplicate trip is created. |

## Design notes

- The IDs and fixture values above are illustrative; generated IDs are captured from service responses rather than prescribed formats. The 15-minute hold and exact expiry boundary follow the agreed method descriptions.
- `UNDER_MAINTENANCE` is the agreed class-design state for a faulted returned vehicle (the earlier return sequence uses `UNAVAILABLE`). Reporting alone does not establish a confirmed fault; TC-RENTAL-03 explicitly includes Fleet confirmation.
- Parking allocation, incident creation, and lock simulation are exercised through the agreed cross-module behavior. Their concrete external signatures and simulator implementation are not assumed. "Persisted state" means committed authoritative application state, including in-memory state, not a requirement for a separate database.
- These three cases cover the assigned core scenarios; they are not exhaustive coverage of every Vehicle Rental method or use case.
