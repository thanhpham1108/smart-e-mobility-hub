# Parking & Private EV — Test cases

**Owner:** Nguyễn Phước Nhật Duy — 2452205

**Design under test:** [Methods](../method-design/03-parking-private-ev.md) · [Class diagram](../class-diagram/parking/03-parking-private-ev.png)

Each case starts with a fresh fixture. All times below are on 2026-11-09 at GMT+7. The Student is signed in, the Hub is operational, and both the parking grid and the check-in grace are set to 15 minutes.

## TC-P-01 — Reserve the entire interval and cancel linked charging

| Field | Value |
| --- | --- |
| Related use cases | UC-P01, UC-P02, UC-P03, UC-P04, UC-P05 |
| Initial state | At 07:40, Hub H1 has one free unit in each slot starting at 08:00, 08:15, 08:30 and 08:45. Student S1 owns EV1 and has no bookings. H1 accepts charging requests. Its single operational charging point is occupied from 08:07 to 08:42 by another request. |
| Input and steps | Review [08:00, 09:00) and inspect all four slots. Confirm with key P1 twice. Request charging from 08:07 to 08:42, 30% to 35%, with key C1. Open the booking list and details. Confirm cancellation of the Waiting request. Free C1, then submit a new 30% to 35% request in the same window and let Smart Charging schedule it. Review and confirm cancellation of the parking booking before 08:00. Replay the cancellation. |
| Expected response | Review shows an 08:15 deadline. Both confirms return the same parking reference. The valid first charging request shows Waiting and queue position #1 because C1 is occupied; it has no assigned slot. Charging-only cancellation shows Cancelled alongside Confirmed parking; if the request was Waiting, its queue position is removed. The final parking cancellation summary identifies the newly Scheduled request and its allocation. |
| Expected stored state | Review alone holds nothing. Confirmation creates one reservation and holds exactly one unit in each of four slots. UC-P05 releases no parking. After UC-P04, the reservation and both charging requests are Cancelled, all four parking units are free again and the scheduled allocation is released once. The retained history has no parking session. |

## TC-P-02 — Lose one slot between review and confirmation

| Field | Value |
| --- | --- |
| Related use cases | UC-P01, including UC-S02 and the optional UC-X01 alternative Hub flow |
| Initial state | At 07:45, S1 reviews [08:00, 09:00) at H1. Each of its four slots has exactly one unit left. Before S1 confirms, S2 commits a valid booking for [08:30, 08:45) at H1. H2 has one free unit throughout the full hour. |
| Input and steps | S1 confirms the H1 review. Inspect H1's slot ledger. Ask for alternatives, select H2 and inspect it before confirming. Submit a fresh confirmation for H2. |
| Expected response | H1 rejects the whole interval because the 08:30 slot is full. H2 selection produces a fresh review of all four slots. Only its subsequent confirmation returns an H2 booking. |
| Expected stored state | After rejection, H1 free capacity in slot order is 1, 1, 0, 1. S2's hold is intact and S1 has no H1 record or holds. H2 remains unchanged on selection, then stores one booking and four holds on confirmation. |

## TC-P-03 — Check-in deadline, occupancy and early checkout

| Field | Value |
| --- | --- |
| Related use cases | UC-P06, UC-P07, UC-P03 and expiry policy FR-NI-13 |
| Initial state | H1 has one usable space. S1 has a Confirmed booking R1 for [08:00, 09:00), with holds across four slots, deadline 08:15:00 and no parking session. |
| Input and steps | At 08:14:59 check in with the matching QR, H1 and EV1. Retry check-in and run the expiry scan at 08:15:00. With linked charging Active and its target unmet, attempt checkout. Select **Complete** and wait for a verified stop. Review again, confirm departure at 08:26:12 and retry checkout. |
| Expected response | Both arrivals return the same Active visit. The expiry scan skips R1. Checkout waits for the Student's confirmed **Complete** action, which ends charging as Completed even below target, then asks for departure confirmation. Both checkout submissions return the same Closed visit. |
| Expected stored state | After check-in the reservation is Checked In, occupancy is 1 and free capacity for the current slot is 0. The visit and its holds consume one unit together. Before departure confirmation the visit remains Active. After checkout R1 is Completed, occupancy is 0, all remaining holds are released and the later 08:30 and 08:45 slots are free. Exactly one session records 08:14:59 and 08:26:12. The Completed charging record is retained. |
| Independent deadline run | Reset to the unused R1 fixture, with one linked Scheduled charging request. Attempt the first check-in at exactly 08:15:00 before the next timer tick. Admission is denied. Reconciliation records Expired, reason NoShow and the actual processing time, cancels the request and releases both sets of commitments. No visit exists. Refresh booking details and run another scan. The same history and capacity must remain. |
