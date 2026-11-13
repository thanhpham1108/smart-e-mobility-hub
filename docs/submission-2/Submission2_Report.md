# SMART E-MOBILITY HUB — SUBMISSION #2 REPORT

**Course:** Software Engineering (Công nghệ phần mềm) — HK261
**Project:** Smart E-Mobility Hub (VNU-HCM Urban Area)
**Document type:** Submission #2 figure catalogue and report draft
**Date:** 31 October 2026
**Figure order:** Chapters 3–8 follow the module order of [`docs/submission-1/Submission1.pdf`](../submission-1/Submission1.pdf).

> This document gathers the Submission #2 deliverables — UI mockups, sequence diagrams, activity diagrams, and state-chart diagrams — in the same order as Submission1.pdf. Every available figure is embedded from its repository path. Deliverables that are not present in the repository are marked **Missing** instead of using a broken image link.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Figure Inventory](#2-figure-inventory)
3. [Authentication and Hub & Identity Use Cases](#3-authentication-and-hub--identity-use-cases)
4. [Vehicle Rental Use Cases](#4-vehicle-rental-use-cases)
5. [Parking & Private EV Use Cases](#5-parking--private-ev-use-cases)
6. [Fleet Monitoring & Incident Handling Use Cases](#6-fleet-monitoring--incident-handling-use-cases)
7. [Smart Charging Scheduling Use Cases](#7-smart-charging-scheduling-use-cases)
8. [What-if Simulation Use Cases](#8-what-if-simulation-use-cases)

- [Appendix A — External Telemetry](#appendix-a--external-telemetry)
- [Appendix B — Source Files and Regeneration](#appendix-b--source-files-and-regeneration)
- [Appendix C — Document Notes](#appendix-c--document-notes)

---

## 1. Overview

Submission #2 contains four groups of design artefacts:

| Group | Deliverable | Description |
| :--- | :--- | :--- |
| 1 | **UI Design (Mockup)** | Main screens of the Student Portal and Operator Portal. |
| 2 | **Sequence Diagrams** | Detailed BCE (Boundary–Controller–Entity) interaction diagrams. |
| 3 | **Activity Diagrams** | Swimlane activity diagrams with decisions and parallel flows. |
| 4 | **State-Chart Diagrams (Bonus)** | Lifecycles of core domain entities. |

The chapter order below is intentionally identical to Submission1.pdf:

| Submission1.pdf chapter | Submission2 section | Module | Owner |
| :---: | :---: | :--- | :--- |
| 3 | 3 | Authentication and Hub & Identity | Member 1 |
| 4 | 4 | Vehicle Rental | Member 2 |
| 5 | 5 | Parking & Private EV | Member 3 |
| 6 | 6 | Fleet Monitoring & Incident Handling | Member 4 |
| 7 | 7 | Smart Charging Scheduling | Member 5 |
| 8 | 8 | What-if Simulation | Member 6 |

---

## 2. Figure Inventory

Counts show **images present / minimum requested** in [`task_assignment.md`](task_assignment.md). Some modules provide more diagrams than the minimum.

| Ch. | Module | UI | Sequence | Activity | State-chart | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 3 | Authentication and Hub & Identity | 0 / 3 | 0 / 3 | 0 / 2 | 0 / 1 | **Missing** |
| 4 | Vehicle Rental | 3 / 3 | 3 / 3 | 2 / 2 | 1 / 2 | Required complete; `RentalTrip` state chart missing |
| 5 | Parking & Private EV | 3 / 3 | 7 / 3 | 7 / 2 | 1 / 2 | Required complete; `ParkingSpace` state chart missing |
| 6 | Fleet Monitoring & Incident Handling | 3 / 3 | 5 / 3 | 3 / 2 | 2 / 2 | **Complete** |
| 7 | Smart Charging Scheduling | 3 / 3 | 3 / 3 | 2 / 2 | 1 / 1 | Complete |
| 8 | What-if Simulation | 0 / 3 | 0 / 3 | 0 / 2 | 0 / 1 | **Missing** |
| A | External Telemetry (supporting) | — | 3 / — | 3 / — | — | Supplementary |

**Total embedded figures:** 55.

---

## 3. Authentication and Hub & Identity Use Cases

**Owner:** Member 1
**Status:** **Missing** — no UI mockups, sequence diagrams, activity diagrams, or state-chart diagrams for this module are present in the repository yet.

### 3.1 UI Design (Mockup)

> **Missing (0 / 3).** Expected Student Portal screens: Sign in / Register, Home & Hub map, Hub detail.

| Expected screen | Related use cases | Status |
| :--- | :--- | :---: |
| Sign in / Register | UC-A01 | Missing |
| Home & Hub map with search and filters | UC-H02 | Missing |
| Hub detail: parking slots, charging points, available vehicles | UC-H03 | Missing |

### 3.2 Sequence Diagrams

> **Missing (0 / 3).**

| Expected diagram | Related use case | Status |
| :--- | :--- | :---: |
| `SD_SignIn_Auth` — credentials → AuthController → JWT/session | UC-A01 | Missing |
| `SD_FindMobilityHub` — GPS/filter → HubController → HubService → results | UC-H02 | Missing |
| `SD_ViewHubStatus` — HubId → aggregated vehicle, parking, and charging status | UC-H03 | Missing |

### 3.3 Activity Diagrams

> **Missing (0 / 2).**

| Expected diagram | Related use case | Status |
| :--- | :--- | :---: |
| Authentication and role-check flow (Student vs Operator) | UC-A01 | Missing |
| Hub search and filter flow (GPS vs specified location) | UC-H02 | Missing |

### 3.4 State-Chart Diagrams

> **Missing (0 / 1).**

| Expected diagram | Related entity | Status |
| :--- | :--- | :---: |
| `MobilityHub` lifecycle (`Active` → `Peak_Load` → `Maintenance` → `Offline`) | `MobilityHub` | Missing |

---

## 4. Vehicle Rental Use Cases

**Owner:** Member 2
**Status:** Required deliverables complete. The `RentalTrip` state chart (bonus) is still missing.

### 4.1 UI Design (Mockup)

![Shared vehicle list with battery filter](ui-design/student-portal/UI_STUDENT_Vehicle_List_And_Battery_Status.png)

*Figure 4.1 — Shared vehicle list with pickup-hub, vehicle-type, and minimum-battery filters (UC-R01).*

![Reservation and pickup screen](ui-design/student-portal/UI_STUDENT_Vehicle_Reservation.png)

*Figure 4.2 — Reservation and pickup screen with the 15-minute hold countdown and QR/Bluetooth unlock instructions (UC-R03, UC-R04).*

![Active trip and return screen](ui-design/student-portal/UI_STUDENT_Vehicle_Trip_And_Return.png)

*Figure 4.3 — Active rental trip and return screen (UC-R04, UC-R05).*

### 4.2 Sequence Diagrams

![Sequence diagram: reserve shared vehicle](sequence-diagrams/SD_ReserveSharedVehicle.png)

*Figure 4.4 — Sequence diagram: Reserve a shared vehicle (UC-R03).*

![Sequence diagram: pick up shared vehicle](sequence-diagrams/SD_PickupSharedVehicle.png)

*Figure 4.5 — Sequence diagram: Pick up a shared vehicle (UC-R04).*

![Sequence diagram: return shared vehicle](sequence-diagrams/SD_ReturnSharedVehicle.png)

*Figure 4.6 — Sequence diagram: Return a shared vehicle (UC-R05).*

### 4.3 Activity Diagrams

![Activity diagram: reservation with timeout](activity-diagrams/AD_VehicleReservationWithTimeout.png)

*Figure 4.7 — Activity diagram: Reserve a shared vehicle and handle the 15-minute timeout.*

![Activity diagram: vehicle rental journey](activity-diagrams/AD_VehicleRentalJourney.png)

*Figure 4.8 — Activity diagram: End-to-end vehicle rental journey.*

### 4.4 State-Chart Diagrams

![State chart: shared vehicle lifecycle](state-chart-diagrams/SCD_VehicleLifeCycle.png)

*Figure 4.9 — State-chart: `SharedVehicle` lifecycle (`Available` → `Reserved` → `InUse` → `UnderMaintenance` / `Redistributing`).*

> **Missing (bonus):** `RentalTrip` lifecycle state chart.

---

## 5. Parking & Private EV Use Cases

**Owner:** Member 3
**Status:** Required deliverables complete, with seven sequence diagrams and seven activity diagrams. The `ParkingSpace` state chart (bonus) is still missing.

### 5.1 UI Design (Mockup)

![Reserve parking space screen](ui-design/student-portal/UI_STUDENT_ReserveParkingSpace.png)

*Figure 5.1 — Reserve a parking space by date and continuous 15-minute time blocks, with all-or-nothing interval availability (UC-P01, UC-S02).*

![Parking ticket screen](ui-design/student-portal/UI_STUDENT_ParkingTicket.png)

*Figure 5.2 — Electronic parking ticket with QR check-in code (UC-P02, UC-P06).*

![My parking bookings screen](ui-design/student-portal/UI_STUDENT_MyParkingBookings.png)

*Figure 5.3 — My parking and charging bookings, including cancel and checkout actions (UC-P03, UC-P04, UC-P07).*

### 5.2 Sequence Diagrams

![Sequence diagram: reserve parking space](sequence-diagrams/parking-private-ev/SD_ReserveParkingSpace.png)

*Figure 5.4 — Sequence diagram: Reserve a parking space (UC-P01).*

![Sequence diagram: submit private-EV charging request](sequence-diagrams/parking-private-ev/SD_SubmitPrivateEVChargingRequest.png)

*Figure 5.5 — Sequence diagram: Submit a private-EV charging request (UC-P02).*

![Sequence diagram: view parking and charging bookings](sequence-diagrams/parking-private-ev/SD_ViewParkingAndChargingBookings.png)

*Figure 5.6 — Sequence diagram: View my parking and charging bookings (UC-P03).*

![Sequence diagram: cancel parking reservation](sequence-diagrams/parking-private-ev/SD_CancelParkingReservation.png)

*Figure 5.7 — Sequence diagram: Cancel a parking reservation (UC-P04).*

![Sequence diagram: cancel charging request](sequence-diagrams/parking-private-ev/SD_CancelChargingRequest.png)

*Figure 5.8 — Sequence diagram: Cancel a charging request (UC-P05).*

![Sequence diagram: check in private EV](sequence-diagrams/parking-private-ev/SD_CheckInPrivateEV.png)

*Figure 5.9 — Sequence diagram: Check in a private EV (UC-P06).*

![Sequence diagram: check out private EV](sequence-diagrams/parking-private-ev/SD_CheckOutPrivateEV.png)

*Figure 5.10 — Sequence diagram: Check out a private EV (UC-P07).*

### 5.3 Activity Diagrams

![Activity diagram: reserve parking space](activity-diagrams/parking-private-ev/AD_ReserveParkingSpace.png)

*Figure 5.11 — Activity diagram: Reserve a parking space with the all-or-nothing interval check (UC-P01).*

![Activity diagram: submit private-EV charging request](activity-diagrams/parking-private-ev/AD_SubmitPrivateEVChargingRequest.png)

*Figure 5.12 — Activity diagram: Submit a private-EV charging request (UC-P02).*

![Activity diagram: view parking and charging bookings](activity-diagrams/parking-private-ev/AD_ViewParkingAndChargingBookings.png)

*Figure 5.13 — Activity diagram: View parking and charging bookings (UC-P03).*

![Activity diagram: cancel parking reservation](activity-diagrams/parking-private-ev/AD_CancelParkingReservation.png)

*Figure 5.14 — Activity diagram: Cancel a parking reservation (UC-P04).*

![Activity diagram: cancel charging request](activity-diagrams/parking-private-ev/AD_CancelChargingRequest.png)

*Figure 5.15 — Activity diagram: Cancel a charging request (UC-P05).*

![Activity diagram: check in private EV](activity-diagrams/parking-private-ev/AD_CheckInPrivateEV.png)

*Figure 5.16 — Activity diagram: Check in a private EV (UC-P06).*

![Activity diagram: check out private EV](activity-diagrams/parking-private-ev/AD_CheckOutPrivateEV.png)

*Figure 5.17 — Activity diagram: Check out a private EV, including active-charging and overstay handling (UC-P07).*

### 5.4 State-Chart Diagrams

![State chart: parking reservation lifecycle](state-chart-diagrams/parking-private-ev/SC_ParkingReservation.png)

*Figure 5.18 — State-chart: `ParkingReservation` lifecycle (UC-P01, UC-P04, UC-P06, UC-P07).*

> **Missing (bonus):** `ParkingSpace` lifecycle state chart.

---

## 6. Fleet Monitoring & Incident Handling Use Cases

**Owner:** Member 4
**Status:** **Complete** — three UI mockups, five sequence diagrams, three activity diagrams, and two state-chart diagrams.

### 6.1 UI Design (Mockup)

![Operator network overview](ui-design/operator-portal/fleet-incident-mockup/UI_OPERATOR_Network_Overview.png)

*Figure 6.1 — Operator network overview with Hub occupancy, charging availability, alerts, and data freshness (UC-F01, UC-F02).*

![Operator fleet and redistribution screen](ui-design/operator-portal/fleet-incident-mockup/UI_OPERATOR_Redistribution.png)

*Figure 6.2 — Fleet and redistribution screen with feasibility check, assignment creation, and arrival confirmation (UC-F04, UC-F05).*

![Operator incident desk](ui-design/operator-portal/fleet-incident-mockup/UI_OPERATOR_Incident_Desk.png)

*Figure 6.3 — Incident desk with fault evidence, affected commitments, repair progress, and guarded restoration (UC-I02).*

### 6.2 Sequence Diagrams

![Sequence diagram: monitor hub network](sequence-diagrams/operator-fleet-incident/SD_MonitorHubNetwork.png)

*Figure 6.4 — Sequence diagram: Monitor the Mobility Hub network (UC-F01).*

![Sequence diagram: coordinate redistribution](sequence-diagrams/operator-fleet-incident/SD_CoordinateRedistribution.png)

*Figure 6.5 — Sequence diagram: Coordinate vehicle redistribution (UC-F04).*

![Sequence diagram: record redistribution completion](sequence-diagrams/operator-fleet-incident/SD_RecordRedistributionComplete.png)

*Figure 6.6 — Sequence diagram: Record redistribution completion (UC-F05).*

![Sequence diagram: handle vehicle failure](sequence-diagrams/operator-fleet-incident/SD_HandleVehicleFailure.png)

*Figure 6.7 — Sequence diagram: Handle a vehicle failure (UC-I02).*

![Sequence diagram: automatic vehicle fault](sequence-diagrams/operator-fleet-incident/SD_AutomaticVehicleFault.png)

*Figure 6.8 — Sequence diagram: Automatic vehicle-fault handling from telemetry (FR-NI-01, FR-NI-02, FR-NI-07).*

### 6.3 Activity Diagrams

![Activity diagram: monitor hub network](activity-diagrams/operator-fleet-incident/AD_MonitorHubNetwork.png)

*Figure 6.9 — Activity diagram: Monitor the Hub network and surface automatic alerts (UC-F01).*

![Activity diagram: redistribution](activity-diagrams/operator-fleet-incident/AD_Redistribution.png)

*Figure 6.10 — Activity diagram: Plan and complete vehicle redistribution (UC-F04, UC-F05).*

![Activity diagram: handle vehicle failure](activity-diagrams/operator-fleet-incident/AD_HandleVehicleFailure.png)

*Figure 6.11 — Activity diagram: Handle a vehicle failure, including isolation and restoration (UC-I02, FR-NI-02, FR-NI-07).*

### 6.4 State-Chart Diagrams

![State chart: incident ticket lifecycle](state-chart-diagrams/operator-fleet-incident/SC_IncidentTicket.png)

*Figure 6.12 — State-chart: `IncidentTicket` lifecycle (UC-I02, FR-NI-02).*

![State chart: redistribution order lifecycle](state-chart-diagrams/operator-fleet-incident/SC_RedistributionOrder.png)

*Figure 6.13 — State-chart: `RedistributionOrder` lifecycle (UC-F04, UC-F05, FR-NI-07).*

---

## 7. Smart Charging Scheduling Use Cases

**Owner:** Member 5
**Status:** UI, three sequence diagrams, two activity diagrams (UC-C02 and UC-C03), and one bonus state chart are present.

### 7.1 UI Design (Mockup)

![Charging schedule Gantt chart](ui-design/operator-portal/smart-charging/UI_OPERATOR_Charging_Schedule_Gantt.png)

*Figure 7.1 — Charging schedule Gantt chart for 10 charging points, including the live-time marker and maintenance port (UC-C01).*

![Charging queue and live sessions](ui-design/operator-portal/smart-charging/UI_OPERATOR_Charging_Queue.png)

*Figure 7.2 — FCFS charging queue and live charging-session telemetry with emergency stop (UC-C01).*

![Adjust schedule modal](ui-design/operator-portal/smart-charging/UI_OPERATOR_Adjust_Schedule_Modal.png)

*Figure 7.3 — Manual schedule-adjustment modal with port, time-window, target-SOC, and conflict-free verification (UC-C03).*

### 7.2 Sequence Diagrams

![Sequence diagram: view charging queue](sequence-diagrams/smart-charging/SD_ViewChargingQueue.png)

*Figure 7.4 — Sequence diagram: View the charging queue and schedule (UC-C01).*

![Sequence diagram: generate charging schedule](sequence-diagrams/smart-charging/SD_GenerateChargingSchedule.png)

*Figure 7.5 — Sequence diagram: Generate a charging schedule under FCFS policy (UC-C02).*

![Sequence diagram: adjust charging schedule](sequence-diagrams/smart-charging/SD_AdjustChargingSchedule.png)

*Figure 7.6 — Sequence diagram: Adjust a charging schedule (UC-C03).*

### 7.3 Activity Diagrams

![Activity diagram: FCFS charging schedule](activity-diagrams/smart-charging/AD_GenerateChargingSchedule_FCFS.png)

*Figure 7.7 — Activity diagram: Generate a charging schedule under FCFS policy (UC-C02).*

![Activity diagram: adjust a charging schedule](activity-diagrams/smart-charging/AD_AdjustChargingSchedule.png)

*Figure 7.8 — Activity diagram: Adjust a charging schedule and check for conflicts (UC-C03).*

### 7.4 State-Chart Diagrams

![State chart: charging request lifecycle](state-chart-diagrams/smart-charging/STM_ChargingRequest_Lifecycle.png)

*Figure 7.9 — State-chart: `ChargingRequest` lifecycle (UC-C01–UC-C03).*

---

## 8. What-if Simulation Use Cases

**Owner:** Member 6
**Status:** **Missing** — no UI mockups, sequence diagrams, activity diagrams, or state-chart diagrams for this module are present in the repository yet.

### 8.1 UI Design (Mockup)

> **Missing (0 / 3).** Expected Operator Portal screens: scenario parameter form, simulation results and recommendations, multi-scenario comparison.

| Expected screen | Related use cases | Status |
| :--- | :--- | :---: |
| Scenario parameter configuration form | UC-W01 | Missing |
| Simulation results and coordination recommendations | UC-W02, UC-W03, UC-W04 | Missing |
| Multi-scenario comparison | UC-W05 | Missing |

### 8.2 Sequence Diagrams

> **Missing (0 / 3).**

| Expected diagram | Related use case | Status |
| :--- | :--- | :---: |
| `SD_ConfigureScenario` — enter and save scenario parameters | UC-W01 | Missing |
| `SD_RunWhatIfSimulation` — snapshot → simulated load → recommendations | UC-W02 | Missing |
| `SD_CompareScenarios` — compare two simulation runs | UC-W05 | Missing |

### 8.3 Activity Diagrams

> **Missing (0 / 2).**

| Expected diagram | Related use case | Status |
| :--- | :--- | :---: |
| Snapshot loading, simulated load calculation, and recommendation report | UC-W02 | Missing |
| Compare and evaluate intervention options | UC-W05 | Missing |

### 8.4 State-Chart Diagrams

> **Missing (0 / 1).**

| Expected diagram | Related entity | Status |
| :--- | :--- | :---: |
| `SimulationRun` lifecycle (`Draft` → `Configured` → `Running` → `Finished` → `Archived`) | `SimulationRun` | Missing |

---

## Appendix A — External Telemetry

These diagrams support the telemetry and non-interactive requirements. They are not one of the six assigned modules in Submission #2, so they are kept in an appendix to preserve the Submission1.pdf module order.

### A.1 Sequence Diagrams

![Sequence diagram: update vehicle telemetry](sequence-diagrams/external-telemetry/SD_UpdateVehicleTelemetry.png)

*Figure A.1 — Sequence diagram: Update vehicle telemetry (UC-T01).*

![Sequence diagram: update parking occupancy](sequence-diagrams/external-telemetry/SD_UpdateParkingOccupancy.png)

*Figure A.2 — Sequence diagram: Update parking occupancy (UC-T02).*

![Sequence diagram: update charging-point status](sequence-diagrams/external-telemetry/SD_UpdateChargingPointStatus.png)

*Figure A.3 — Sequence diagram: Update charging-point status (UC-T03).*

### A.2 Activity Diagrams

![Activity diagram: update vehicle telemetry](activity-diagrams/external-telemetry/AD_UpdateVehicleTelemetry.png)

*Figure A.4 — Activity diagram: Update vehicle telemetry (UC-T01).*

![Activity diagram: update parking occupancy](activity-diagrams/external-telemetry/AD_UpdateParkingOccupancy.png)

*Figure A.5 — Activity diagram: Update parking occupancy (UC-T02).*

![Activity diagram: update charging-point status](activity-diagrams/external-telemetry/AD_UpdateChargingPointStatus.png)

*Figure A.6 — Activity diagram: Update charging-point status (UC-T03).*

---

## Appendix B — Source Files and Regeneration

| Deliverable | Location | Source format |
| :--- | :--- | :--- |
| UI mockups | [`ui-design/student-portal/`](ui-design/student-portal/) and [`ui-design/operator-portal/`](ui-design/operator-portal/) | HTML / CSS / JavaScript, exported to PNG |
| Sequence diagrams | [`sequence-diagrams/`](sequence-diagrams/) | PlantUML (`.puml`) with exported PNG |
| Activity diagrams | [`activity-diagrams/`](activity-diagrams/) | PlantUML (`.puml`) with exported PNG |
| State-chart diagrams | [`state-chart-diagrams/`](state-chart-diagrams/) | PlantUML (`.puml`) with exported PNG |

Most PNGs have a sibling `.puml` file. To regenerate a diagram, render the `.puml` file with PlantUML, for example:

```sh
java -Djava.awt.headless=true -jar plantuml.jar -tpng path/to/diagram.puml
```

The Vehicle Rental sequence, activity, and state-chart PNGs in this repository were rendered from their `.puml` sources with the Kroki PlantUML service because the local machine did not have a Java runtime installed.

---

## Appendix C — Document Notes

- **Ordering:** Chapters 3–8 mirror the module order of Submission1.pdf. Chapters 1–2 of Submission1.pdf (Introduction and Use Case Model) are represented here by the overview and figure inventory instead of being duplicated.
- **Restored figures:** The Fleet & Incident diagrams/UI and Smart Charging UI images were restored from branch `part4` into the `main` working tree so this report renders completely. They are currently staged as additions.
- **Rendered figures:** The Vehicle Rental diagram PNGs (`SD_ReserveSharedVehicle`, `SD_PickupSharedVehicle`, `SD_ReturnSharedVehicle`, `AD_VehicleReservationWithTimeout`, `AD_VehicleRentalJourney`, `SCD_VehicleLifeCycle`) were generated from their PlantUML sources for this report.
- **Vehicle Rental UI variants:** The report uses the desktop exports in `ui-design/student-portal/` (1586 × 992). The 488-pixel mobile JPEG variants remain in `ui-design/student-portal/mobile-app/` as alternate exports.
- **Outstanding work:** Module 1 (Hub & Identity) and Module 6 (What-if Simulation) have no Submission #2 figures yet. The bonus state charts for `RentalTrip` and `ParkingSpace` are also missing.
