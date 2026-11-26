# Member 3 — Parking & Private EV

Nguyễn Phước Nhật Duy · 2452205

The Student route is `#/student/parking`. It provides interval review, confirmation, electronic ticket lookup, check-in, cancellation, checkout, booking history and linked charging. The page uses the shared Student shell, CSS tokens and Member 5's charging component.

| Use case | Working flow | Implementation |
| --- | --- | --- |
| UC-P01 | Review every 15-minute slot, then confirm the complete interval | [Parking page](../../../src/ui/student/pages/parking.js), [service](../../../src/modules/parking/service.js), [SQL migration](../../../supabase/migrations/20261123000100_parking_lifecycle.sql) |
| UC-P02 | Submit battery target and window against owned parking, display Scheduled or Waiting with queue position | [Charging component](../../../src/ui/student/components/charging-status.js) |
| UC-P03 | Filter owned bookings, open a ticket by reference, inspect parking and charging details | [Parking page](../../../src/ui/student/pages/parking.js) |
| UC-P04 | Review dependent requests, cancel parking and unused charging together | `parking.cancel` |
| UC-P05 | Cancel Waiting/Scheduled charging from the booking flow | Member 5's `charging.cancel` |
| UC-P06 | Confirm the ticket's Hub and vehicle, start one visit within the check-in window | `parking.checkIn` |
| UC-P07 | Resolve active charging, review departure, close the visit and release remaining holds | `parking.checkOut` and Member 5's `charging.stop` |
| No-show | Expire unused bookings at the stored deadline and release their unused requests | `app.parking_expire` during commands and relevant reads |

## Database handoff

Apply `20261123000100_parking_lifecycle.sql` after `20261121000600_demo_access.sql`, before publishing this frontend. It adds Parking helpers and replaces the affected functions through a new migration. Existing tables and seed IDs are reused.

After the Fleet integration and 25 November reset fixes, apply `20261126000100_integrate_parking_fleet.sql`. It combines Fleet occupancy guards and enriched Operator views with the Parking lifecycle and per-slot review. Both Parking and Fleet regression suites run under `npm test`.

| Contract | Behavior |
| --- | --- |
| `api.read("parking.review", draft)` | Returns the reviewed Hub/vehicle/window, deadline, availability, first blocked slot and per-slot free capacity. |
| `api.read("parking.detail", { reservationId })` | Returns an owned reservation, visit, linked requests and `summaryVersion`. A foreign or unknown reference returns `BOOKING_NOT_FOUND`. |
| `parking.reserve` | Accepts Hub, vehicle, arrival/departure and optional `expectedExpiresAt`. The new page supplies the reviewed deadline. |
| `parking.checkIn` | Accepts the reservation reference and optional Hub/vehicle assertions. The new page sends all three. Repeated arrival returns the existing visit. |
| `parking.cancel/checkOut` | The page supplies `expectedSummary` from current details. Changed dependent requests or allocations require review again. Existing callers supplying only a reservation reference remain supported. |
| `app.free_space(hub, time, true)` | Rental returns and Fleet arrivals protect outstanding parking commitments. Physical occupancy and active visits count once. |
| `app.cancel_booking_requests` | Smart Charging owns cancellation/release of Waiting/Scheduled requests during parking cancellation, expiry and checkout. |
| Charging eligibility/stop | The migration adds deadline and remaining-window checks to submission. A Student stop verifies the open session and current allocation and rejects a point under reconciliation. |

Commands serialize on the shared demo-state row. Due no-show cleanup survives a subsequent rejected command. Reads of parking, charging and Hub availability also reconcile no-shows against the shared demo clock. A contradictory Active parking/charging session defers no-show cleanup and keeps its commitments.

The electronic ticket uses the booking reference for lookup. Ownership is checked by the RPC. The exact deadline is displayed on the reviewed summary and ticket. The MVP uses the shared 15-minute grace, capped at departure, and the existing maximum seven-day interval. Charging inputs support minute precision.

## Repeatable demo

Use the local Supabase setup in [DATABASE_SETUP.md](../DATABASE_SETUP.md). Reset the local demo as Operator before each independent scenario. The seed starts at **24 October 2026, 09:00 ICT**.

### Parking and charging journey

