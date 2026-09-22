# UC-C01 — View the Charging Queue and Schedule

### Use Case Information

| **Field**             | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use-case ID**       | UC-C01                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Use-case name**     | View the Charging Queue and Schedule                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Use-case overview** | To provide the Operator with information about pending charging requests, their priority scores, assigned charging points, planned charging intervals, and requests that cannot currently be scheduled.                                                                                                                                                                                                                                                         |
| **Actors**            | Operator(Secondary actor :  Student)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Preconditions**     | 1. The system is running.<br>2. The Operator is authenticated and has permission to access the Smart Charging Scheduler.<br>3. Charging requests are available in the database.<br>4. Charging-point information is available.                                                                                                                                                                                                                                  |
| **Trigger**           | The Operator clicks the **“Charging Queue & Schedule”** button.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Steps**             | 1. The system retrieves current charging requests.<br>2. The system retrieves the current status of charging points.<br>3. The system retrieves the current charging schedule.<br>4. The system retrieves the priority score of each pending request.<br>5. The system displays the charging queue and schedule.<br>6. The system displays requests that cannot currently be scheduled and their reasons.<br>7. The Operator reviews the displayed information. |
| **Post-conditions**   | The current charging queue, schedule, charging-point allocation, and unscheduled requests are displayed to the Operator. No scheduling data is modified.                                                                                                                                                                                                                                                                                                        |
| **Exception flow**    | 1. The system cannot retrieve charging requests or schedule data.<br>2. The system cannot retrieve the latest charging-point status.<br>3. The system displays an appropriate error or unavailable-status message and does not present incomplete data as current.                                                                                                                                                                                              |

### Main Flow

1. **Operator:** Opens the **Charging Queue & Schedule** page.
2. **System:** Verifies the Operator's access permission.
3. **System:** Retrieves all active and pending charging requests.
4. **System:** Retrieves the latest charging-point status.
5. **System:** Retrieves the current charging schedule.
6. **System:** Retrieves the priority score associated with each pending charging request.
7. **System:** displays the charging queue, including the request status and priority.
8. **System:** displays the current schedule, including the assigned charging point and planned charging interval.
9. **System:** displays requests that are currently unscheduled and the reason why they could not be scheduled.
10. **Operator:** Reviews the charging queue and schedule.

### Alternative Flow

**A1. No Pending Charging Requests**

1. At Step 3, the System finds no pending charging requests.
2. The System displays an empty queue message.
3. The System continues to display the existing schedule and charging-point status.
4. The use case ends successfully.

**A2. Some Requests Are Unscheduled**

1. At Step 9, the System identifies requests without a valid charging allocation.
2. The System displays these requests in the **Unscheduled Requests** section.
3. The System displays the reason for each request, such as **No Available Charging Point** or **Insufficient Charging Time**.
4. The Operator reviews the information.

### Exception Flow

**E1. Database Retrieval Failure**

1. The System fails to retrieve the required scheduling information.
2. The System records the error.
3. The System displays an error message.
4. The System does not display incomplete data as the current schedule.
5. The use case ends unsuccessfully.

**E2. Charging Point Status Unavailable**

1. The System fails to obtain the latest charging-point status.
2. The System displays that charging-point information is temporarily unavailable.
3. The existing schedule is not modified.

---

# UC-C02 — Generate a Charging Schedule

### Use Case Information

| **Field**             | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use-case ID**       | UC-C02                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Use-case name**     | Generate a Charging Schedule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Use-case overview** | To automatically generate or refresh a feasible charging schedule based on current battery levels, upcoming vehicle usage requirements, charging capacity, and available charging resources.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Actors**            | Operator; Smart Charging Scheduler System                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Preconditions**     | 1. The system is running.<br>2. The Operator is authenticated and authorized to generate a schedule.<br>3. At least one active charging request exists.<br>4. Charging-point status and charging capacity information are available.<br>5. Required scheduling information is available.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Trigger**           | The Operator clicks the **“Generate Charging Schedule”** or **“Refresh Schedule”** button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Steps**             | 1. The system retrieves active charging requests.<br>2. The system retrieves battery levels and upcoming vehicle usage requirements.<br>3. The system retrieves available charging points and their capacities.<br>4. The system executes **<<include>> Prioritize Charging Requests**.<br>5. The system calculates a priority score for each request.<br>6. The system executes **<<include>> Allocate Charging Slots**.<br>7. The system assigns feasible charging points and time intervals without conflicts.<br>8. The system identifies requests that cannot be scheduled.<br>9. The system saves the generated schedule.<br>10. The system displays the generated schedule and unscheduled requests. |
| **Post-conditions**   | A valid charging schedule is generated and stored. Charging allocations do not overlap on the same charging point. Requests that cannot be scheduled are marked as unscheduled with a reason.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Exception flow**    | 1. Charging-point information cannot be retrieved.<br>2. Required vehicle data cannot be retrieved.<br>3. The scheduling process times out.<br>4. The generated schedule cannot be saved to the database.<br>5. The system keeps the previous valid schedule unchanged if one exists.                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Main Flow

