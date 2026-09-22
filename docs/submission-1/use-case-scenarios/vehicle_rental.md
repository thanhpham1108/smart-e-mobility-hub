# UC-R01 — Find a Suitable Shared Vehicle

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R01 |
| **Use-case name** | Find a Suitable Shared Vehicle |
| **Use-case overview** | To allow the Student to find shared vehicles matching the intended journey using criteria such as Hub, vehicle type, and battery level. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated and can access the Vehicle Rental service.<br>3. Vehicle and Hub status information is available. |
| **Trigger** | The Student opens the **Find Vehicle** function and enters search criteria. |
| **Steps** | 1. The Student enters search criteria.<br>2. The system retrieves vehicles matching the selected Hub, vehicle type, and battery requirements.<br>3. The system checks their reported availability and operational status.<br>4. The system displays suitable vehicle candidates and their availability.<br>5. The Student reviews the results. |
| **Post-conditions** | Suitable vehicle candidates and their reported availability are displayed. No vehicle is reserved. |
| **Exception flow** | 1. No vehicle matches the selected criteria.<br>2. Current vehicle or Hub status cannot be retrieved.<br>3. The system displays an appropriate message and does not present unavailable information as current. |

### Main Flow

1. **Student:** Opens the **Find Vehicle** page.
2. **System:** Displays the available search criteria.
3. **Student:** Selects the intended Hub, vehicle type, and required battery level.
4. **Student:** Submits the search.
5. **System:** Retrieves vehicles matching the selected criteria.
6. **System:** Checks the reported availability and operational status of each matching vehicle.
7. **System:** Displays suitable vehicle candidates with their Hub, vehicle type, battery level, and availability.
8. **Student:** Reviews the search results.

### Alternative Flow

**A1. No Suitable Vehicle at the Selected Hub**

1. At Step 5, the System finds no suitable vehicle at the selected Hub.
2. The System informs the Student that no matching vehicle is currently available.
3. The System allows the Student to modify the search criteria or select another Hub.
4. The Student may perform the search again.

**A2. Some Matching Vehicles Are Unavailable**

1. At Step 6, some matching vehicles are no longer available or operational.
2. The System excludes those vehicles from the suitable candidates.
3. The System displays the remaining suitable vehicles.

### Exception Flow

**E1. Vehicle Status Retrieval Failure**

1. At Step 6, the System cannot retrieve current vehicle status.
2. The System displays an error or unavailable-status message.
3. The System does not present unverified availability as current.
4. The use case ends unsuccessfully.

---

# UC-R02 — View Shared Vehicle Details

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R02 |
| **Use-case name** | View Shared Vehicle Details |
| **Use-case overview** | To allow the Student to view a selected vehicle's identifier, type, current Hub, battery level, availability, and operational condition. Viewing a vehicle does not reserve it. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student has selected a shared vehicle.<br>3. Vehicle information is available. |
| **Trigger** | The Student selects a vehicle from the vehicle list. |
| **Steps** | 1. The system retrieves the selected vehicle's information.<br>2. The system retrieves its current status.<br>3. The system displays its identifier, type, Hub, battery level, availability, and operational condition.<br>4. The Student reviews the vehicle information. |
| **Post-conditions** | The selected vehicle's current details are displayed. No reservation is created. |
| **Exception flow** | 1. The selected vehicle cannot be found.<br>2. Current vehicle information cannot be retrieved.<br>3. The system informs the Student that the details are unavailable. |

### Main Flow

1. **Student:** Selects a shared vehicle.
2. **System:** Retrieves the selected vehicle's information.
3. **System:** Retrieves the latest available vehicle status.
4. **System:** Displays the vehicle identifier and type.
5. **System:** Displays the current Hub and battery level.
6. **System:** Displays the reported availability and operational condition.
7. **Student:** Reviews the vehicle details.

### Alternative Flow

**A1. Vehicle Becomes Unavailable While Being Viewed**

