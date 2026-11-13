# Smart Charging — Design test cases (bonus)

**Owner:** Phạm Nguyễn Công Thành — 2453175. [Class diagram](../class-diagram/smart-charging/05-smart-charging.puml) · [Method catalogue](../method-design/05-smart-charging.md).

## TC-C-01 — FCFS and exact timestamp tie

| Field | Value |
| --- | --- |
| Related use case | UC-C01, UC-C02 |
| Initial state | One operational point and three submitted drafts in the same scheduling batch: A at 09:00:00 with 70% battery, B at 09:00:00 with 20%, C at 09:01:00 with 10%. Each has a feasible charging window. |
| Steps | The system automatically schedules the submissions, then Operator opens the current schedule. |
| Expected response | Order is B, A, C. Battery only breaks the exact A/B timestamp tie; C does not jump ahead. Assigned intervals on the point do not overlap. |
| Expected state | Scheduled requests have one allocation; capacity-full requests are stored Waiting without allocation and receive a queue position. Insufficient charging time creates no request. View operation does not mutate state. |

The same rule is checked with two operational points and two requests for **the same vehicle**: their intervals must not overlap, even though each point is individually free.

## TC-C-02 — Retrieval or save failure preserves valid schedule

| Field | Value |
| --- | --- |
| Related use case | UC-C02 |
| Initial state | A valid current schedule and request statuses exist. |
| Steps | First simulate unavailable point data; retry with readable data but fail schedule persistence. |
| Expected response | Each attempt reports the actual failure, not a newly generated schedule. |
| Expected state | Old schedule, allocations and request statuses remain unchanged after both failed attempts. No partial FCFS allocation is published. |

## TC-C-03 — Adjustment and fault boundaries

| Field | Value |
| --- | --- |
| Related use case | UC-C03, UC-I03, UC-P05/P07 |
| Initial state | Request A has a current allocation on point P1; point P2 is Faulty; another allocation on P1 occupies 10:00–10:30. |
| Steps | Try moving A to P2, then to P1 at 10:15–10:45; finally cancel an eligible Scheduled request and retry the same cancellation. |
| Expected response | Both adjustments are rejected with their reason. Cancellation succeeds; retry returns the same cancelled result. |
| Expected state | Rejected adjustments preserve A's original allocation. Cancellation releases its future allocation once and does not alter the linked parking reservation. Existing unrelated allocations remain committed. |

## TC-C-04 — Estimated duration, Full response and automatic FCFS

| Field | Value |
| --- | --- |
| Related use case | UC-C02, UC-C03 |
| Initial state | A Hub has one operational point rated 7 kW. Private EV draft A requests 20% → 80%, with at least 206 minutes in its window; the configured battery assumption is 40 kWh. Another draft B requests the same occupied interval. |
| Steps | Submit A, then B; inspect A's estimate; attempt to adjust A using a stale schedule version. |
| Expected response | A is automatically Scheduled; estimated energy is 24 kWh and duration is 206 minutes after rounding up. B receives Full and waitlist position #1 when A occupies capacity. Stale adjustment is rejected. |
| Expected state | A has one saved request/allocation. B is stored as Waiting without an allocation; A's schedule remains unchanged. |

## TC-C-05 — Two faults and an unmatched session event

| Field | Value |
| --- | --- |
| Related use case | UC-I03, UC-T03 |
| Initial state | Point P has restrictions from incident I1 and I2; a future allocation exists. |
| Steps | Resolve I1; send an unmatched START event; then receive an idle observation. |
| Expected response | P remains unavailable because I2 is unresolved. Unmatched START requires reconciliation. Idle does not end a session or cancel the future allocation. |
| Expected state | Only I1 is removed from `activeRestrictionIds`; I2 and `reconciliationHold` keep P blocked until each is independently cleared. |


## TC-C-06 — FCFS waitlist, cancellation and expiry

| Field | Value |
| --- | --- |
| Related use cases | UC-C02, UC-P02, UC-P05 |
| Initial state | One Hub has no free capacity. Two valid requests arrive at different submission times; both requested windows are still active. |
| Steps | Submit both requests; cancel the first; free a charging point for the remaining request; separately let another waiting request reach its requested-window end. |
| Expected response | Each Full response includes its current queue position. Cancellation and expiry notify the respective Student. The next eligible request is promoted automatically in FCFS order. |
| Expected state | Waiting requests have no allocation. Cancelled/Expired requests leave the active queue. A promoted request becomes Scheduled with one allocation and starts the existing 15-minute start timer. |

## TC-C-07 — Start timeout and Student stop choices

| Field | Value |
| --- | --- |
| Related use cases | UC-C02, UC-P07, UC-T03 |
| Initial state | Hub H1 has one point held by Scheduled request S and valid request W is Waiting. At another Hub, two requests are Charging on separate points and have not reached their targets. |
| Steps | Let S pass 15 minutes from its allocated start without a verified START. For the two active sessions, confirm **Complete** for one and **Cancel** for the other. |
| Expected response | S is cancelled and W is promoted automatically to Scheduled. The Student choosing Complete sees Completed; the Student choosing Cancel sees Cancelled. |
| Expected state | S, Complete and Cancel each release their allocation exactly once. W receives one allocation and a new 15-minute start timer. No active point is freed before its stop is verified. |

## TC-C-08 — Insufficient time and target reached

| Field | Value |
| --- | --- |
| Related use cases | UC-C02, UC-T03 |
| Initial state | A Hub has one operational 7 kW point and uses the 40 kWh battery assumption. One draft has a window shorter than its estimated charging duration. A separate request is already Charging toward 80%. |
| Steps | Submit the short-window draft. Then receive a verified battery observation of 80% for the active session. |
| Expected response | The short-window submission reports InsufficientChargingTime and does not enter the waitlist. The active session reports Completed at its target. |
| Expected state | No request or allocation is saved for the invalid draft. The completed request keeps its history, releases its point once and allows the next eligible Waiting request to be promoted. |
