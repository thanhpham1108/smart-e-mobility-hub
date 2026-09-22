# Parking & Private EVs — Use Case Scenarios

## Scenario Assumptions

- Parking arrival and departure times are selected from the system's available time points, spaced 15 minutes apart by default (e.g., 08:00, 08:15, 08:30). One reservation covers a continuous interval from arrival up to, but not including, departure, comprising all consecutive parking slots in that interval. Capacity must be available in every covered slot.
- A charging request is linked to a confirmed parking reservation or an active parking session for the same Student, vehicle, and Hub. Its requested charging interval is the window within which the system may schedule charging, not an allocated charging slot, and must fit within the associated parking interval. The parking time increment does not require charging schedules to use 15-minute increments.
- Parking reservations can be cancelled before check-in. Cancelling a parking reservation also cancels its linked pending or scheduled charging requests. Cancelling only a charging request leaves parking unchanged.
- Check-in and checkout are confirmed through the application; physical events may be simulated. Actual arrival and departure times are recorded without rounding to parking time points. Arrival must satisfy the configured check-in window. No fixed grace period is assumed; for example, a check-in at 08:07 for a reservation starting at 08:00 is recorded as 08:07 if that check-in is permitted.
- Checkout requires active charging to have ended. It also cancels unused pending or scheduled charging requests linked to the departing parking session. Completed charging records remain unchanged.

## UC-P01 — Reserve a Parking Space

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P01 |
| Use-case name | Reserve a Parking Space |
| Use-case overview | Allow a Student to reserve parking at a selected Hub for a specified interval. |
| Actors | Student |
| Preconditions | The Student is signed in and authorized to reserve parking. Parking-reservation policies are configured. |
| Trigger | The Student selects the parking-reservation function. |
| Relationships | Includes UC-S02 — Check Parking Availability. UC-X01 — View Alternative Hubs extends this use case when the selected Hub cannot fulfil the request and the Student requests alternatives. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system displays the Hubs and their current parking availability, together with vehicle information fields and date/time selectors. The time selectors use the configured time points, spaced 15 minutes apart by default.
2. The Student selects a Hub and date(s), enters the vehicle information, and selects arrival and departure times from the available time points. The system offers arrival times with at least one feasible departure, and departure times later than the selected arrival with capacity in every covered slot, subject to reservation rules.
3. The system validates the required information, checks that both selected times fall on permitted time points and departure is later than arrival, and applies the reservation rules.
4. The system performs **UC-S02 — Check Parking Availability** for the selected Hub and the entire requested interval. Every covered slot must have sufficient capacity; a single slot without capacity makes the whole interval unavailable.
5. The system displays availability for the entire selected interval and a summary of the Hub, vehicle, and selected arrival/departure times for review. No reservation or capacity allocation has been created at this point.
6. The Student confirms the reservation request.
7. The system rechecks the Student's authorization and current capacity in every covered slot, then confirms one reservation for the entire interval as one consistent allocation decision. All covered slots are allocated together or none are; no partial reservation is retained. Concurrent requests cannot allocate the same remaining capacity incompatibly.
8. The system displays the reservation reference, Hub, vehicle, parking interval, and **Confirmed** status.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P01-A1 | At least one covered slot lacks capacity at Step 4, or loses capacity before confirmation at Step 7 | The system reports that the entire requested interval is unavailable, without confirming a booking or retaining a partial allocation. If the Student requests alternatives, execute **UC-X01 — View Alternative Hubs** using the requested parking interval. If the Student selects another Hub, update the Hub, refresh its available time points, and resume at Step 3 with the same requested interval. If no alternative is available or selected, the Student may revise the request at Step 2 or end the use case without a reservation. |
| P01-A2 | Student changes the request at Step 5 | Return to Step 2 and refresh the available time points for the revised Hub, date(s), or arrival time. Require a new departure selection if the previous one is no longer offered. Validate both selected times and repeat the availability check for every slot in the revised interval before showing a new summary. |
| P01-A3 | Student cancels before Step 7 | End the use case without creating a reservation or allocating parking capacity. |
| P01-A4 | No arrival or departure times are available at Step 2 | Explain that no arrival times are available for the selected Hub and date(s), or that no departure times are available for the selected arrival, as applicable. The Student may change the Hub, date(s), or arrival time at Step 2, or end the use case without a reservation. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P01-E1 | Invalid or missing information at Step 3 | Identify the invalid fields, such as an arrival or departure time outside the permitted time points, a departure time not later than arrival, or a violation of reservation rules. Return to Step 2 to select valid times or correct the other fields. No reservation is created. |
| P01-E2 | Session expires or permission is lost before confirmation | Stop processing and request authentication or report denied access. After authentication, reload the request and resume at Step 3. Availability must be checked again. |
| P01-E3 | Availability data cannot be retrieved at Step 2, Step 4, or Step 7 | Report that availability cannot be verified. Allow retry or cancellation; do not offer time points as available or confirm a reservation using an unverified result. |
| P01-E4 | Saving fails or the confirmation response is lost at Steps 7–8 | Do not show success until the outcome is known. If saving failed, leave capacity unchanged. If the outcome is uncertain, retrieve the original submission's result before retrying; return an existing confirmed booking instead of creating a duplicate. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | One confirmed reservation is linked to the Student and vehicle, and capacity is allocated in every covered slot for the entire continuous interval without overbooking. No separate or partial reservations are created for individual slots. |
| Unsuccessful completion | A rejected or abandoned request creates no reservation. An uncertain submission is reconciled before retrying, without duplicate or partial allocation. |