1. At Step 3, the System determines that the vehicle is no longer available.
2. The System displays the updated availability.
3. The Student may return to the vehicle search results and select another vehicle.

### Exception Flow

**E1. Vehicle Information Unavailable**

1. At Step 2 or 3, the System cannot retrieve the required vehicle information.
2. The System displays an error message.
3. The System does not display outdated information as current.
4. The use case ends unsuccessfully.

---

# UC-R03 — Reserve a Shared Vehicle

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R03 |
| **Use-case name** | Reserve a Shared Vehicle |
| **Use-case overview** | To allow the Student to request a reservation for a selected shared vehicle while preventing incompatible concurrent reservations. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated.<br>3. The Student has selected a shared vehicle.<br>4. The vehicle is reported as available for reservation. |
| **Trigger** | The Student clicks the **Reserve Vehicle** button for a selected vehicle. |
| **Steps** | 1. The system retrieves the selected vehicle.<br>2. The system rechecks its availability at confirmation time.<br>3. The system checks for incompatible concurrent reservations.<br>4. The Student confirms the reservation.<br>5. The system creates the reservation.<br>6. The system updates the vehicle allocation/status.<br>7. The system displays the confirmed reservation. |
| **Post-conditions** | A valid reservation is created for the Student and incompatible reservations for the same allocation are prevented. |
| **Exception flow** | 1. The vehicle becomes unavailable before confirmation.<br>2. A concurrent reservation conflict occurs.<br>3. The reservation cannot be saved.<br>4. The system does not create an invalid or conflicting reservation. |

### Main Flow

1. **Student:** Selects an available shared vehicle.
2. **Student:** Clicks **Reserve Vehicle**.
3. **System:** Retrieves the latest vehicle status.
4. **System:** Rechecks whether the vehicle is available.
5. **System:** Checks for incompatible concurrent reservations.
6. **System:** Displays the reservation information.
7. **Student:** Confirms the reservation.
8. **System:** Creates the reservation for the Student.
9. **System:** Updates the vehicle allocation/status.
10. **System:** Displays the reservation confirmation.

### Alternative Flow

**A1. Vehicle Becomes Unavailable Before Confirmation**

1. At Step 4, the System determines that the vehicle is no longer available.
2. The System does not create the reservation.
3. The System informs the Student that the vehicle can no longer be reserved.
4. The System allows the Student to return to the search results.

**A2. Alternative Hub Requested**

1. After A1, the Student requests another available option.
2. The System searches for suitable vehicles at alternative Hubs.
3. The System displays available alternatives.
4. The Student may select another vehicle and restart the reservation process.

### Exception Flow

**E1. Concurrent Reservation Conflict**

1. At Step 5, another valid reservation has allocated the vehicle.
2. The System rejects the new reservation.
3. The System informs the Student that the vehicle is no longer available.
4. No conflicting reservation is created.

**E2. Reservation Save Failure**

1. At Step 8, the System fails to save the reservation.
2. The System does not confirm the reservation.
3. The System records the error.
4. The Student is informed that the reservation was unsuccessful.

---

# UC-R04 — Pick Up a Shared Vehicle

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R04 |
| **Use-case name** | Pick Up a Shared Vehicle |
| **Use-case overview** | To verify the Student's entitlement to collect a reserved vehicle, recheck the vehicle's availability and condition, and start the rental. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated.<br>3. The Student has a valid reservation for the vehicle.<br>4. The reservation is eligible for pickup. |
| **Trigger** | The Student requests to pick up the reserved vehicle. |
| **Steps** | 1. The system retrieves the Student's reservation.<br>2. The system verifies that the reservation belongs to the Student and is valid.<br>3. The system retrieves the current vehicle status.<br>4. The system rechecks availability and operational condition while accounting for the Student's own valid reservation.<br>5. The system starts the rental.<br>6. The system updates the reservation and vehicle status.<br>7. The system confirms the active rental. |
| **Post-conditions** | The Student has an active rental and the vehicle is marked as in use. |
| **Exception flow** | 1. The reservation is invalid, expired, cancelled, or belongs to another Student.<br>2. The vehicle is unavailable or unsuitable for operation.<br>3. The rental cannot be started.<br>4. The vehicle remains unavailable for pickup when validation fails. |

