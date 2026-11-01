# Submission #2 - What-if Simulation (Member 6)

This package contains the individual diagrams and the group UI contribution for the What-if Simulation module. It derives from UC-W01 through UC-W05 and supporting use cases UC-S06 through UC-S08 in Submission #1.

## Deliverables

| Deliverable | Files | Coverage |
| --- | --- | --- |
| Sequence diagrams | `SD_ConfigureScenario.puml`, `SD_RunWhatIfSimulation.puml`, `SD_CompareScenarios.puml` | UC-W01, UC-W02, UC-W05 and UC-S06 through UC-S08 |
| Activity diagrams | `AD_RunWhatIfSimulation.puml`, `AD_CompareWhatIfScenarios.puml` | Isolated execution, impact evaluation, recommendations and comparison |
| UI mockups | Configure, Results, and Compare PNGs plus interactive HTML/CSS/JavaScript | UC-W01, UC-W03, UC-W04 and UC-W05 |
| State chart (bonus) | `SC_SimulationRun.puml` | Scenario validation and SimulationRun lifecycle |

## Traceability and design rules

| Source | Submission #2 evidence | Preserved rule |
| --- | --- | --- |
| UC-W01 | Configure sequence and UI | Validate conditions, resources, assumptions and period before saving ReadyToRun. |
| UC-W02 and UC-S06 | Run sequence/activity | Obtain one consistent timestamped baseline before creating isolated simulation state. |
| UC-S07 and UC-S08 | Run sequence/activity and Results UI | Evaluate common impact measures and return feasible recommendations or No Intervention Required. |
| UC-W03 and UC-W04 | Results UI | Display baseline, assumptions, predicted effects and recommendations without applying live actions. |
| UC-W05 | Compare sequence/activity and UI | Compare compatible congestion, delay, projected-revenue, resource and recommendation outcomes while disclosing snapshot, assumption and horizon differences. |
| FR-NI-09 | Run sequence/activity | An offline Hub pauses charging sessions only in simulated state. |
| FR-NI-12 | Every artifact | Live vehicles, reservations, parking, charging, incidents and redistribution remain unchanged. |

## Review and export

1. Render every `.puml` file to PNG or SVG with the same basename.
2. Run the UI capture script and verify all three images are 1440 x 900.
3. Include the rendered diagrams and UI images in the combined Submission #2 report.
