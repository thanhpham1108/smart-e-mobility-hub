# What-if Simulation — Use-Case Scenarios

This document covers the Operator's assigned What-if Simulation scope: configuring hypothetical operating conditions, running an isolated simulation, viewing predicted effects, reviewing coordination recommendations, and comparing completed scenarios.

> **Scope note:** A simulation is an analytical operation performed on a timestamped copy of the network state. It must not modify live vehicles, reservations, parking occupancy, charging sessions, charging schedules, incidents, or redistribution assignments. Reviewing a recommendation also does not apply it to live operations.

---

# UC-W01 — Configure a What-if Scenario

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-W01 |
| **Use-case name** | Configure a What-if Scenario |
| **Use-case overview** | To allow the Operator to define and validate hypothetical operating conditions, affected resources, assumptions, and a simulation period before running a What-if Simulation. Supported conditions include increased Metro arrivals, a full or offline Hub, increased charging demand, charging-point failures, and excessive vehicle concentration. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to use What-if Simulation functions.<br>3. The Mobility Hubs and resources that may be selected are registered in the system.<br>4. The simulation configuration rules are available. |
| **Trigger** | The Operator selects **Create What-if Scenario** from the simulation workspace. |
| **Steps** | 1. The system displays the supported scenario conditions and configurable parameters.<br>2. The Operator selects one or more hypothetical conditions.<br>3. The Operator selects the affected Hubs or resources and specifies the simulation period.<br>4. The Operator enters the condition-specific parameters and assumptions.<br>5. The system validates the required fields, values, time period, and selected resources.<br>6. The system displays the validated scenario summary.<br>7. The Operator confirms the configuration.<br>8. The system saves the scenario as ready to run. |
| **Post-conditions** | A valid scenario configuration is stored with its conditions, affected resources, assumptions, and simulation period. No simulation has run and no live operational state has changed. |
| **Exception flow** | 1. Required configuration data cannot be retrieved.<br>2. A selected Hub or resource no longer exists or is unavailable for simulation.<br>3. The scenario cannot be saved.<br>4. The system reports the problem and does not mark the scenario as ready to run. |

### Main Flow

1. **Operator:** Opens the What-if Simulation workspace.
2. **Operator:** Selects **Create What-if Scenario**.
3. **System:** Verifies the Operator's access permission.
4. **System:** Displays the supported hypothetical conditions:
   - increased student arrivals at the Metro Hub;
   - a Hub reaching or exceeding parking capacity;
   - a Hub becoming unavailable or offline;
   - increased charging demand;
   - one or more charging-point failures; and
   - excessive vehicle concentration at a selected Hub.
5. **Operator:** Selects one or more conditions to simulate.
6. **System:** Displays the parameters required for the selected conditions.
7. **Operator:** Selects the affected Hubs, vehicles, charging points, or other applicable resources.
8. **Operator:** Specifies the simulation start time, duration, and condition-specific values, such as an arrival rate, demand increase, unavailable capacity, failed charging points, or vehicle quantity.
9. **Operator:** Records any additional assumptions needed to interpret the scenario.
10. **Operator:** Requests validation of the configuration.
11. **System:** Validates that all required parameters are present and use permitted values and units.
12. **System:** Validates that the simulation period is valid and that every referenced Hub or resource exists.
13. **System:** Displays a summary of the conditions, affected resources, assumptions, and simulation period.
14. **Operator:** Confirms the scenario configuration.
15. **System:** Saves the validated scenario with the status **Ready to Run**.
16. **System:** Displays the scenario identifier and confirms that no live operational data has been changed.

### Alternative Flow

**A1. Increased Metro Arrivals**

1. At Step 5, the Operator selects **Increased Metro Arrivals**.
2. The System requests the Metro Hub, expected arrival rate or increase, arrival pattern, and affected time period.
3. The Operator enters the requested values.
4. The use case continues from Step 9.

**A2. Hub Parking Capacity Reaches Its Limit**