### Main Flow

1. **Student:** Opens the valid vehicle reservation.
2. **Student:** Requests to pick up the vehicle.
3. **System:** Verifies that the reservation belongs to the Student.
4. **System:** Verifies that the reservation is valid for pickup.
5. **System:** Retrieves the latest vehicle status.
6. **System:** Checks the vehicle's availability while accounting for the Student's own reservation.
7. **System:** Checks the vehicle's operational condition.
8. **System:** Starts the rental.
9. **System:** Updates the vehicle status to **In Use**.
10. **System:** Updates the reservation/rental status.
11. **System:** Confirms that the rental has started.

### Alternative Flow

**A1. Vehicle Status Changed After Reservation**

1. At Step 5, the System detects that the vehicle status has changed.
2. The System evaluates the latest availability and operational condition.
3. If the vehicle remains suitable for pickup, the System continues from Step 8.
4. Otherwise, the System follows the appropriate exception flow.

### Exception Flow

**E1. Invalid Reservation**

1. At Step 3 or 4, the System determines that the reservation is invalid, expired, cancelled, or does not belong to the Student.
2. The System denies the pickup.
3. The System displays the reservation status.
4. The rental is not started.

**E2. Vehicle Not Operational**

1. At Step 7, the System determines that the vehicle is faulted or otherwise unsuitable for operation.
2. The System denies the pickup.
3. The System informs the Student that the vehicle cannot currently be used.
4. The rental is not started.

---

# UC-R05 — Return a Shared Vehicle

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R05 |
| **Use-case name** | Return a Shared Vehicle |
| **Use-case overview** | To validate the return of a vehicle associated with the Student's active rental, end the rental, update the vehicle location and parking occupancy, and record its resulting condition. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student has an active rental.<br>3. The returned vehicle is associated with that rental.<br>4. Hub and parking information is available. |
| **Trigger** | The Student requests to return the rented vehicle at a Hub. |
| **Steps** | 1. The system retrieves the active rental.<br>2. The system validates the vehicle associated with the rental.<br>3. The system validates the return Hub and parking state.<br>4. The system records the vehicle's resulting condition.<br>5. The system ends the rental.<br>6. The system updates the vehicle location.<br>7. The system updates parking occupancy.<br>8. The system updates the vehicle status according to its condition.<br>9. The system confirms the return. |
| **Post-conditions** | The rental is completed, vehicle location and parking occupancy are updated, and the resulting vehicle condition is recorded. A faulted vehicle is not automatically made available for rental. |
| **Exception flow** | 1. No matching active rental exists.<br>2. The return Hub or parking state cannot be validated.<br>3. Required return information cannot be saved.<br>4. The system does not incorrectly complete the rental. |

### Main Flow

1. **Student:** Arrives at a Hub and requests to return the rented vehicle.
2. **System:** Retrieves the Student's active rental.
3. **System:** Verifies that the vehicle belongs to the active rental.
4. **System:** Retrieves the current Hub and parking information.
5. **System:** Validates the return location and parking state.
6. **System:** Records the vehicle's resulting condition.
7. **System:** Ends the active rental.
8. **System:** Updates the vehicle's location to the return Hub.
9. **System:** Updates the Hub's parking occupancy.
10. **System:** Updates the vehicle's status based on its resulting condition.
11. **System:** Displays the return confirmation.

### Alternative Flow

**A1. Vehicle Is Returned With a Fault**

1. At Step 6, the vehicle is recorded as faulted.
2. The System completes the valid return.
3. The System marks the vehicle as faulted/unavailable.
4. The System does not automatically make the vehicle available for another rental.
5. The System completes the remaining return updates.

### Exception Flow