## UC-P02 — Submit a Private-EV Charging Request

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P02 |
| Use-case name | Submit a Private-EV Charging Request |
| Use-case overview | Record a Student's charging needs for scheduling during a private-EV parking visit. |
| Actors | Student |
| Preconditions | The Student is signed in and has a parking reservation or session reference. The referenced record's ownership and current eligibility are checked during the flow. |
| Trigger | The Student selects the charging-request action for a parking booking or session. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system retrieves the associated parking record and verifies that it belongs to the Student.
2. The system displays the vehicle, Hub, parking interval, and charging-request form.
3. The Student enters the current battery level, target battery level, and requested charging interval within the parking interval. This interval defines when the system may schedule charging; it does not select or allocate a charging slot and need not use the parking time increment.
4. The system validates the charging inputs, confirms that the Hub accepts charging requests, and checks the associated parking record's current eligibility.
5. The system displays a request summary and indicates that submission does not guarantee a charging slot.
6. The Student confirms submission.
7. The system rechecks the associated parking state and creates one linked charging request with **Pending** status as a consistent update. Concurrent parking cancellation must not leave an active request linked to a cancelled reservation. The request becomes available to the charging scheduler without a slot being allocated in this use case.
8. The system displays the request reference, vehicle, Hub, requested interval, and **Pending** status.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P02-A1 | The vehicle is already checked in at Step 1 | Use the active parking session as the request context. Limit the requested charging interval to the remaining permitted parking interval and continue at Step 2. |
| P02-A2 | Charging points are currently busy | Accept an otherwise valid request as **Pending**. Continue through Steps 5–8 without promising an immediate slot. Scheduling remains a separate operation. |
| P02-A3 | An equivalent active request is found before creation at Step 7 | Display the existing request and its current status. End without creating another request or changing an existing allocation. |
| P02-A4 | Student changes or abandons the request at Step 5 | Return to Step 3 for changes, or end without creating a request. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P02-E1 | Invalid charging inputs at Step 4 | Report the invalid values. Battery percentages must be within 0–100, the target must exceed the current level, and the interval must be valid and fit within the parking interval. Return to Step 3. |
| P02-E2 | The parking record is unavailable, belongs to another user, or is no longer eligible at Step 1, 4, or 7 | Do not create a charging request. Explain that an eligible parking booking or active session is required, without disclosing another user's details. Return to the Student's booking list. |
| P02-E3 | The selected Hub does not accept charging requests at Step 4 | Explain that charging cannot be requested at this Hub. End without creating a request or cancelling the parking booking. |
| P02-E4 | The Student's session expires before Step 7 | Require authentication and reload the associated parking state before allowing resubmission. No new request is created while access is invalid. |
| P02-E5 | A retrieval/save failure or lost response occurs | Report the failure. For an uncertain submission, retrieve the original request outcome before retrying. Preserve any confirmed parking booking and avoid duplicate charging requests. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | A new **Pending** charging request is linked to the parking context, or an equivalent existing request is returned. A newly accepted request has no guaranteed charging allocation. |
| Unsuccessful completion | No partial or duplicate request is created. Parking remains unchanged. An uncertain submission is reconciled before retrying. |