1. **Operator:** Clicks **Generate Charging Schedule**.
2. **System:** Verifies the Operator's permission.
3. **System:** Retrieves all active charging requests.
4. **System:** retrieves the current battery level and next required usage time for each request.
5. **System:** retrieves available charging points and their charging capacities.
6. **System:** validates the retrieved scheduling data.
7. **System:** executes **<<include>> Prioritize Charging Requests**.
8. **System:** calculates a priority score for each charging request based on the agreed business rules.
9. **System:** orders the requests according to their calculated priority.
10. **System:** executes **<<include>> Allocate Charging Slots**.
11. **System:** checks available charging points and available time intervals.
12. **System:** assigns a feasible charging point and time interval to the highest-priority request.
13. **System:** checks that the allocation does not conflict with an existing allocation.
14. **System:** checks that the charging interval satisfies the request's required usage time.
15. **System:** repeats Steps 12–14 for the remaining requests.
16. **System:** marks requests that cannot receive a valid allocation as **Unscheduled**.
17. **System:** saves the generated schedule.
18. **System:** displays the generated schedule and unscheduled requests.
19. **Operator:** Reviews the generated schedule.

### Alternative Flow

**A1. Vehicle Already Has Sufficient Battery**

1. At Step 4, the System determines that the vehicle has already reached its required battery level.
2. The System marks the request as **No Charging Required**.
3. The request is excluded from slot allocation.
4. The System continues processing the remaining requests.

**A2. Insufficient Charging Time**

1. At Step 14, the System determines that the available time before the vehicle's next required usage is insufficient.
2. The System does not allocate a charging slot.
3. The System marks the request as **Unscheduled**.
4. The System records **Insufficient Charging Time** as the reason.
5. The System continues processing other requests.

**A3. No Available Charging Point**

1. At Step 12, the System cannot find a suitable available charging point.
2. The System marks the request as **Unscheduled**.
3. The System records **No Available Charging Point** as the reason.
4. The System continues processing the remaining requests.

**A4. Requests Have Equal Priority**

1. At Step 9, two or more requests have the same priority score.
2. The System applies the predefined tie-breaking rule.
3. The request with the earlier required usage time is processed first.
4. If the required usage times are also equal, the earlier-created request is processed first.
5. The System continues with slot allocation.

### Exception Flow

**E1. Charging Point Information Unavailable**

1. At Step 5, the System cannot retrieve charging-point status.
2. The System stops the scheduling process.
3. The System records the error.
4. The System informs the Operator that the schedule cannot currently be generated.
5. The previous valid schedule remains unchanged.

**E2. Scheduling Timeout**

1. During Steps 7–15, the scheduling process exceeds the configured timeout.
2. The System terminates the current scheduling operation.
3. The System does not publish the incomplete schedule.
4. The System records the timeout.
5. The previous valid schedule remains unchanged.

**E3. Database Save Failure**

1. At Step 17, the System fails to save the generated schedule.
2. The System does not activate the incomplete schedule.
3. The System records the database error.
4. The System informs the Operator that schedule generation failed.
5. The previous valid schedule remains unchanged.

---

# UC-C03 — Adjust a Charging Schedule

### Use Case Information

