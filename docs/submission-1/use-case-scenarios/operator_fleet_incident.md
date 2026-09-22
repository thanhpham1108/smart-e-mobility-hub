# Operator Fleet & Incident — Use-Case Scenarios

This document covers the Operator's assigned Fleet & Incident scope: the management dashboard, vehicle inspection, vehicle redistribution, redistribution completion, and vehicle-failure handling.

> **Scope note:** `UC-I01 — Handle an Operational Incident` is an abstract parent use case. Its vehicle-failure specialization is specified below as `UC-I02`. Charging-point monitoring and charging-point failure handling are intentionally outside this document's scope.

---

# UC-F01 — Monitor the Mobility Hub Network

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-F01 |
| **Use-case name** | Monitor the Mobility Hub Network |
| **Use-case overview** | To provide the Operator with a network-wide operational overview, including vehicle distribution, parking utilization, charging availability, incidents, resource shortages, and data freshness for each Mobility Hub. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to access the Operator Dashboard.<br>3. Hub and resource-status information is available. |
| **Trigger** | The Operator opens the **Operator Dashboard**. |
| **Steps** | 1. The system retrieves the latest available Hub status information.<br>2. The system retrieves vehicle distribution, parking utilization, charging-point availability, and open incident information.<br>3. The system identifies Hubs approaching capacity limits or experiencing resource shortages.<br>4. The system displays the network overview and data-freshness information.<br>5. The Operator reviews the operational status. |
| **Post-conditions** | The Operator can view the current available network overview. No vehicle, Hub, reservation, or incident state is modified. |
| **Exception flow** | 1. Required Hub or resource-status information cannot be retrieved.<br>2. The system identifies the unavailable information and does not present it as current.<br>3. The system displays an appropriate unavailable-status message. |

### Main Flow

1. **Operator:** Opens the **Operator Dashboard**.
2. **System:** Verifies the Operator's access permission.
3. **System:** Retrieves the latest available status for each Mobility Hub.
4. **System:** Retrieves vehicle distribution and vehicle availability by Hub.
5. **System:** Retrieves parking utilization and charging-point availability by Hub.
6. **System:** Retrieves open incidents and reported operational problems.
7. **System:** Identifies Hubs approaching capacity limits and Hubs experiencing vehicle or resource shortages.
8. **System:** Displays the network overview together with the data-freshness time for each Hub.
9. **Operator:** Reviews the displayed operational information.

### Alternative Flow

**A1. No Open Incidents**

1. At Step 6, the System finds no open incidents.
2. The System displays that no operational incident is currently open.
3. The System continues to display the remaining network information.
4. The use case ends successfully.

**A2. A Hub Is Approaching a Capacity Limit**

1. At Step 7, the System determines that a Hub is approaching a parking-capacity limit or has a resource shortage.
2. The System highlights the affected Hub and the relevant condition.
3. The Operator may inspect a vehicle or begin a redistribution decision.
4. The use case ends successfully without changing the live network state.

### Exception Flow

**E1. Hub Status Retrieval Failure**

1. At Steps 3–6, the System cannot retrieve required Hub or resource-status information.
2. The System records the retrieval failure.
3. The System marks the affected information as unavailable or displays the latest known status with its freshness time.
4. The System does not present unavailable information as current.
5. The use case ends unsuccessfully for the affected information.

---

# UC-F02 — Inspect Vehicle Status

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-F02 |
| **Use-case name** | Inspect Vehicle Status |
| **Use-case overview** | To allow the Operator to inspect a selected vehicle's location, battery level, availability, rental state, operational condition, and reported faults before making an operational decision. Viewing a vehicle does not modify its state. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to access fleet-management functions.<br>3. The selected vehicle exists in the system. |
| **Trigger** | The Operator selects a vehicle from the dashboard or fleet list. |
| **Steps** | 1. The system retrieves the selected vehicle's identity and latest available telemetry/status information.<br>2. The system retrieves the current Hub/location, battery level, availability, rental state, operational condition, and reported faults.<br>3. The system displays the selected vehicle's details.<br>4. The Operator reviews the details. |
| **Post-conditions** | The selected vehicle's available status information is displayed. No vehicle state, assignment, reservation, or rental is modified. |
| **Exception flow** | 1. The selected vehicle cannot be found.<br>2. Current vehicle information cannot be retrieved.<br>3. The system informs the Operator that the vehicle details are unavailable. |

