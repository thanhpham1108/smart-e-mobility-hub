# Smart Charging — Sequence diagrams

The diagrams keep the existing UI/Controller/Request/Point/Schedule lifelines and FCFS rule. UC-C02 now runs automatically when a charging draft is submitted: an available point and interval produce a saved `Scheduled` request; otherwise the caller receives `Full` and no request is created. No Operator click or `Unscheduled` waiting queue is needed.

| Use case | Editable PlantUML | Rendered image |
| --- | --- | --- |
| UC-C01 — View Queue and Schedule | [Source](SD_ViewChargingQueue.puml) | [PNG](SD_ViewChargingQueue.png) |
| UC-C02 — Generate Charging Schedule automatically | [Source](SD_GenerateChargingSchedule.puml) | [PNG](SD_GenerateChargingSchedule.png) |
| UC-C03 — Adjust an existing allocation | [Source](SD_AdjustChargingSchedule.puml) | [PNG](SD_AdjustChargingSchedule.png) |

FCFS compares submission instants; lower battery breaks only an exact timestamp tie. UC-C03 does not reorder accepted requests.
