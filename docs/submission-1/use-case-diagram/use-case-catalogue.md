# Smart E-Mobility Hub — Use Case Catalogue

## 1. Actors

| ID | Actor | Responsibilities |
| --- | --- | --- |
| ACT-01 | Student | Finds Hubs and vehicles, manages a personal profile, rents shared vehicles, reports vehicle problems, and manages private-EV parking and charging requests. |
| ACT-02 | Operator | Monitors the Hub network, coordinates vehicle redistribution, handles incidents, manages charging schedules, and evaluates What-if Simulations. |

## 2. Use Cases

Protected operations require an authenticated session and the appropriate permissions. Sign In establishes the session; Sign Out requires an active session.

### 2.1 Shared Authentication

**Actors:** Student and Operator.

| ID | Use case | Description |
| --- | --- | --- |
| UC-A01 | Sign In | Authenticate the user and establish a session with the permissions of the assigned role. Invalid credentials do not create a session. |
| UC-A02 | Sign Out | End the current session. Existing reservations, rentals, and charging requests remain unchanged. |

### 2.2 Hub & Identity

**Actor:** Student.

| ID | Use case | Description |
| --- | --- | --- |
| UC-H01 | Manage Personal Profile | View and update permitted personal information. Validate changes while preserving the Student's identity and role. |
| UC-H02 | Find a Mobility Hub | Search or filter Hubs by location and required services. Display matching Hubs or indicate that none match. |
| UC-H03 | View Hub Status | View a selected Hub's vehicle availability, parking occupancy, charging-point availability, and operational status, with data freshness information. Distinguish current occupancy from availability for future reservations. |

### 2.3 Vehicle Rental

**Actor:** Student.

| ID | Use case | Description |
| --- | --- | --- |
| UC-R01 | Find a Suitable Shared Vehicle | Find vehicles matching the intended journey using criteria such as Hub, vehicle type, and battery level. Display suitable candidates and their reported availability. |
| UC-R02 | View Shared Vehicle Details | View a selected vehicle's identifier, type, current Hub, battery level, availability, and operational condition. Viewing a vehicle does not reserve it. |
| UC-R03 | Reserve a Shared Vehicle | Request a reservation for a selected vehicle. Recheck availability at confirmation and prevent incompatible concurrent reservations. If the vehicle cannot be reserved, allow the Student to request alternative Hubs. |
| UC-R04 | Pick Up a Shared Vehicle | Verify the Student's entitlement to collect the vehicle, recheck its availability and condition, and start the rental. Account for the Student's own valid reservation when checking availability. |
| UC-R05 | Return a Shared Vehicle | Validate the return of a vehicle associated with the Student's active rental, end the rental, and update its location and parking occupancy. Record its resulting condition; a faulted vehicle must not automatically become available for rental. |
| UC-R06 | View My Rental Reservations and Trips | View the Student's vehicle reservations, active rental, and completed trips with their current statuses and details. |
| UC-R07 | Cancel a Vehicle Reservation | Cancel an eligible reservation belonging to the Student before pickup and release the vehicle allocation. An active rental cannot be ended through reservation cancellation. |
| UC-R08 | Report a Vehicle Problem | Submit a problem description linked to the vehicle and rental context, and create an incident report for Operator review. The Student can report independently while using the vehicle or during the return process. |

### 2.4 Parking & Private EVs

**Actor:** Student.

Parking arrival and departure times are selected from available time points, spaced 15 minutes apart by default. One reservation covers a continuous parking interval across all consecutive slots between the selected times.

| ID | Use case | Description |
| --- | --- | --- |
| UC-P01 | Reserve a Parking Space | Select a Hub, provide vehicle information, and select arrival and departure times from the available time points. Display availability for the entire selected interval and a request summary before the Student confirms. Recheck capacity at confirmation and create one reservation for the whole interval without overbooking or partial allocation. If capacity is unavailable, allow the Student to request alternative Hubs. |
| UC-P02 | Submit a Private-EV Charging Request | Submit the vehicle, Hub, expected arrival/departure times, and charging needs. Validate and record the request for scheduling. Acceptance of a request does not guarantee a confirmed charging slot. |
| UC-P03 | View My Parking and Charging Bookings | View the Student's parking reservations and charging requests, including Hub, time interval, status, and assigned charging schedule where available. Distinguish pending requests from confirmed allocations. |
| UC-P04 | Cancel a Parking Reservation | Cancel an eligible reservation belonging to the Student and release its reserved capacity. Apply the cancellation policy to any dependent charging request. An active parking session must be ended through checkout. |
| UC-P05 | Cancel a Charging Request | Cancel an eligible pending or scheduled request belonging to the Student and release its charging allocation. Parking remains unchanged. Active charging sessions follow the applicable interruption procedure. |
| UC-P06 | Check In a Private EV | Confirm arrival against a valid parking reservation and start the parking session. Update occupancy without counting the reservation and its occupied space twice. Reject invalid, expired, or mismatched reservations. |
| UC-P07 | Check Out a Private EV | Confirm departure, close the Student's active parking session, and release the space once. Handle any active charging session according to the completion or interruption procedure. |