1. At Step 5, the Operator selects **Hub at Full Parking Capacity**.
2. The System requests the affected Hub, simulated occupancy or unavailable-space quantity, and affected time period.
3. The Operator enters the requested values.
4. The use case continues from Step 9.

**A3. Charging Demand Surge, Charging-Point Failure, or Hub Offline**

1. At Step 5, the Operator selects **Charging Demand Surge**, **Charging-Point Failure**, **Hub Offline**, or a combination of these conditions.
2. The System requests the demand increase, affected Hub, failed charging points or unavailable Hub where applicable, and affected time period.
3. The Operator enters the requested values.
4. The use case continues from Step 9.

**A4. Excessive Vehicle Concentration**

1. At Step 5, the Operator selects **Excessive Vehicle Concentration**.
2. The System requests the affected Hub, vehicle types or quantity, concentration threshold, and affected time period.
3. The Operator enters the requested values.
4. The use case continues from Step 9.

**A5. Multiple Combined Conditions**

1. At Step 5, the Operator selects more than one hypothetical condition.
2. The System displays the parameters required for every selected condition.
3. The Operator provides the combined assumptions and confirms that their time periods are intentional.
4. The System validates each condition and their shared affected resources.
5. The use case continues from Step 13.

**A6. Correct Invalid Parameters**

1. At Step 11 or 12, the System identifies a missing, out-of-range, contradictory, or invalid parameter.
2. The System identifies the affected field and explains the validation rule.
3. The Operator corrects the parameter or selected resource.
4. The use case resumes from Step 10.

### Exception Flow

**E1. Scenario Configuration Data Unavailable**

1. At Step 4 or 6, the System cannot retrieve the supported conditions or their configuration rules.
2. The System records the retrieval failure.
3. The System informs the Operator that a scenario cannot currently be configured.
4. The System does not create a ready-to-run scenario.
5. The use case ends unsuccessfully.

**E2. Selected Resource Is No Longer Available**

1. At Step 12, the System determines that a selected Hub or resource no longer exists or cannot be referenced.
2. The System identifies the affected selection.
3. The System does not save the scenario as ready to run.
4. The Operator may replace the selection and retry validation.
5. If the Operator does not replace it, the use case ends unsuccessfully.

**E3. Scenario Save Failure**

1. At Step 15, the System fails to save the validated configuration.
2. The System records the save failure.
3. The System informs the Operator that the scenario was not created.
4. No simulation is started and live operational data remains unchanged.
5. The use case ends unsuccessfully.

---

# UC-W02 — Run a What-if Simulation

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-W02 |
| **Use-case name** | Run a What-if Simulation |
| **Use-case overview** | To execute a validated What-if Scenario against a consistent, timestamped network snapshot; simulate the resulting demand and resource-state changes; evaluate their effects; and generate appropriate coordination recommendations without changing live operations. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to run simulations.<br>3. A valid scenario with the status **Ready to Run** exists.<br>4. Network-state information required for the scenario is available.<br>5. The simulation engine is available. |
| **Trigger** | The Operator selects a ready scenario and clicks **Run Simulation**. |
| **Includes** | `UC-S06 — Obtain a Network Snapshot`<br>`UC-S07 — Evaluate Scenario Impact`<br>`UC-S08 — Generate Coordination Recommendations` |
| **Steps** | 1. The system revalidates the selected scenario.<br>2. The system obtains a consistent, timestamped network snapshot.<br>3. The system creates an isolated simulation state and identifier.<br>4. The system executes the scenario asynchronously over its configured period.<br>5. The system applies the hypothetical conditions only to the simulated state.<br>6. The system evaluates predicted effects relative to the baseline.<br>7. The system generates coordination recommendations and expected effects.<br>8. The system stores the completed run, assumptions, results, and recommendations.<br>9. The system informs the Operator that the run is complete. |
| **Post-conditions** | A successful run is stored with its run identifier, scenario configuration, baseline snapshot and timestamp, assumptions, predicted effects, and recommendations. The live network state remains unchanged. If execution fails, no incomplete result is published as a completed run. |
| **Exception flow** | 1. A consistent network snapshot cannot be obtained.<br>2. The simulation engine fails or exceeds its permitted execution time.<br>3. Impact evaluation or recommendation generation fails.<br>4. The completed run cannot be saved.<br>5. The system marks the run as failed where possible, does not publish incomplete results as complete, and does not change live operations. |