1. In Operator → Fleet, use **Simulated telemetry** to set `charge-a-03` through `charge-a-08` to Maintenance. The seed already has `charge-a-02` Faulty and `charge-a-01` occupied by `charge-request-guest-01`.
2. Open Student → Parking & Charging. Select KTX Khu A and **Demo private EV** (`private-student-01`). Use 09:00–10:00. Review the four slots, then confirm. The ticket's deadline is 09:15.
3. Choose **Check in**, review the Hub and vehicle, then **Confirm check-in**. One Active session receives `park-a-03`. The existing interval commitment covers its occupancy.
4. Submit charging for 09:00–10:00 with target 45%. The vehicle's current battery is 25%. The request displays **Waiting**, **Full** and queue position **1**.
5. Open Operator → Charging at KTX Khu A. Verify the same request ID in the waitlist. For `charge-request-guest-01`, use **Simulate target reached**. The Student request is promoted to Scheduled on `charge-a-01`.
6. Use **Confirm plug-in** for the Student request. Within the next visible-tab refresh, the Student sees Charging. Attempt checkout to see the stop requirement.
7. In the Student charging section, choose **Complete charging**. After the confirmed result, choose **Check out** again, review departure and confirm. Parking and charging show Completed. Occupancy and remaining slot holds are released.
8. Reload and open **My bookings**. The completed visit remains visible. The linked charging history retains the same request ID.

### Cancellation and no-show

After a fresh reset, reserve the same interval and leave it unused. Submit a future charging request for 09:07–09:45. It waits without a point. Open the parking cancellation summary and confirm. Both records become Cancelled.

For a separate no-show run, reset and reserve 09:00–10:00. Leave it unused and advance the Operator clock once to 09:15. The parking record becomes Expired with reason NoShow. Its unused linked charging request is cancelled. Check-in at 09:15 is rejected.

### Capacity rejection

Reserve a car at KTX Khu A for 09:30–09:45. Review a motorcycle visit there for 09:00–10:00. The 09:30 slot is full, so the complete motorcycle interval is rejected. Select another Hub and review its entire interval before confirming.

## Verification and screenshots

Run `npm ci` and `npm test`. The suite applies all migrations to disposable PGlite PostgreSQL, runs the existing cross-module checks, [Parking SQL regressions](../../../supabase/tests/parking.sql) and [client retry tests](../../../tests/parking-service.test.js).

Browser checks on 23 November 2026 used Chrome with the actual route, API adapter and SQL RPCs backed by disposable PGlite. Supabase session establishment was replaced by a local anonymous-session adapter because Docker was unavailable. Hosted Supabase Auth, migration deployment and separate-device behavior still require integration verification.

Verified browser behavior includes reservation, check-in, Full/Waiting, matching Operator request ID, promotion, verified start/stop, checkout, reload, cancellation and recovery from a response lost after commit. Layout checks covered 1440, 1024 and 390 px.

| Screen | Image |
| --- | --- |
| Review all slots and check-in deadline, 1440 px | [Reserve parking](screenshots/01-reserve-parking.png) |
| Active visit and electronic reference, 1440 px | [Parking ticket](screenshots/02-parking-ticket.png) |
| Same linked request and waitlist position, 1440 px | [Charging waitlist](screenshots/03-charging-waitlist.png) |
| Completed visit and charging history, 1440 px | [Completed booking](screenshots/04-completed-booking.png) |
| Booking history, 390 px | [Mobile bookings](screenshots/05-mobile-bookings.png) |

The screenshot sequence uses local database state and simulated events. The integration lead can replace it with the final hosted rehearsal captures after deployment.

## Final report contribution

Parking reserves one unit of capacity across every 15-minute slot in the selected interval. Confirmation rechecks the whole interval in PostgreSQL. Check-in creates one visit against that commitment. Cancellation, no-show expiry and checkout release parking together with eligible dependent charging allocations. Waiting and Scheduled requests come from the same charging records shown in the Operator portal.

The main implementation lesson was to preserve the original command identity after a lost response and to validate state again when a confirmation is submitted. The interface now resolves the original result after reload, and changed charging consequences require renewed confirmation.

**Generative AI record.** OpenAI Codex assisted with interpreting the repository requirements, writing the Parking page and service, SQL migration, integration checks, screenshots and this handoff document. Assistance covered substantial code generation, debugging and local verification. The student should review the generated work, rehearse the flow and record any subsequent changes in the team's final AI declaration.