### 2.5 Alternative Hubs

**Actor:** Student.

| ID | Use case | Description |
| --- | --- | --- |
| UC-X01 | View Alternative Hubs | During an unsuccessful reservation attempt, display other Hubs with suitable shared vehicles for rental or parking capacity for the requested interval. Allow the Student to select an alternative or decline. Selection resumes the reservation flow with a fresh availability check; it does not confirm a booking. |

### 2.6 Fleet Monitoring and Redistribution

**Actor:** Operator.

| ID | Use case | Description |
| --- | --- | --- |
| UC-F01 | Monitor the Mobility Hub Network | View vehicle distribution, parking utilization, charging availability, incidents, and resource shortages across the network. Identify Hubs approaching capacity limits and display data freshness. |
| UC-F02 | Inspect Vehicle Status | View a selected vehicle's location, battery level, availability, rental state, operational condition, and reported faults. |
| UC-F03 | Inspect Charging-Point Status | View a charging point's operating condition, availability, active session, and scheduled usage. |
| UC-F04 | Coordinate Vehicle Redistribution | Select vehicles and source/destination Hubs, validate transfer feasibility, and create a redistribution assignment. Reject conflicting commitments or insufficient destination capacity. Creating an assignment does not confirm physical movement. |
| UC-F05 | Record Redistribution Completion | Confirm the actual arrival of assigned vehicles and update their locations, assignment states, and source/destination occupancy. Handle incomplete or mismatched transfers without recording unconfirmed movement. |

### 2.7 Incident Handling

**Actor:** Operator.

| ID | Use case | Description |
| --- | --- | --- |
| UC-I01 | Handle an Operational Incident | Abstract parent for reviewing an incident, containing its effects, recording corrective action, and updating resolution status. Specialized by UC-I02 and UC-I03. |
| UC-I02 | Handle a Vehicle Failure | Investigate an affected vehicle, restrict ineligible use, address affected reservations or rentals, and record recovery or repair status before restoring eligibility. |
| UC-I03 | Handle a Charging-Point Failure | Mark the charging point unavailable, identify affected sessions and allocations, arrange the response or rescheduling, and record restoration. Prevent new allocations to unavailable equipment. |

### 2.8 Smart Charging

**Actor:** Operator.

| ID | Use case | Description |
| --- | --- | --- |
| UC-C01 | View the Charging Queue and Schedule | View charging requests, priorities, allocated points and intervals, and requests that remain unscheduled. |
| UC-C02 | Generate a Charging Schedule | Produce or refresh a schedule using battery levels, upcoming usage requirements, available equipment, charging capacity, and existing commitments. Return feasible allocations and identify unscheduled requests. |
| UC-C03 | Adjust a Charging Schedule | Modify permitted priorities, intervals, or assignments in an existing schedule. Validate resource availability and conflicts before accepting changes and record their effects on affected requests. |

### 2.9 What-if Simulation

**Actor:** Operator.

| ID | Use case | Description |
| --- | --- | --- |
| UC-W01 | Configure a What-if Scenario | Define hypothetical conditions, affected resources, and a simulation period. Scenarios include increased Metro arrivals, full Hubs, charging-demand surges, charging-point failures, and vehicle concentration. Validate the parameters before execution. |
| UC-W02 | Run a What-if Simulation | Execute a configured scenario against a network snapshot, simulate resource and demand changes, evaluate their effects, and generate coordination recommendations. Keep simulated changes separate from live operations. |
| UC-W03 | View Simulation Results | View a completed run's predicted service capacity, parking utilization, vehicle availability, and charging congestion. Identify the baseline, assumptions, and simulation run. |
| UC-W04 | Review Coordination Recommendations | View recommended redistribution, charging adjustments, or redirection to alternative Hubs and their expected effects. Reviewing a recommendation does not apply it to live operations. |
| UC-W05 | Compare What-if Scenarios | Compare completed runs or a scenario against a baseline using consistent measures. Display differences in snapshots, assumptions, and time horizons that affect comparability. |