### Main Flow

1. **Operator:** Selects a scenario with the status **Ready to Run**.
2. **Operator:** Clicks **Run Simulation**.
3. **System:** Verifies the Operator's access permission.
4. **System:** Revalidates the selected scenario, its affected resources, assumptions, and simulation period.
5. **System:** Executes `<<include>> UC-S06 — Obtain a Network Snapshot`.
6. **System:** Obtains a consistent, timestamped baseline containing the relevant Hub states, vehicle distribution and battery levels, parking occupancy and commitments, charging-point states, charging requests and schedules, and operational incidents.
7. **System:** Creates a simulation run identifier and an isolated copy of the relevant baseline state.
8. **System:** Records the scenario configuration, baseline timestamp, data-freshness information, and assumptions for the run.
9. **System:** Sets the run status to **Running** and starts the simulation asynchronously without blocking the Operator from navigating to other available functions.
10. **System:** Applies the configured hypothetical conditions only to the isolated simulation state.
11. **System:** Advances the simulated demand, vehicle, parking, and charging states over the configured simulation period.
12. **System:** Executes `<<include>> UC-S07 — Evaluate Scenario Impact`.
13. **System:** Calculates predicted service capacity, parking utilization, vehicle availability, charging congestion, and other affected resource measures relative to the baseline.
14. **System:** Executes `<<include>> UC-S08 — Generate Coordination Recommendations`.
15. **System:** Generates appropriate recommendations, such as redistributing vehicles, adjusting charging schedules, or redirecting users to alternative Hubs, together with their expected effects.
16. **System:** Stores the simulated state, evaluation results, and recommendations under the simulation run identifier.
17. **System:** Sets the run status to **Completed**.
18. **System:** Verifies that no live vehicle, reservation, parking, charging, incident, or redistribution state was modified by the run.
19. **System:** Informs the Operator that the simulation is complete and makes the result available for viewing.

### Alternative Flow

**A1. Live Network Changes After the Snapshot**

1. After Step 6, the live network receives new telemetry or operational events.
2. The System keeps the simulation bound to the recorded baseline snapshot rather than mixing later live updates into the run.
3. The System retains the baseline timestamp and data-freshness information for interpretation of the results.
4. The use case continues from Step 7.

**A2. Simulated Hub Becomes Offline**

1. At Step 10, the configured conditions make a Hub offline in the simulation state.
2. The System marks the Hub unavailable only within the simulation.
3. The System changes every simulated active charging session at that Hub to **Paused**.
4. The System stops advancing charging time for those simulated sessions while the Hub remains offline.
5. The corresponding live Hub and charging sessions remain unchanged.
6. The use case continues from Step 11.

**A3. Scenario Produces No Material Service Impact**

1. At Step 13, the System determines that the simulated condition does not materially reduce service capacity or create a resource constraint under the configured evaluation rules.
2. The System records the evaluated measures and the absence of material impact.
3. The use case continues from Step 14.

**A4. No Intervention Is Required**

1. At Step 15, the System determines that no redistribution, charging adjustment, or Hub redirection is required.
2. The System records **No Intervention Required** as the recommendation outcome and includes the supporting evaluation measures.
3. The use case continues from Step 16.

**A5. Some Simulated Demand Cannot Be Served**

1. At Step 13, the System identifies demand that cannot be served because of insufficient vehicles, parking capacity, or charging capacity.
2. The System records the affected Hub, time period, resource constraint, and predicted unserved demand.
3. At Step 15, the System generates feasible recommendations where possible and identifies any remaining unserved demand.
4. The use case continues from Step 16.