## UC-P03 — View My Parking and Charging Bookings

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P03 |
| Use-case name | View My Parking and Charging Bookings |
| Use-case overview | Allow a Student to view personal parking bookings and charging requests with their current statuses. |
| Actors | Student |
| Preconditions | The Student is signed in. Having an existing booking is not required. |
| Trigger | The Student opens the personal parking and charging bookings view. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system verifies the Student's session.
2. The system retrieves only the Student's parking reservations, parking sessions, and charging requests.
3. The system displays summaries containing the vehicle, Hub, time interval, current status, and charging allocation where one exists.
4. The Student selects a record to view its details.
5. The system verifies access to the selected record and retrieves its current details and linked parking/charging information.
6. The system displays the details and available actions based on the current state. Pending charging requests are distinguished from scheduled or active charging.
7. The Student returns to the list or closes the view.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P03-A1 | No records are found at Step 2 | Display an empty-state message. The Student may leave the view or start a separate reservation/request use case. No booking is created by viewing the list. |
| P03-A2 | The Student only needs the list at Step 3 | The Student closes the view without opening a record. End successfully after displaying the summaries. |
| P03-A3 | The Student changes a filter or requests a refresh at Step 3 or Step 6 | Retrieve the matching current records belonging to the Student and update the display. If no records match, show an empty result. |
| P03-A4 | A selected record's status has changed since the list was loaded | Display the current status and update the available actions at Step 6. For example, a request that has begun charging is no longer shown as cancellable through UC-P05. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P03-E1 | The session expires before records are retrieved | Request authentication. Do not retrieve or reveal personal records until access is restored. |
| P03-E2 | The selected record is unavailable or inaccessible at Step 5 | Display a generic unavailable-record message and return to the refreshed list. Do not expose another Student's record. |
| P03-E3 | Records cannot be retrieved at Step 2 or Step 5 | Display a retrieval error and offer retry. Do not present an error as “no bookings.” If previously loaded data remains visible, identify it as not refreshed. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The Student sees the requested personal records and their retrieved statuses, or a valid empty result. |
| Unsuccessful completion | An access or retrieval error is reported. No reservation, parking session, charging request, or resource allocation is changed. |

## UC-P04 — Cancel a Parking Reservation

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P04 |
| Use-case name | Cancel a Parking Reservation |
| Use-case overview | Cancel an eligible parking reservation and its dependent pending or scheduled charging requests. |
| Actors | Student |
| Preconditions | The Student is signed in and has a parking reservation reference. Cancellation eligibility is checked during execution. |
| Trigger | The Student selects Cancel for a parking reservation. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system retrieves the selected reservation and verifies that it belongs to the Student.
2. The system checks that the reservation is **Confirmed**, has not been checked in, and is eligible for cancellation.
3. The system retrieves linked pending or scheduled charging requests and displays the parking cancellation summary, including all dependent requests that will also be cancelled.
4. The Student confirms the cancellation and its displayed consequences.
5. The system rechecks the reservation and dependent request states. It then cancels the parking reservation and the displayed eligible charging requests, releasing all parking capacity still held for the reservation across its covered slots and the dependent charging allocations together, without partial updates or double release.
6. The system displays the **Cancelled** parking reservation and the resulting statuses of its linked charging requests.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P04-A1 | No pending or scheduled charging requests are linked at Step 3 | Show only the parking cancellation summary. Continue at Step 4; release only the parking allocation. |
| P04-A2 | The Student declines at Step 4 | End without changing the reservation, linked requests, or allocations. |
| P04-A3 | The reservation is already cancelled at Step 2 or Step 5 | Display the existing cancellation result. Do not cancel or release resources a second time. |
| P04-A4 | Linked request details change before Step 5 but remain cancellable | Refresh the cancellation summary and return to Step 4 for confirmation of the updated consequences. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P04-E1 | The record is unavailable or does not belong to the Student at Step 1 | Reject the action without revealing protected details. Return to the Student's booking list. |
| P04-E2 | Cancellation is no longer permitted at Step 2 or Step 5 | Reject the cancellation and display the current state. If the vehicle has checked in, the parking session must be ended through **UC-P07 — Check Out a Private EV**. Completed or expired reservations cannot be cancelled. |
| P04-E3 | A dependent charging request is no longer cancellable at Step 5 | Stop the combined cancellation and show the updated states. Do not cancel parking while leaving an active dependent charging session unresolved. |
| P04-E4 | The session expires before cancellation is committed | Require authentication and reload the reservation and dependent requests before asking for confirmation again. |
| P04-E5 | Saving fails or the result cannot be confirmed at Steps 5–6 | A failed update must not leave parking cancelled while eligible linked requests remain allocated. If the outcome is uncertain, retrieve the original cancellation result before retrying; never release capacity twice. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The reservation is **Cancelled**; its linked pending/scheduled charging requests are **Cancelled**. All parking capacity still held for the reservation across its covered slots and the dependent charging allocations are released once. Historical records remain available. |
| Unsuccessful completion | This attempt makes no partial cancellation. Concurrent changes are displayed as their current states; an uncertain cancellation result is reconciled before retrying. |

