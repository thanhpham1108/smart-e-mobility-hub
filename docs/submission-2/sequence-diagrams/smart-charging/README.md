# Smart Charging — Sequence diagrams

The diagrams retain the existing UI/Controller/Request/Point/Schedule lifelines and FCFS rule. UC-C01 includes `Waiting` requests and their current Hub positions. UC-C02 runs automatically when a charging draft is submitted: a future-start request remains Waiting without a guaranteed point, while a currently eligible request blocked by full capacity receives Full and enters the per-Hub waitlist. Estimated duration is informational and does not reject a valid request.

| Use case | Editable PlantUML | Rendered image |
| --- | --- | --- |
| UC-C01 — View Queue and Schedule | [Source](SD_ViewChargingQueue.puml) | [PNG](SD_ViewChargingQueue.png) |
| UC-C02 — Generate Charging Schedule automatically | [Source](SD_GenerateChargingSchedule.puml) | [PNG](SD_GenerateChargingSchedule.png) |
| UC-C03 — Adjust an existing allocation | [Source](SD_AdjustChargingSchedule.puml) | [PNG](SD_AdjustChargingSchedule.png) |

FCFS compares submission instants; lower battery breaks only an exact timestamp tie. UC-C03 does not reorder accepted requests.