**E1. No Matching Active Rental**

1. At Step 2 or 3, the System cannot find a valid active rental associated with the returned vehicle.
2. The System rejects the return request.
3. The System informs the Student that the rental cannot be validated.
4. The rental status remains unchanged.

**E2. Return Location Cannot Be Validated**

1. At Step 5, the System cannot validate the return location or parking state.
2. The System does not complete the return.
3. The System informs the Student of the problem.
4. The active rental remains unchanged.

---

# UC-R06 — View My Rental Reservations and Trips

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R06 |
| **Use-case name** | View My Rental Reservations and Trips |
| **Use-case overview** | To allow the Student to view their vehicle reservations, active rental, and completed trips with their current statuses and details. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated. |
| **Trigger** | The Student opens the **My Rentals & Trips** page. |
| **Steps** | 1. The system identifies the Student.<br>2. The system retrieves the Student's reservations.<br>3. The system retrieves any active rental.<br>4. The system retrieves completed trips.<br>5. The system displays the records with their current statuses and details.<br>6. The Student reviews the information. |
| **Post-conditions** | The Student's available rental reservations and trip information are displayed. No reservation or rental state is modified. |
| **Exception flow** | 1. Rental information cannot be retrieved.<br>2. The system displays an appropriate error message and does not modify any rental data. |

### Main Flow

1. **Student:** Opens the **My Rentals & Trips** page.
2. **System:** Identifies the Student.
3. **System:** Retrieves the Student's vehicle reservations.
4. **System:** Retrieves the Student's active rental, if one exists.
5. **System:** Retrieves the Student's completed trips.
6. **System:** Displays the records and their current statuses.
7. **Student:** Reviews the reservations, active rental, and completed trips.

### Alternative Flow

**A1. No Rental Records**

1. At Steps 3–5, the System finds no reservations, active rental, or completed trips.
2. The System displays an empty-state message.
3. The use case ends successfully.

**A2. Only Some Record Types Exist**

1. At Steps 3–5, the System finds only some categories of rental information.
2. The System displays the available records.
3. Empty categories are displayed with an appropriate empty-state message.

### Exception Flow

**E1. Rental Information Retrieval Failure**

1. During Steps 3–5, the System cannot retrieve the required rental information.
2. The System displays an error message.
3. The System does not present incomplete information as current.
4. The use case ends unsuccessfully.

---

# UC-R07 — Cancel a Vehicle Reservation

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R07 |
| **Use-case name** | Cancel a Vehicle Reservation |
| **Use-case overview** | To allow the Student to cancel an eligible reservation before pickup and release the associated vehicle allocation. An active rental cannot be ended through reservation cancellation. |
| **Actors** | Student |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated.<br>3. The reservation belongs to the Student.<br>4. The reservation is eligible for cancellation.<br>5. The rental has not started. |
| **Trigger** | The Student selects a reservation and clicks **Cancel Reservation**. |
| **Steps** | 1. The system retrieves the selected reservation.<br>2. The system verifies that it belongs to the Student.<br>3. The system verifies that it is eligible for cancellation.<br>4. The Student confirms the cancellation.<br>5. The system cancels the reservation.<br>6. The system releases the vehicle allocation according to its current state.<br>7. The system displays the cancellation confirmation. |
| **Post-conditions** | The eligible reservation is cancelled and its vehicle allocation is released. No active rental is ended. |
| **Exception flow** | 1. The reservation does not belong to the Student.<br>2. The reservation is already cancelled or no longer eligible.<br>3. The rental has already started.<br>4. The cancellation cannot be saved. |

### Main Flow

1. **Student:** Opens an existing vehicle reservation.
2. **Student:** Clicks **Cancel Reservation**.
3. **System:** Retrieves the reservation.
4. **System:** Verifies that the reservation belongs to the Student.
5. **System:** Verifies that the reservation is still eligible for cancellation.
6. **System:** Displays a cancellation confirmation request.
7. **Student:** Confirms the cancellation.
8. **System:** Cancels the reservation.
9. **System:** Releases the vehicle allocation according to the vehicle's current state.
10. **System:** Displays a cancellation confirmation.