### Exception Flow

**E1. Network Snapshot Cannot Be Obtained**

1. At Step 5 or 6, the System cannot obtain a consistent baseline snapshot or required resource data.
2. The System records the snapshot failure.
3. The System does not start the simulation using an incomplete or mixed baseline.
4. The System marks the run as **Failed** where a run identifier has already been created.
5. The System informs the Operator that the simulation could not be started.
6. Live operational data remains unchanged.

**E2. Simulation Execution Failure or Timeout**

1. During Steps 9–11, the simulation engine fails or exceeds the configured execution time limit.
2. The System stops the affected simulation task.
3. The System does not publish the incomplete simulated state as a completed result.
4. The System records the failure and marks the run as **Failed**.
5. The System informs the Operator that execution was unsuccessful.
6. Live operational data remains unchanged.

**E3. Impact Evaluation or Recommendation Generation Failure**

1. At Steps 12–15, the System cannot complete impact evaluation or recommendation generation.
2. The System does not mark the run as **Completed**.
3. The System records the failed stage and preserves diagnostic information without presenting partial output as a complete result.
4. The System marks the run as **Failed**.
5. Live operational data remains unchanged.

**E4. Completed Run Save Failure**

1. At Step 16, the System fails to store the completed simulation information.
2. The System does not publish the run as completed.
3. The System records the persistence failure where possible.
4. The System informs the Operator that the result could not be saved.
5. Live operational data remains unchanged.

---

# UC-W03 — View Simulation Results

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-W03 |
| **Use-case name** | View Simulation Results |
| **Use-case overview** | To allow the Operator to inspect a completed simulation run's predicted service capacity, parking utilization, vehicle availability, charging congestion, and affected resources while clearly identifying the baseline, assumptions, time horizon, and simulation run. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to view simulation results.<br>3. A completed simulation run exists.<br>4. The stored result and its baseline metadata are available. |
| **Trigger** | The Operator selects a completed run and chooses **View Results**. |
| **Steps** | 1. The system retrieves the selected completed run.<br>2. The system displays the run identifier, scenario conditions, assumptions, baseline timestamp, data freshness, and simulation period.<br>3. The system displays predicted service capacity, parking utilization, vehicle availability, charging congestion, and affected resources.<br>4. The system distinguishes simulated values from baseline and live values.<br>5. The Operator reviews the results. |
| **Post-conditions** | The selected completed result is displayed with sufficient baseline and assumption information for interpretation. No simulation result or live operational state is modified. |
| **Exception flow** | 1. The selected run cannot be found.<br>2. The stored result or baseline metadata cannot be retrieved.<br>3. The system identifies the unavailable information and does not present an incomplete result as complete. |

### Main Flow

1. **Operator:** Opens the list of simulation runs.
2. **System:** Displays available runs with their identifiers, scenario names, statuses, and completion times.
3. **Operator:** Selects a run with the status **Completed**.
4. **Operator:** Selects **View Results**.
5. **System:** Retrieves the selected run, its scenario configuration, and its result data.
6. **System:** Displays the run identifier, configured conditions, affected resources, assumptions, baseline timestamp, data-freshness information, and simulation period.
7. **System:** Displays the predicted service capacity and unserved demand, if any.
8. **System:** Displays predicted parking utilization and identifies Hubs that reach or approach capacity.
9. **System:** Displays predicted vehicle availability and distribution across affected Hubs.
10. **System:** Displays predicted charging utilization, congestion, paused sessions, and unscheduled demand where applicable.
11. **System:** Shows the relevant baseline and simulated values using consistent measures.
12. **System:** Labels all predicted values as simulated and keeps them visually distinct from current live operational values.
13. **Operator:** Reviews the displayed effects and their supporting assumptions.

### Alternative Flow

**A1. No Material Adverse Impact**

1. At Steps 7–10, the System finds no material service-capacity reduction or resource congestion under the configured evaluation rules.
2. The System displays the evaluated measures and identifies that no material adverse impact was predicted.
3. The Operator reviews the result.
4. The use case ends successfully.