## UC-P05 — Cancel a Charging Request

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P05 |
| Use-case name | Cancel a Charging Request |
| Use-case overview | Cancel a pending or scheduled charging request while retaining the associated parking booking or session. |
| Actors | Student |
| Preconditions | The Student is signed in and has a charging-request reference. Cancellation eligibility is checked during execution. |
| Trigger | The Student selects Cancel for a charging request. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system retrieves the request and verifies that it belongs to the Student.
2. The system checks that the current request status is **Pending** or **Scheduled**.
3. The system displays the cancellation summary, including any charging allocation to be released, and states that parking will remain unchanged.
4. The Student confirms cancellation.
5. The system rechecks the request state, marks it **Cancelled**, and releases any associated future charging allocation once.
6. The system displays the cancelled request and the unchanged parking booking/session status.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P05-A1 | The request is Pending and has no allocation at Step 2 | Continue through confirmation. Mark the request **Cancelled** without changing charging-point capacity. |
| P05-A2 | The Student declines at Step 4 | End without changing the charging request or parking state. |
| P05-A3 | The request is already cancelled at Step 2 or Step 5 | Return the existing cancellation result. Do not release any allocation again. |
| P05-A4 | The assigned slot changes before Step 5 while the request remains cancellable | Refresh the summary and return to Step 4 so the Student confirms the current request state. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P05-E1 | The request is unavailable or inaccessible at Step 1 | Reject the action and return to the Student's booking list without disclosing another user's information. |
| P05-E2 | Charging has started, or the request is completed/interrupted, at Step 2 or Step 5 | Reject request cancellation and display the current status. An active session must follow the charging-interruption procedure; it must not be treated as an unstarted request. |
| P05-E3 | The session expires before Step 5 | Require authentication and reload the charging-request state before allowing confirmation again. |
| P05-E4 | Saving fails or confirmation is lost at Steps 5–6 | Avoid partial state changes. For an uncertain result, retrieve the original cancellation outcome before retrying. Parking remains unaffected by this use case. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The request is **Cancelled**, and any reserved charging allocation is released exactly once. The associated parking booking/session remains unchanged. |
| Unsuccessful completion | This attempt does not partially cancel the request or alter parking. Any uncertain result is reconciled before retrying. |

## UC-P06 — Check In a Private EV

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P06 |
| Use-case name | Check In a Private EV |
| Use-case overview | Record a reserved private EV's arrival and start its parking session. |
| Actors | Student |
| Preconditions | The Student is signed in, has arrived at the Hub, and has a parking reservation reference. The reservation's current validity is checked during the flow. |
| Trigger | The Student selects Check In for the parking reservation. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system retrieves the selected reservation and verifies access.
2. The system displays the reserved Hub, vehicle, and parking interval.
3. The Student confirms arrival and the vehicle/Hub information.
4. The system validates that the reservation belongs to the Student, matches the arriving vehicle and Hub, remains **Confirmed**, and permits check-in at the current time.
5. The system checks that the reserved allocation can be honoured and that no parking session already exists for this check-in.
6. The system starts one **Active** parking session, records the actual arrival time without rounding to a parking time point, and marks the reservation **Checked In**. It accounts for actual occupancy against the existing reserved allocation without consuming the same capacity twice or releasing capacity still committed to the remaining parking interval.
7. The system displays the active parking session and any linked charging-request status. Check-in alone does not guarantee that charging has started.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P06-A1 | Check-in was already completed at Step 4 or Step 5 | Display the existing active parking session. Do not create another session or increase occupancy again. |
| P06-A2 | The Student arrives before the permitted check-in window at Step 4 | Display when check-in becomes available. Keep the reservation unchanged and end the attempt without starting a parking session. |
| P06-A3 | The Student declines arrival confirmation at Step 3 | End without changing the reservation or recording occupancy. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P06-E1 | The reservation is unavailable, inaccessible, cancelled, expired, completed, or otherwise invalid at Step 1 or Step 4 | Reject check-in and display the appropriate accessible status. Do not start a parking session. |
| P06-E2 | The vehicle or Hub does not match at Step 4 | Explain the mismatch and return to Step 2 for review. Do not use another vehicle's or Hub's reservation. |
| P06-E3 | The reserved allocation cannot be honoured at Step 5 | Do not confirm check-in or record additional occupancy. Preserve the reservation, report the capacity/operational problem, and direct the Student to operational assistance. |
| P06-E4 | The session expires or reservation state changes before Step 6 | Require authentication if the session expired, then reload the reservation. Continue only if check-in remains permitted; otherwise report the current state without creating a session. |
| P06-E5 | Saving fails or the acknowledgement is lost at Steps 6–7 | Do not leave a checked-in reservation without its matching session or count occupancy twice. If the outcome is uncertain, retrieve the existing check-in result before retrying. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | One active parking session exists for the reservation and vehicle. The actual arrival time is recorded without rounding, the reservation is **Checked In**, and occupancy is updated once while capacity for the remaining reserved interval stays committed. |
| Unsuccessful completion | No partial check-in is created. A rejected attempt leaves its reserved allocation unchanged unless a separate concurrent action has changed it. An uncertain result is reconciled before retrying. |

