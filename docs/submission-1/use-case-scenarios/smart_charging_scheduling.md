# Smart Charging Scheduling — Use-case scenarios

## Shared rule

A submitted charging draft is checked against point availability and the requested time window. If a feasible slot exists, the system automatically saves one `Scheduled` request with one allocation, ordered by FCFS. If all suitable slots are full or the interval is too short, it reports `Full`/`Insufficient Charging Time` and saves no request. There is no waiting `Unscheduled` request and no Operator refresh requirement. For identical submission timestamps only, lower battery level breaks the tie; request ID breaks a remaining tie.

# UC-C01 — View the Charging Queue and Schedule

**Actor:** Operator. **Trigger:** Open Charging Queue and Schedule.

**Preconditions:** Operator is authorized; Hub exists.

**Main flow:**

1. The system reads accepted charging requests, current point status and the saved schedule for the Hub.
2. It displays requests in FCFS submission order, their assigned point and interval, and point availability.
3. The Operator reviews the schedule. This use case does not change any request or allocation.

**Alternative:** If there are no accepted requests, display an empty schedule and current point status.

**Exception:** If required data cannot be read, display an error rather than a partial schedule.

# UC-C02 — Generate a Charging Schedule

**Actors:** Student or an authorized internal requester; Smart Charging System. **Trigger:** Submit a charging request. The scheduling step runs automatically.

**Preconditions:** The request window, Hub, vehicle and current/target battery values are valid. The system has a configured battery-capacity assumption and current point status/power.

**Main flow:**

1. The system receives the draft and records the submission instant used for FCFS.
2. It estimates charging energy from the battery difference and configured capacity assumption, then estimates duration for candidate points.
3. It checks the requested window, existing allocations and operational points in FCFS order. Only identical timestamps use lower battery level as a tie-breaker.
4. If a feasible point and interval exist, it saves the request as `Scheduled` with exactly one `ChargingAllocation` and updates the current schedule together.
5. It returns the request reference, point and interval. Operator can later view the saved plan through UC-C01.

**Alternative — Full or insufficient time:** No point/interval fits. Show `Full` or `Insufficient Charging Time`; save no request or allocation. The Student may submit a new request with another window, which receives a new submission instant.

**Alternative — No charging required:** If current battery already meets the target, reject the draft with `No Charging Required`; save no request.

**Exception:** If point data, configuration or saving fails, keep the previous valid schedule and save no new request.

# UC-C03 — Adjust a Charging Schedule

### Use Case Information

| **Field**             | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use-case ID**       | UC-C03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Use-case name**     | Adjust a Charging Schedule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Use-case overview** | To allow the Operator to modify a charging interval or charging-point assignment in an existing schedule while keeping FCFS queue order and validating the resulting schedule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Actors**            | Operator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Preconditions**     | 1. The system is running.<br>2. The Operator is authenticated and authorized to modify schedules.<br>3. A current charging schedule exists.<br>4. Charging-point status information is available.<br>5. The selected charging request is eligible for manual adjustment.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Trigger**           | The Operator selects a charging request and clicks the **“Adjust Schedule”** button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Steps**             | 1. The system retrieves the selected charging request and its current schedule.<br>2. The system displays the FCFS queue position as read-only information, plus the charging point, start time, and end time.<br>3. The Operator modifies one or more permitted scheduling attributes.<br>4. The Operator clicks **“Save Adjustment”**.<br>5. The system validates the requested changes.<br>6. The system checks whether the selected charging point is operational and available.<br>7. The system checks whether the new charging interval conflicts with another allocation.<br>8. The system checks the basic scheduling constraints.<br>9. If all validations pass, the system saves the modification.<br>10. The system displays the updated schedule. |
| **Post-conditions**   | The requested schedule modification is saved only if all validation rules pass. The resulting schedule does not assign a faulty/unavailable charging point or create a conflicting charging allocation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Exception flow**    | 1. Charging-point status cannot be retrieved.<br>2. The database cannot save the modification.<br>3. Another scheduling operation modifies the same schedule before the adjustment is saved.<br>4. The original valid schedule remains unchanged if the adjustment cannot be safely applied.                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Main Flow

1. **Operator:** Selects a charging request from the current schedule.
2. **System:** Retrieves the current scheduling information.
3. **System:** displays the FCFS queue position as read-only information, plus the charging point, start time, and end time.
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

**A1. Operator Changes Charging Interval**

1. At Step 4, the Operator changes the start or end time.
2. The System validates the new interval.
3. The System checks for conflicts with other charging allocations.
4. If no conflict exists, the System accepts the new interval.
5. The System continues from Step 10.

**A2. Operator Changes Charging Point**

1. At Step 4, the Operator selects another charging point.
2. The System retrieves the latest status of the selected point.
3. The System checks whether the point is operational and available during the requested interval.
4. If valid, the System accepts the new charging-point assignment.
5. The System continues from Step 10.

**A3. Proposed Schedule Causes a Conflict**

1. At Step 8, the System detects an overlap with another charging allocation.
2. The System rejects the proposed adjustment.
3. The System identifies the conflicting allocation to the Operator.
4. The Operator selects another interval or charging point.
5. The original schedule remains unchanged.

**A4. Selected Charging Point Is Faulty**

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