**A2. Some Baseline Data Was Stale**

1. At Step 6, the stored baseline metadata identifies one or more data items as stale at snapshot time.
2. The System displays the affected item and its latest accepted timestamp.
3. The System retains the result but warns the Operator that the stale data may affect interpretation.
4. The use case continues from Step 7.

**A3. Operator Selects a Run That Is Not Complete**

1. At Step 3, the Operator selects a run with the status **Running** or **Failed**.
2. The System displays the current status and any available failure reason.
3. The System does not present partial output as a completed simulation result.
4. The Operator returns to the run list or selects another completed run.

### Exception Flow

**E1. Simulation Run Not Found**

1. At Step 5, the System cannot find the selected simulation run.
2. The System informs the Operator that the run is unavailable.
3. The System does not display result values from another run.
4. The use case ends unsuccessfully.

**E2. Result or Baseline Metadata Retrieval Failure**

1. At Step 5 or 6, the System cannot retrieve the complete result or its required baseline metadata.
2. The System records the retrieval failure.
3. The System identifies the unavailable information.
4. The System does not present the incomplete result as complete or current.
5. The use case ends unsuccessfully.

---

# UC-W04 — Review Coordination Recommendations

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-W04 |
| **Use-case name** | Review Coordination Recommendations |
| **Use-case overview** | To allow the Operator to inspect coordination recommendations generated for a completed simulation, including proposed vehicle redistribution, charging-schedule adjustments, or user redirection to alternative Hubs and the expected effects of each recommendation. Reviewing recommendations does not apply them to live operations. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to view simulation recommendations.<br>3. A completed simulation run exists.<br>4. The recommendation outcome for the run is available. |
| **Trigger** | The Operator opens the recommendations for a completed simulation run. |
| **Steps** | 1. The system retrieves the selected run and its recommendation outcome.<br>2. The system displays the simulated condition and affected resources.<br>3. The system displays each proposed coordination action and its expected effect.<br>4. The system displays the assumptions and predicted constraints supporting each recommendation.<br>5. The system states that review does not apply any action to live operations.<br>6. The Operator reviews the recommendations. |
| **Post-conditions** | The available recommendations and expected effects are displayed. No live redistribution assignment, charging schedule, reservation, Hub state, or user-routing instruction is created or modified. |
| **Exception flow** | 1. The selected run or its recommendation outcome cannot be retrieved.<br>2. Supporting evaluation information is unavailable.<br>3. The system identifies the unavailable information and does not present an unsupported recommendation as complete. |

### Main Flow

1. **Operator:** Opens a completed simulation result.
2. **Operator:** Selects **Review Recommendations**.
3. **System:** Retrieves the simulation run, impact evaluation, and generated recommendation outcome.
4. **System:** Displays the simulated conditions, affected Hubs and resources, baseline timestamp, and simulation period.
5. **System:** Displays each recommended vehicle redistribution, including the proposed source Hub, destination Hub, vehicle quantity or type, timing, and expected effect where applicable.
6. **System:** Displays each recommended charging adjustment, including the affected Hub or charging demand, proposed schedule change, and expected effect where applicable.
7. **System:** Displays each recommendation to redirect users to alternative Hubs, including the affected origin Hub, proposed alternatives, and expected effect where applicable.
8. **System:** Displays the predicted resource constraint or service impact addressed by each recommendation.
9. **System:** Displays any demand or constraint that remains unresolved after the recommended actions.
10. **System:** Clearly states that the recommendations are simulation outputs and have not been applied to live operations.
11. **Operator:** Reviews the proposed actions, assumptions, and expected effects.

### Alternative Flow

**A1. No Intervention Is Required**

1. At Step 3, the recommendation outcome is **No Intervention Required**.
2. The System displays the evaluation measures supporting that outcome.
3. The System confirms that no live action has been created or applied.
4. The Operator reviews the outcome.
5. The use case ends successfully.