## UC-P07 — Check Out a Private EV

| Field | Specification |
| --- | --- |
| Use-case ID | UC-P07 |
| Use-case name | Check Out a Private EV |
| Use-case overview | Close a private EV's parking session after charging is resolved and departure is confirmed. |
| Actors | Student |
| Preconditions | The Student is signed in and has a parking-session reference. |
| Trigger | The Student selects Check Out before leaving the Hub. |

### Steps — Acceptance Flow (Main Success Flow)

1. The system retrieves the parking session and verifies that it belongs to the Student and the selected vehicle.
2. The system retrieves its linked charging requests and current charging-session state.
3. The system verifies that no charging session is active. If charging is active, follow P07-A1 before continuing.
4. The system displays a checkout summary, including any unused pending or scheduled charging requests that will be cancelled.
5. The Student confirms departure through the application.
6. The system rechecks the parking and charging states, then closes the parking session, marks the associated parking reservation **Completed**, and records the actual departure time without rounding to a parking time point. It cancels linked unused pending/scheduled charging requests and releases the occupied parking space, all parking capacity still held for this visit (including the unused remainder of the reserved interval on early checkout), and remaining charging allocations once, as a consistent update without double release.
7. The system displays the completed parking visit and the final statuses of the linked charging requests.

### Alternative Flow

| ID | Branch | Actions and continuation |
| --- | --- | --- |
| P07-A1 | Charging is active at Step 3, or begins before the final check at Step 6 | Ask whether the Student wants to stop charging and continue checkout. If accepted, request the stop and wait for a confirmed stopped state; record **Completed** if the charging target was met or **Interrupted** otherwise. Continue at Step 4 and obtain departure confirmation again. If the Student declines, end the checkout attempt with parking still active. |
| P07-A2 | The Student cancels checkout at Step 4 or Step 5 | Leave the parking session active. If charging was already stopped through P07-A1, it remains stopped; cancelling checkout does not restart it. |
| P07-A3 | The session has already been checked out at Step 1 or Step 6 | Display the existing completion result. Do not release parking or charging capacity again. |
| P07-A4 | No charging requests are linked at Step 2 | Continue with the parking-only checkout. No charging records or charging allocations are changed. |

### Exception Flow

| ID | Branch | Handling and outcome |
| --- | --- | --- |
| P07-E1 | The parking session is unavailable, inaccessible, or does not match the selected vehicle at Step 1 | Reject checkout without exposing protected information or changing occupancy. |
| P07-E2 | The latest parking or charging state cannot be verified at Step 2, Step 3, or Step 6 | Do not confirm checkout or release capacity. Report the verification failure and allow retry after current state is available. |
| P07-E3 | Charging fails to stop, or its stopped state cannot be confirmed in P07-A1 | Keep the parking session active and do not treat the charging point as free. Report the issue for operational assistance. Resume only after charging state is resolved. |
| P07-E4 | The Student's session expires before Step 6 | Require authentication and reload both parking and charging states before resuming checkout. Any already confirmed charging stop remains effective. |
| P07-E5 | Finalization fails or the response is lost at Steps 6–7 | Avoid partial parking closure or double release. Retrieve the original checkout outcome before retrying if the result is uncertain. A charging session already stopped must not be represented as restarted merely because parking checkout failed. |

### Postconditions

| Outcome | State |
| --- | --- |
| Success | The parking session is **Closed**, the reservation is **Completed**, and the actual departure time is recorded without rounding. Occupancy and all parking capacity still held for the visit are released once, including the unused remainder on early checkout. No linked charging session remains active; unused pending/scheduled requests are cancelled and their allocations released. Completed charging history is preserved. |
| Unsuccessful completion | If checkout was not committed, parking remains active and its space is not released. A previously confirmed charging stop remains in effect. An uncertain finalization is reconciled before retrying. |
