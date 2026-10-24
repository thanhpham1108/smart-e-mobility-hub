# Submission #2 — Operator Fleet & Incident

This package is the individual Fleet & Incident contribution for the Operator Portal, with three group UI mockup screens. It follows the assignment's Submission #2 deliverables and the approved Submission #1 use cases and non-interactive functional requirements.

## Deliverables

| Deliverable | Files | Coverage |
| --- | --- | --- |
| UI design mockup | [Network overview](ui-design/operator-portal/UI_OPERATOR_Network_Overview.png), [Redistribution](ui-design/operator-portal/UI_OPERATOR_Redistribution.png), [Incident desk](ui-design/operator-portal/UI_OPERATOR_Incident_Desk.png), and [interactive source](ui-design/operator-portal/fleet-incident-mockup/README.md) | UC-F01/F02, UC-F04/F05, UC-I02 |
| Sequence diagrams | [Monitor network](sequence-diagrams/SD_MonitorHubNetwork.puml), [Coordinate redistribution](sequence-diagrams/SD_CoordinateRedistribution.puml), [Record completion](sequence-diagrams/SD_RecordRedistributionComplete.puml), [Handle failure](sequence-diagrams/SD_HandleVehicleFailure.puml), [Automatic fault event](sequence-diagrams/SD_AutomaticVehicleFault.puml) | Actor–Boundary–Controller–Entity paths, normal and exception cases |
| Activity diagrams | [Monitor network](activity-diagrams/AD_MonitorHubNetwork.puml), [Redistribution](activity-diagrams/AD_Redistribution.puml), [Handle failure](activity-diagrams/AD_HandleVehicleFailure.puml) | Three swimlanes, decisions and parallel reads |
| State charts (bonus) | [IncidentTicket](state-chart-diagrams/SC_IncidentTicket.puml), [RedistributionOrder](state-chart-diagrams/SC_RedistributionOrder.puml) | Incident and transfer lifecycles |

Each `.puml` source has a rendered `.png` with the same basename in its directory. The UI source uses fixture data and browser-session state so that the screens can be demonstrated without a backend.

## Use-case and requirement traceability

| Source requirement | Submission #2 evidence | Key design rule |
| --- | --- | --- |
| UC-F01 Monitor Mobility Hub Network; UC-F02 Inspect Vehicle Status | Network overview; SD/AD MonitorHubNetwork | Show availability, utilization, charging, incidents, and freshness without changing operational state. |
| UC-F04 Coordinate Vehicle Redistribution | Redistribution screen; SD CoordinateRedistribution; AD Redistribution | Validate eligibility, commitments, source/destination, and capacity before an assignment is created. |
| UC-F05 Record Redistribution Completion | Redistribution screen; SD RecordRedistributionComplete; AD Redistribution | Creating an order does not move a vehicle; only confirmed arrivals change location and Hub occupancy. Partial arrival is supported. |
| UC-I02 Handle a Vehicle Failure | Incident desk; SD HandleVehicleFailure; AD HandleVehicleFailure; SC IncidentTicket | Restrict unsafe allocation, handle affected commitments, record repair, and restore only after verification. |
| FR-NI-01/02/03 | Network freshness indicators; SD AutomaticVehicleFault; incident simulation | Validate telemetry before applying it; reuse an open incident for repeated fault evidence and expose stale data. |
| FR-NI-05/06/07 | Overview alerts; redistribution and fault simulation; SC RedistributionOrder | Keep counts and resource states consistent, recommend action for imbalance, and mark an incomplete transfer at risk if a vehicle faults. |

The broader [non-interactive requirements list](../submission-1/functional-requirements/non_interactive_functional_requirements.md) also covers reservations, parking, charging, and simulation. Those are group requirements and are not represented as Fleet & Incident diagrams here.

## Review and export

1. Open [the mockup README](ui-design/operator-portal/fleet-incident-mockup/README.md) for local viewing and screenshot instructions.
2. Review the PNGs with the `.puml` sources so diagram labels remain editable.
3. Place the UI images and diagram images into the group's combined Submission #2 report. The group should verify naming and integration before submission.

The mockup is a design prototype; its data, maps, and transitions are illustrative and do not call a production API.