### Main Flow

1. **Operator:** Selects a vehicle from the dashboard or fleet list.
2. **System:** Retrieves the selected vehicle's identifier and latest available status information.
3. **System:** Retrieves the vehicle's current location or Hub.
4. **System:** Retrieves the vehicle's battery level and availability.
5. **System:** Retrieves the vehicle's rental state and operational condition.
6. **System:** Retrieves reported faults associated with the vehicle, if any.
7. **System:** Displays the vehicle details.
8. **Operator:** Reviews the vehicle status.

### Alternative Flow

**A1. Vehicle Has Reported Faults**

1. At Step 6, the System finds one or more reported faults for the selected vehicle.
2. The System displays the reported faults and the current incident status.
3. The Operator may begin `UC-I02 — Handle a Vehicle Failure`.
4. The vehicle details remain available for review.

### Exception Flow

**E1. Vehicle Status Unavailable**

1. At Steps 2–6, the System cannot retrieve required current vehicle information.
2. The System displays an unavailable-status message.
3. The System does not present missing information as current vehicle status.
4. The use case ends unsuccessfully.

---

# UC-F04 — Coordinate Vehicle Redistribution

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-F04 |
| **Use-case name** | Coordinate Vehicle Redistribution |
| **Use-case overview** | To allow the Operator to select vehicles and source/destination Hubs, validate transfer feasibility, and create a redistribution assignment. Creating the assignment does not confirm that physical movement has occurred. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to manage vehicle redistribution.<br>3. The selected vehicles and source/destination Hubs exist.<br>4. The latest available vehicle and Hub status information is available for validation. |
| **Trigger** | The Operator selects **Coordinate Vehicle Redistribution** from the dashboard or fleet-management view. |
| **Steps** | 1. The Operator selects one or more vehicles.<br>2. The Operator selects the source Hub and destination Hub.<br>3. The system executes **<<include>> UC-S03 — Validate Redistribution Feasibility**.<br>4. The system displays the feasibility decision and any rejection reason.<br>5. The Operator confirms the feasible redistribution request.<br>6. The system creates a redistribution assignment.<br>7. The system displays the assignment confirmation. |
| **Post-conditions** | A redistribution assignment is recorded only for a feasible transfer. Vehicle location and source/destination occupancy are not updated until actual arrival is confirmed through UC-F05. |
| **Exception flow** | 1. A selected vehicle is ineligible or has a conflicting commitment.<br>2. The source/destination Hub combination is unsuitable.<br>3. The destination Hub has insufficient capacity.<br>4. The assignment cannot be saved.<br>5. The system does not create an invalid assignment or record unconfirmed vehicle movement. |

### Main Flow

1. **Operator:** Opens the **Coordinate Vehicle Redistribution** function.
2. **System:** Displays eligible vehicles and available source/destination Hub information.
3. **Operator:** Selects one or more vehicles for redistribution.
4. **Operator:** Selects the source Hub and destination Hub.
5. **Operator:** Requests feasibility validation.
6. **System:** Executes **<<include>> UC-S03 — Validate Redistribution Feasibility**.
7. **System:** Displays the feasibility decision and the selected transfer details.
8. **Operator:** Confirms the feasible redistribution request.
9. **System:** Creates a redistribution assignment for the selected vehicles and Hubs.
10. **System:** Records the assignment state.
11. **System:** Displays the assignment confirmation.

### Alternative Flow

**A1. Some Selected Vehicles Are Ineligible**

1. At Step 6, the System determines that one or more selected vehicles are unavailable, faulted, reserved, rented, or already committed to another assignment.
2. The System identifies the ineligible vehicles and the corresponding reason.
3. The System excludes the ineligible vehicles from the proposed transfer.
4. The Operator may continue with the remaining eligible vehicles or select different vehicles.

**A2. Destination Hub Has Insufficient Capacity**

1. At Step 6, the System determines that the destination Hub cannot accommodate the selected vehicles.
2. The System rejects the proposed transfer.
3. The System displays the destination-capacity reason.
4. The Operator selects another destination Hub or changes the selected vehicles.

**A3. Operator Cancels the Redistribution Request**

1. Before Step 8, the Operator cancels the redistribution request.
2. The System does not create an assignment.
3. The system returns to the redistribution view.
4. The use case ends successfully without changing operational data.

### Exception Flow

**E1. Redistribution Assignment Save Failure**

