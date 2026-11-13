# Smart Charging — ChargingRequest state chart

[PlantUML](STM_ChargingRequest_Lifecycle.puml) · [PNG](STM_ChargingRequest_Lifecycle.png)

A charging draft is checked and scheduled **before** it becomes a saved `ChargingRequest`. If no slot fits, the system returns `Full` or `Insufficient Charging Time`; no request is stored and no waiting state is created. UC-C02 runs automatically during submission. FCFS still uses submission time; only identical timestamps use lower battery level as a tie-breaker.

The saved request lifecycle is `Scheduled → Charging → Completed`. It may move to `Cancelled` before charging or after a confirmed early stop. A hardware fault can move `Charging → Suspended`; verified recovery resumes `Charging`, while a verified stop ends in `Cancelled`. A point's idle observation alone does not release an active session.

The diagram shows the main saved-request transitions. An invalid or full draft is an unsuccessful submission response, not a state of `ChargingRequest`.