### Alternative Flow

**A1. Student Does Not Confirm Cancellation**

1. At Step 7, the Student chooses not to confirm.
2. The System does not modify the reservation.
3. The Student returns to the reservation details.
4. The use case ends successfully without changes.

### Exception Flow

**E1. Reservation Is No Longer Eligible**

1. At Step 5, the System determines that the reservation is already cancelled, expired, or otherwise ineligible.
2. The System rejects the cancellation request.
3. The System displays the current reservation status.
4. No allocation is released incorrectly.

**E2. Rental Has Already Started**

1. At Step 5, the System determines that the reservation has already become an active rental.
2. The System rejects reservation cancellation.
3. The System informs the Student that an active rental must be completed through the vehicle return process.
4. The active rental remains unchanged.

**E3. Cancellation Save Failure**

1. At Step 8, the System fails to save the cancellation.
2. The System does not release the vehicle allocation.
3. The System informs the Student that the cancellation was unsuccessful.
4. The previous reservation state remains unchanged.

---

# UC-R08 — Report a Vehicle Problem

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-R08 |
| **Use-case name** | Report a Vehicle Problem |
| **Use-case overview** | To allow the Student to submit a problem description linked to the vehicle and rental context and create an incident report for Operator review. The Student may report a problem while using the vehicle or during the return process. |
| **Actors** | Student; Operator (secondary actor) |
| **Preconditions** | 1. The system is running.<br>2. The Student is authenticated.<br>3. The affected vehicle can be identified.<br>4. Relevant rental context is available when applicable. |
| **Trigger** | The Student selects **Report Vehicle Problem** while using or returning a shared vehicle. |
| **Steps** | 1. The system identifies the affected vehicle and available rental context.<br>2. The Student enters a problem description.<br>3. The Student submits the report.<br>4. The system validates the required information.<br>5. The system creates an incident report linked to the vehicle and rental context.<br>6. The system makes the incident available for Operator review.<br>7. The system confirms the submission. |
| **Post-conditions** | An incident report linked to the affected vehicle and relevant rental context is created for Operator review. |
| **Exception flow** | 1. Required report information is missing.<br>2. The vehicle or rental context cannot be validated.<br>3. The incident report cannot be saved.<br>4. The system does not confirm a report that was not successfully recorded. |

### Main Flow

1. **Student:** Selects **Report Vehicle Problem**.
2. **System:** Identifies the affected vehicle and available rental context.
3. **System:** Displays the vehicle problem form.
4. **Student:** Enters a description of the problem.
5. **Student:** Submits the report.
6. **System:** Validates the required report information.
7. **System:** Creates an incident report linked to the vehicle and rental context.
8. **System:** Makes the incident available for Operator review.
9. **System:** Displays a submission confirmation.

### Alternative Flow

**A1. Problem Reported During Vehicle Return**

1. During the vehicle return process, the Student indicates that the vehicle has a problem.
2. The System opens the vehicle problem reporting function using the current vehicle and rental context.
3. The Student enters the problem description.
4. The System continues from Step 5 of the Main Flow.
5. The resulting vehicle condition can be handled by the return process.

### Exception Flow

**E1. Required Information Missing**

1. At Step 6, the System detects that required information is missing.
2. The System identifies the missing information.
3. The Student provides the required information.
4. The Student submits the report again.

**E2. Vehicle or Rental Context Cannot Be Validated**

1. At Step 2 or 6, the System cannot validate the required vehicle or rental context.
2. The System does not create an incorrectly linked incident.
3. The System informs the Student that the report cannot currently be submitted.

**E3. Incident Save Failure**

1. At Step 7, the System fails to save the incident report.
2. The System records the error.
3. The System informs the Student that the report was not successfully submitted.
4. No submission confirmation is displayed.