**A2. Multiple Recommendations Address the Same Constraint**

1. At Steps 5–7, the System has generated more than one feasible recommendation for the same simulated constraint.
2. The System displays each option separately with its assumptions and expected effects.
3. The System does not imply that reviewing an option selects or applies it.
4. The Operator reviews the alternatives.
5. The use case continues from Step 9.

**A3. Live State Has Changed Since the Baseline**

1. At Step 4, the System determines that the current live state is newer than the simulation baseline.
2. The System displays the baseline timestamp and warns that the recommendation reflects the recorded simulation assumptions rather than the current live state.
3. The System does not automatically recalculate or apply the recommendation.
4. The Operator continues reviewing the recommendation in its original context.

### Exception Flow

**E1. Recommendation Outcome Unavailable**

1. At Step 3, the System cannot retrieve the recommendation outcome.
2. The System records the retrieval failure.
3. The System informs the Operator that recommendations are unavailable.
4. The System does not display a recommendation from another run or infer an unsupported action.
5. The use case ends unsuccessfully.

**E2. Supporting Evaluation Information Unavailable**

1. At Step 8, the System cannot retrieve the impact or expected-effect information supporting a recommendation.
2. The System identifies the recommendation as incomplete.
3. The System does not present the recommendation as fully supported.
4. No live operational action is created or modified.
5. The use case ends unsuccessfully for the affected recommendation.

---

# UC-W05 — Compare What-if Scenarios

### Use Case Information

| **Field** | **Description** |
|---|---|
| **Use-case ID** | UC-W05 |
| **Use-case name** | Compare What-if Scenarios |
| **Use-case overview** | To allow the Operator to compare completed simulation runs, or a completed run against its baseline, using consistent evaluation measures while identifying differences in snapshots, assumptions, and time horizons that affect comparability. |
| **Actors** | Operator |
| **Preconditions** | 1. The system is running.<br>2. The Operator is authenticated and authorized to view simulation results.<br>3. At least one completed simulation run and its baseline are available.<br>4. A comparison between multiple scenarios requires at least two completed runs. |
| **Trigger** | The Operator selects **Compare Scenarios** and chooses completed runs or a run and its baseline. |
| **Steps** | 1. The system retrieves the selected runs and baseline metadata.<br>2. The system checks their evaluation measures, snapshots, assumptions, and time horizons.<br>3. The system identifies differences that affect comparability.<br>4. The system displays comparable measures side by side.<br>5. The system displays differences in predicted service capacity, parking utilization, vehicle availability, charging congestion, and recommendations.<br>6. The Operator reviews the comparison. |
| **Post-conditions** | A comparison is displayed using consistent measures and explicit context about relevant differences. No simulation run, scenario configuration, recommendation, or live operational state is modified. |
| **Exception flow** | 1. A selected run or its baseline cannot be retrieved.<br>2. Required measures are missing or incompatible.<br>3. The system explains why a valid comparison cannot be produced and does not present misleading comparison values. |

### Main Flow

1. **Operator:** Opens the simulation run list.
2. **Operator:** Selects **Compare Scenarios**.
3. **System:** Displays completed simulation runs that are available for comparison.
4. **Operator:** Selects two or more completed runs.
5. **System:** Retrieves each run's scenario conditions, baseline snapshot and timestamp, assumptions, simulation period, evaluation measures, results, and recommendation outcome.
6. **System:** Checks whether the selected runs use consistent definitions and units for service capacity, parking utilization, vehicle availability, and charging congestion.
7. **System:** Checks for differences in baseline snapshots, data freshness, assumptions, affected resources, and simulation time horizons.
8. **System:** Displays any difference that limits or changes the interpretation of the comparison.
9. **System:** Displays the comparable evaluation measures side by side for each selected run.
10. **System:** Displays the differences in predicted service capacity and unserved demand.
11. **System:** Displays the differences in parking utilization, vehicle availability, and charging congestion.
12. **System:** Displays the recommendation outcome and expected effects associated with each run.
13. **System:** Labels all compared values with their simulation run and baseline context.
14. **Operator:** Reviews the comparison and its comparability information.