| **Field**             | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use-case ID**       | UC-C03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Use-case name**     | Adjust a Charging Schedule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Use-case overview** | To allow the Operator to manually modify permitted scheduling decisions, such as charging priority, charging interval, or charging-point assignment, while ensuring that the modified schedule remains valid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Actors**            | Operator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Preconditions**     | 1. The system is running.<br>2. The Operator is authenticated and authorized to modify schedules.<br>3. A current charging schedule exists.<br>4. Charging-point status information is available.<br>5. The selected charging request is eligible for manual adjustment.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Trigger**           | The Operator selects a charging request and clicks the **“Adjust Schedule”** button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Steps**             | 1. The system retrieves the selected charging request and its current schedule.<br>2. The system displays the current priority, charging point, start time, and end time.<br>3. The Operator modifies one or more permitted scheduling attributes.<br>4. The Operator clicks **“Save Adjustment”**.<br>5. The system validates the requested changes.<br>6. The system checks whether the selected charging point is operational and available.<br>7. The system checks whether the new charging interval conflicts with another allocation.<br>8. The system checks the basic scheduling constraints.<br>9. If all validations pass, the system saves the modification.<br>10. The system displays the updated schedule. |
| **Post-conditions**   | The requested schedule modification is saved only if all validation rules pass. The resulting schedule does not assign a faulty/unavailable charging point or create a conflicting charging allocation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Exception flow**    | 1. Charging-point status cannot be retrieved.<br>2. The database cannot save the modification.<br>3. Another scheduling operation modifies the same schedule before the adjustment is saved.<br>4. The original valid schedule remains unchanged if the adjustment cannot be safely applied.                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Main Flow

1. **Operator:** Selects a charging request from the current schedule.
2. **System:** Retrieves the current scheduling information.
3. **System:** displays the current priority, charging point, start time, and end time.
4. **Operator:** Changes the required scheduling information.
5. **Operator:** Clicks **Save Adjustment**.
6. **System:** validates the requested changes.
7. **System:** checks the status of the selected charging point.
8. **System:** checks whether the proposed charging interval overlaps with another allocation.
9. **System:** checks whether the adjusted schedule satisfies the basic scheduling constraints.
10. **System:** saves the adjustment if all validation checks pass.
11. **System:** updates the charging schedule.
12. **System:** displays a confirmation message.
13. **System:** displays the updated schedule.

### Alternative Flow

**A1. Operator Changes Only Priority**

1. At Step 4, the Operator changes only the priority.
2. The System validates the new priority value.
3. The System saves the new priority.
4. The System updates the queue order.
5. The existing charging allocation remains unchanged.

**A2. Operator Changes Charging Interval**

1. At Step 4, the Operator changes the start or end time.
2. The System validates the new interval.
3. The System checks for conflicts with other charging allocations.
4. If no conflict exists, the System accepts the new interval.
5. The System continues from Step 10.

**A3. Operator Changes Charging Point**

1. At Step 4, the Operator selects another charging point.
2. The System retrieves the latest status of the selected point.
3. The System checks whether the point is operational and available during the requested interval.
4. If valid, the System accepts the new charging-point assignment.
5. The System continues from Step 10.

**A4. Proposed Schedule Causes a Conflict**

1. At Step 8, the System detects an overlap with another charging allocation.
2. The System rejects the proposed adjustment.
3. The System identifies the conflicting allocation to the Operator.
4. The Operator selects another interval or charging point.
5. The original schedule remains unchanged.

**A5. Selected Charging Point Is Faulty**

1. At Step 7, the System detects that the selected charging point is faulty or unavailable.
2. The System rejects the proposed assignment.
3. The System displays the current status of the charging point.
4. The Operator selects another available charging point.
5. The original schedule remains unchanged.

### Exception Flow

**E1. Charging Point Status Service Failure**

1. At Step 7, the System cannot retrieve the latest charging-point status.
2. The System cannot safely validate the adjustment.
3. The System rejects the adjustment temporarily.
4. The System informs the Operator that the charging-point status cannot be verified.
5. The original schedule remains unchanged.

**E2. Database Update Failure**

1. At Step 10, the System fails to save the modification.
2. The System rolls back the attempted change.
3. The System records the error.
4. The System informs the Operator that the adjustment could not be saved.
5. The previous valid schedule remains active.

**E3. Concurrent Modification**

1. Another scheduling operation modifies the same schedule before Step 10.
2. The System detects that the schedule being edited is outdated.
3. The System rejects the outdated modification.
4. The System asks the Operator to reload the latest schedule.
5. The original latest schedule remains unchanged.
