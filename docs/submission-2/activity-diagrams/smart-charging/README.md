# ACTIVITY DIAGRAMS — MODULE 5: SMART CHARGING SCHEDULING

**Responsible Member:** Member 5 (Smart Charging Scheduling)  
**Deliverables Directory:** [docs/submission-2/activity-diagrams/smart-charging/](.)

---

## 1. Summary of Deliverables

- **Inside-Diamond Questions**: All branching questions are placed directly inside the quadrilateral/diamond decision shape (`conditionStyle insideDiamond`).
- **UML Node Shapes**: `if` and `repeat while` conditions render as decision diamonds. Normal activities use strongly rounded action rectangles; nodes marked `<<status>>` use lightly rounded status rectangles.
- **Centered Layout**: Nodes in each column are aligned along their vertical center axes.
- **Distinct Pastel Swimlane Colors**: Column 1 in Sky Blue (`#E0F2FE`), Column 2 in Mint Green (`#F0FDF4`), Column 3 (Entity/Database) in Warm Amber (`#FEF3C7`).

| Diagram Name | Linked Use Case | PlantUML Source | Rendered PNG Image |
| :--- | :--- | :--- | :--- |
| **`AD_GenerateChargingSchedule_FCFS`** | [UC-C02: Generate a Charging Schedule](../../../submission-1/use-case-scenarios/smart_charging_scheduling.md#L64) | [AD_GenerateChargingSchedule_FCFS.puml](AD_GenerateChargingSchedule_FCFS.puml) | [AD_GenerateChargingSchedule_FCFS.png](AD_GenerateChargingSchedule_FCFS.png) |
| **`AD_AdjustChargingSchedule`** | [UC-C03: Adjust a Charging Schedule](../../../submission-1/use-case-scenarios/smart_charging_scheduling.md#L159) | [AD_AdjustChargingSchedule.puml](AD_AdjustChargingSchedule.puml) | [AD_AdjustChargingSchedule.png](AD_AdjustChargingSchedule.png) |

---

## 2. Interactive Preview (Mermaid)

```mermaid
graph TD
    subgraph Operator ["Operator (Sky Blue)"]
        A([Start]) --> B["Select Mobility Hub on Dashboard"]
        B --> C["Click 'Generate Charging Schedule'"]
        Notice["Display 'No Pending Requests'"] --> Stop1([End])
        Render["Render charging Gantt chart<br/>and unscheduled requests"] --> Stop2([End])
    end

    subgraph Controller ["ChargingController (Mint Green)"]
        C --> D["Validate Operator privileges"]
        CheckReq{"Active charging requests<br/>found in queue?"}
        Sort["Sort requests in FCFS arrival order<br/>(Exact timestamp tie: lower battery first)"]
        Init["Initialize allocation plan<br/>and unscheduled list"]
        Extract["Extract next request in FCFS arrival order"]
        CheckPort{"Operational port available with<br/>open slot before departure?"}
        Assign["Assign port and time slot,<br/>and reserve port capacity"]
        Unscheduled["Mark request as Unscheduled<br/>(No available port or insufficient charging time)"]
        LoopCheck{"Pending requests remain<br/>in queue?"}
        Compile["Compile charging schedule<br/>and unscheduled requests summary"]
        Format["Format schedule for Gantt visualization"]
    end

    subgraph Database ["Database / Entity (Warm Amber)"]
        D --> Fetch["Fetch pending requests, charging ports,<br/>and active hub reservations"]
        Fetch --> CheckReq
        Compile --> Persist["Persist charging schedule allocations<br/>and update all request statuses"]
        Persist --> Format
    end

    %% Flow connections
    CheckReq -- No --> Notice
    CheckReq -- Yes --> Sort
    Sort --> Init
    Init --> Extract
    Extract --> CheckPort
    CheckPort -- Yes --> Assign
    CheckPort -- No --> Unscheduled
    Assign --> LoopCheck
    Unscheduled --> LoopCheck
    LoopCheck -- Yes --> Extract
    LoopCheck -- No --> Compile
    Format --> Render

    classDef op fill:#E0F2FE,stroke:#0284C7,stroke-width:1.5px;
    classDef ctrl fill:#F0FDF4,stroke:#059669,stroke-width:1.5px;
    classDef db fill:#FEF3C7,stroke:#D97706,stroke-width:1.5px;
```

## 3. Manual Schedule Adjustment (UC-C03)

![Activity diagram: adjust a charging schedule](AD_AdjustChargingSchedule.png)
