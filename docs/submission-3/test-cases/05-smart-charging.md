# Smart Charging — Design test cases (bonus)

**Owner:** Phạm Nguyễn Công Thành — 2453175. [Class diagram](../class-diagram/smart-charging/05-smart-charging.puml) · [Method catalogue](../method-design/05-smart-charging.md).

## TC-C-01 — FCFS and exact timestamp tie

| Field | Value |
| --- | --- |
| Related use case | UC-C01, UC-C02 |
| Initial state | One operational point and three submitted drafts in the same scheduling batch: A at 09:00:00 with 70% battery, B at 09:00:00 with 20%, C at 09:01:00 with 10%. Each has a feasible charging window. |
| Steps | The system automatically schedules the submissions, then Operator opens the current schedule. |
| Expected response | Order is B, A, C. Battery only breaks the exact A/B timestamp tie; C does not jump ahead. Assigned intervals on the point do not overlap. |
| Expected state | Scheduled requests have one allocation; capacity-full requests are stored Waiting without allocation and receive a queue position. A short planned interval alone does not reject a valid request. View operation does not mutate state. |

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
| Expected state | Rejected adjustments preserve A's original allocation. Cancellation releases its held Scheduled allocation once and does not alter the linked parking reservation. Existing unrelated allocations remain committed. |

## TC-C-04 — Estimated duration, Full response and automatic FCFS

| Field | Value |
| --- | --- |
| Related use case | UC-C02, UC-C03 |
| Initial state | A Hub has one operational point rated 7 kW. Private EV draft A requests 20% → 80% with a 30-minute planned interval; the configured battery assumption is 40 kWh. Another draft B requests the same occupied interval. |
| Steps | Submit A, then B; inspect A's estimate; attempt to adjust A using a stale schedule version. |
| Expected response | A is automatically Scheduled despite its shorter planned interval; estimated energy is 24 kWh and duration is 206 minutes after rounding up, displayed as information only. B receives Full and waitlist position #1 while A occupies capacity. Stale adjustment is rejected. |
| Expected state | A has one saved request/allocation. B is stored as Waiting without an allocation; A's schedule remains unchanged. |

## TC-C-05 — Two faults and an unmatched session event

| Field | Value |
| --- | --- |
| Related use case | UC-I03, UC-T03 |
| Initial state | Point P has restrictions from incident I1 and I2; a Waiting request has not yet been allocated. |
| Steps | Resolve I1; send an unmatched START event; then receive an idle observation. |
| Expected response | P remains unavailable because I2 is unresolved. Unmatched START requires reconciliation. Idle does not cancel the Waiting request or assign it to a restricted point. |
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

## TC-C-08 — Short planned interval and target reached

| Field | Value |
| --- | --- |
| Related use cases | UC-C02, UC-T03 |
| Initial state | Hub H1 has one currently free 7 kW point and uses the 40 kWh battery assumption. A valid draft has a planned interval shorter than its estimated charging duration. At a separate Hub H2, another request is already Charging toward 80% and a valid request is Waiting for its point. |
| Steps | Submit the short-interval draft at H1. Then receive a verified battery observation of 80% for the active session at H2. |
| Expected response | The short-interval request is Scheduled at H1 and its longer estimated duration is displayed without an admission error. The active H2 session reports Completed at its target. |
| Expected state | H1 saves one request and allocation. The completed H2 request keeps its history, releases its point once and allows the next eligible Waiting request to be promoted. |

## TC-C-09 — Future request and planned end do not promise a point

| Field | Value |
| --- | --- |
| Related use cases | UC-C01, UC-C02, UC-T03 |
| Initial state | At 08:00, H1 has one free point. Student F requests a planned 09:00–09:30 interval. Its estimated duration is informational. |
| Steps | Submit F at 08:00; run scheduling at 09:00 while the point is free; receive verified START at 09:05. At 09:30, F is still Charging below target and another valid Student B requests 09:30–10:30. At 09:40, receive a verified target-reached event for F. |
| Expected response | At 08:00, F is Waiting with a queue position and is not labeled Full merely because its start is later. At 09:00, F becomes Scheduled. B receives Full and waitlist position #1 while F still occupies the point after planned `endTime`. After F completes at 09:40, B is promoted automatically. |
| Expected state | No point was reserved for F before 09:00. F's planned `endTime` remains available for display but does not release the active point at 09:30. F releases the point once at 09:40; B then receives one allocation, with no overlapping active sessions. |