### Alternative Flow

**A1. Compare a Scenario Against Its Baseline**

1. At Step 4, the Operator selects one completed run and chooses its baseline as the comparison target.
2. The System retrieves the run and its recorded baseline snapshot.
3. The System displays the baseline and simulated values using the same measures and units.
4. The use case continues from Step 10.

**A2. Selected Runs Use Different Snapshots or Time Horizons**

1. At Step 7, the System identifies different baseline timestamps, data-freshness conditions, or simulation periods.
2. The System displays the differences before showing the result comparison.
3. The System keeps each value associated with its own baseline and time horizon.
4. The System does not present the runs as directly equivalent where those differences prevent a fair interpretation.
5. The use case continues from Step 9 for measures that remain meaningfully comparable.

**A3. Selected Runs Have Different Assumptions**

1. At Step 7, the System identifies different demand rates, affected resources, thresholds, or other assumptions.
2. The System displays the differing assumptions alongside the results.
3. The System allows the Operator to interpret the differences without hiding or merging the assumptions.
4. The use case continues from Step 9.

**A4. A Run Has No Intervention Recommendation**

1. At Step 12, one selected run has the outcome **No Intervention Required**.
2. The System displays that outcome together with its supporting evaluation measures.
3. The System compares it with the recommendation outcomes of the other selected runs without treating the missing intervention as missing data.
4. The use case continues from Step 13.

### Exception Flow

**E1. Selected Run or Baseline Unavailable**

1. At Step 5, the System cannot retrieve a selected run or its required baseline metadata.
2. The System identifies the unavailable comparison item.
3. The System does not substitute data from another run.
4. The System informs the Operator that the requested comparison cannot be completed.
5. The use case ends unsuccessfully.

**E2. Evaluation Measures Are Missing or Incompatible**

1. At Step 6, the System determines that required measures are missing or use incompatible definitions or units.
2. The System identifies the affected measures and reason for incompatibility.
3. The System does not combine or rank incompatible values.
4. If no meaningful common measure remains, the System does not produce the comparison.
5. The use case ends unsuccessfully.

**E3. Comparison Data Retrieval Failure**

1. During Steps 5–12, the System fails to retrieve required comparison data.
2. The System records the retrieval failure.
3. The System does not present an incomplete comparison as complete.
4. The System informs the Operator that the comparison is unavailable.
5. The use case ends unsuccessfully.

---

## Related Use-Case Relationships

| **Relationship** | **Description** |
|---|---|
| `UC-W02 <<include>> UC-S06` | Every simulation run obtains a consistent, timestamped network snapshot as its baseline. |
| `UC-W02 <<include>> UC-S07` | Every simulation run evaluates predicted effects on service capacity and resource utilization relative to its baseline. |
| `UC-W02 <<include>> UC-S08` | Every simulation run generates appropriate coordination recommendations or explicitly records that no intervention is required. |

## Requirement Traceability

| **Requirement** | **Coverage in the What-if Simulation scenarios** |
|---|---|
| `FR-NI-09 — Pause Charging When a Hub Becomes Offline` | UC-W02 Alternative Flow A2 pauses active charging sessions only in the simulated state and stops simulated charging-time progression. |
| `FR-NI-12 — Keep Simulation State Isolated From Live Operations` | UC-W02 creates an isolated state from a timestamped snapshot; UC-W03, UC-W04, and UC-W05 are read-only with respect to live operations. |
| `NFR — Fail-Safe Simulation States` | UC-W02 Alternative Flow A2 defines the safe simulated charging state when a Hub becomes offline. |
| `NFR — Non-Blocking Simulation` | UC-W02 Main Flow Step 9 runs the simulation asynchronously and reports a separate run status. |
| `NFR — State Transition Logging` | UC-W02 records the run identifier, baseline, status changes, assumptions, results, and failure stage where applicable. |