1. At Step 9, the System fails to save the redistribution assignment.
2. The System does not confirm the assignment.
3. The System records the error.
4. The System informs the Operator that the redistribution assignment was unsuccessful.
5. Vehicle location and Hub occupancy remain unchanged.

---

# UC-F05 — Record Redistribution Completion

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-F05 |
| **Use-case name** | Record Redistribution Completion |
| **Use-case overview** | To allow the Operator to confirm the actual arrival of vehicles in a redistribution assignment and update vehicle locations, assignment states, and source/destination occupancy consistently. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to manage vehicle redistribution.<br>3. A valid, incomplete redistribution assignment exists.<br>4. The Operator can identify the vehicles that have actually arrived. |
| **Trigger** | The Operator selects a redistribution assignment and confirms vehicle arrival at the destination Hub. |
| **Steps** | 1. The system retrieves the selected redistribution assignment.<br>2. The system displays the assigned vehicles, source Hub, destination Hub, and current assignment state.<br>3. The Operator confirms the vehicles that have actually arrived.<br>4. The system validates the confirmed vehicles against the assignment.<br>5. The system updates the confirmed vehicles' locations.<br>6. The system updates the assignment state.<br>7. The system updates source/destination occupancy consistently.<br>8. The system displays the completion result. |
| **Post-conditions** | Only confirmed vehicle movement is recorded. The location, assignment state, and Hub occupancy for each confirmed vehicle are updated consistently. |
| **Exception flow** | 1. The assignment cannot be found or is already completed.<br>2. The confirmed vehicle does not belong to the assignment.<br>3. Only part of the assignment is completed.<br>4. The completion update cannot be saved.<br>5. The system does not record movement that has not been confirmed. |

### Main Flow

1. **Operator:** Opens the redistribution assignment list.
2. **Operator:** Selects an incomplete redistribution assignment.
3. **System:** Retrieves the assignment details.
4. **System:** Displays assigned vehicles, source Hub, destination Hub, and current assignment state.
5. **Operator:** Confirms that all assigned vehicles have arrived at the destination Hub.
6. **System:** Validates that the confirmed vehicles belong to the selected assignment.
7. **System:** Updates the current location of each confirmed vehicle to the destination Hub.
8. **System:** Updates the assignment state to **Completed**.
9. **System:** Updates the source and destination Hub occupancy consistently.
10. **System:** Records the completed redistribution state transition.
11. **System:** Displays the completion confirmation.

### Alternative Flow

**A1. Partial Redistribution Completion**

1. At Step 5, the Operator confirms that only some assigned vehicles have arrived.
2. The System validates the confirmed subset of vehicles.
3. The System updates the location and relevant occupancy only for the confirmed vehicles.
4. The System records the assignment as partially completed or still in progress.
5. The System does not record unconfirmed vehicles as having arrived.

**A2. Mismatched Vehicle Confirmation**

1. At Step 6, the System determines that a confirmed vehicle does not belong to the selected assignment.
2. The System rejects that vehicle confirmation.
3. The System identifies the mismatch to the Operator.
4. The Operator may correct the selection and confirm again.

### Exception Flow

**E1. Assignment Is Unavailable or Already Completed**

1. At Step 3, the System cannot find the selected assignment or determines that it is already completed.
2. The System does not update vehicle locations or Hub occupancy.
3. The System displays the current assignment status.
4. The use case ends unsuccessfully.

**E2. Completion Update Failure**

1. At Steps 7–9, the System fails to save the completion updates.
2. The System does not confirm incomplete updates as completed.
3. The System records the error.
4. The System informs the Operator that completion could not be recorded.
5. The previous confirmed operational state remains unchanged.

---