## 3. Supporting Use Cases

| ID | Use case | Description |
| --- | --- | --- |
| UC-S01 | Check Vehicle Availability | Check the selected vehicle's operating condition and relevant commitments, accounting for the requesting Student's valid reservation when applicable. Return an availability decision and reason. |
| UC-S02 | Check Parking Availability | Check capacity for every slot in the selected Hub's requested parking interval against occupancy, overlapping reservations, and unavailable spaces. Sufficient capacity must be available in all covered slots; if even one slot lacks capacity, the whole request cannot be fulfilled. Return an availability decision and reason. |
| UC-S03 | Validate Redistribution Feasibility | Check vehicle eligibility, source/destination suitability, conflicting commitments, and destination capacity. Return a feasibility decision and any rejection reasons. |
| UC-S04 | Prioritize Charging Requests | Prioritize eligible requests using battery levels, upcoming usage requirements, and the configured tie-breaking policy. |
| UC-S05 | Allocate Charging Slots | Assign available charging points and time intervals without violating capacity or existing commitments. Identify unallocated requests and the reasons they cannot be scheduled. |
| UC-S06 | Obtain a Network Snapshot | Obtain a consistent, timestamped baseline of the network state and relevant resource commitments for the simulation. |
| UC-S07 | Evaluate Scenario Impact | Calculate the simulated effects on service capacity and resource utilization relative to the selected baseline. |
| UC-S08 | Generate Coordination Recommendations | Generate actions appropriate to the simulated conditions, such as vehicle redistribution, charging adjustments, or alternative-Hub redirection. Return expected effects or indicate that no intervention is required. |

## 4. Relationships

### 4.1 Actor Associations

| Actor | Directly associated use cases |
| --- | --- |
| ACT-01 — Student | UC-A01–UC-A02; UC-H01–UC-H03; UC-R01–UC-R08; UC-P01–UC-P07; UC-X01 |
| ACT-02 — Operator | UC-A01–UC-A02; UC-F01–UC-F05; UC-I01; UC-C01–UC-C03; UC-W01–UC-W05 |

Operator participation in UC-I02 and UC-I03 is inherited through UC-I01.

### 4.2 Include Relationships

| ID | Including use case (source) | Included use case (target) |
| --- | --- | --- |
| INC-01 | UC-R03 — Reserve a Shared Vehicle | UC-S01 — Check Vehicle Availability |
| INC-02 | UC-R04 — Pick Up a Shared Vehicle | UC-S01 — Check Vehicle Availability |
| INC-03 | UC-P01 — Reserve a Parking Space | UC-S02 — Check Parking Availability |
| INC-04 | UC-F04 — Coordinate Vehicle Redistribution | UC-S03 — Validate Redistribution Feasibility |
| INC-05 | UC-C02 — Generate a Charging Schedule | UC-S04 — Prioritize Charging Requests |
| INC-06 | UC-C02 — Generate a Charging Schedule | UC-S05 — Allocate Charging Slots |
| INC-07 | UC-W02 — Run a What-if Simulation | UC-S06 — Obtain a Network Snapshot |
| INC-08 | UC-W02 — Run a What-if Simulation | UC-S07 — Evaluate Scenario Impact |
| INC-09 | UC-W02 — Run a What-if Simulation | UC-S08 — Generate Coordination Recommendations |

### 4.3 Generalization Relationships

| ID | Specialized use case (source) | General use case (target) |
| --- | --- | --- |
| GEN-01 | UC-I02 — Handle a Vehicle Failure | UC-I01 — Handle an Operational Incident |
| GEN-02 | UC-I03 — Handle a Charging-Point Failure | UC-I01 — Handle an Operational Incident |

## 5. References

- *03_Ch3_4 Requirements Engineering.pdf*, slides 53–56.
- [OMG Unified Modeling Language 2.5.1](https://www.omg.org/spec/UML/2.5.1), Section 18: Use Cases.