# UC-I02 — Handle a Vehicle Failure

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-I02 |
| **Use-case name** | Handle a Vehicle Failure |
| **Use-case overview** | To allow the Operator to investigate a vehicle-related incident, restrict ineligible use, address affected reservations or rentals, record recovery or repair actions, and restore vehicle eligibility only when the failure has been resolved. This use case specializes `UC-I01 — Handle an Operational Incident`. |
| **Actors** | Operator; Student and External Telemetry Provider (secondary incident sources) |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to access incident-management functions.<br>3. A vehicle-related incident exists, or a valid vehicle problem report/telemetry event has created one.<br>4. The affected vehicle can be identified. |
| **Trigger** | The Operator selects a vehicle-failure incident from the dashboard or incident list. |
| **Steps** | 1. The system retrieves the incident and affected vehicle information.<br>2. The system displays the vehicle's location, operational condition, reported fault, rental state, and related reservations.<br>3. The Operator investigates the failure and its operational effects.<br>4. The Operator requests restriction of unsafe or ineligible vehicle use.<br>5. The system prevents new allocation of the affected vehicle.<br>6. The Operator reviews and addresses affected reservations or rentals.<br>7. The Operator records corrective, recovery, or repair actions.<br>8. The system updates the incident resolution status and the vehicle's operational eligibility as appropriate. |
| **Post-conditions** | The incident contains the recorded handling action and resolution status. The vehicle remains restricted until recovery/repair is recorded and the Operator restores eligibility. A resolved vehicle may be restored to an eligible state only after the required actions are recorded. |
| **Exception flow** | 1. The incident or affected vehicle cannot be retrieved.<br>2. The affected vehicle has an active rental or pending reservation.<br>3. Repair or recovery cannot be completed.<br>4. The incident update cannot be saved.<br>5. The system does not restore an unsafe or unresolved vehicle to eligible use. |

### Main Flow

1. **Operator:** Opens the incident list and selects a vehicle-failure incident.
2. **System:** Retrieves the incident and the affected vehicle information.
3. **System:** Displays the vehicle's location, reported fault, battery level, operational condition, rental state, and related reservations.
4. **Operator:** Investigates the vehicle failure and determines its operational impact.
5. **Operator:** Requests that the vehicle be restricted from ineligible use.
6. **System:** Updates the vehicle's operational eligibility and prevents new allocations to the vehicle.
7. **System:** Displays affected reservations and rentals, if any.
8. **Operator:** Addresses the affected reservations or rentals according to the applicable operational process.
9. **Operator:** Records corrective action and recovery or repair status.
10. **System:** Updates the incident resolution status.
11. **Operator:** Confirms that the vehicle can be restored to eligible use when recovery/repair is complete.
12. **System:** Restores vehicle eligibility only after recording the completed recovery/repair status.
13. **System:** Records the vehicle and incident state transitions.
14. **System:** Displays the updated incident status.

### Alternative Flow

**A1. Vehicle Has an Active Rental**

1. At Step 7, the System identifies an active rental for the affected vehicle.
2. The System displays the affected rental information.
3. The Operator records the required operational response before resolving the incident.
4. The System keeps the vehicle restricted from new allocation.
5. The use case continues from Step 9.

**A2. Vehicle Has Pending Reservations**

1. At Step 7, the System identifies one or more pending reservations for the affected vehicle.
2. The System displays the affected reservations.
3. The Operator addresses the affected commitments according to the applicable policy.
4. The System prevents the vehicle from receiving additional commitments while the incident remains unresolved.
5. The use case continues from Step 9.

**A3. Repair Is Not Yet Complete**

1. At Step 11, the Operator determines that recovery or repair is not complete.
2. The Operator records the current repair or recovery status.
3. The System keeps the vehicle restricted from eligible use.
4. The System keeps the incident open or in the appropriate unresolved state.
5. The use case ends successfully without restoring vehicle eligibility.

### Exception Flow

**E1. Incident or Vehicle Information Unavailable**

1. At Step 2 or 3, the System cannot retrieve the incident or required vehicle information.
2. The System displays an error or unavailable-information message.
3. The System does not modify vehicle eligibility or incident resolution status.
4. The use case ends unsuccessfully.

**E2. Incident Update Failure**

1. At Steps 9–12, the System fails to save the corrective action, recovery/repair status, or resolution update.
2. The System does not confirm the incident resolution or vehicle restoration.
3. The System records the error.
4. The System informs the Operator that the update was unsuccessful.
5. The last confirmed vehicle eligibility and incident status remain unchanged.

---

## Related Use-Case Relationships

| **Relationship** | **Description** |
|---|---|
| `UC-F04 <<include>> UC-S03` | Vehicle redistribution always includes redistribution-feasibility validation. |
| `UC-I02 --|> UC-I01` | Handle a Vehicle Failure is a specialization of Handle an Operational Incident. |
| `UC-R08 -> UC-I02` | A Student's vehicle-problem report can create the incident handled in UC-I02. |
| `Update Vehicle Telemetry -> UC-I02` | A telemetry event may provide information that leads to a vehicle-failure incident. |
