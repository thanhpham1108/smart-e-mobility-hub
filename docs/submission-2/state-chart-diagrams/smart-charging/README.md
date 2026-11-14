# Smart Charging — ChargingRequest state chart

[PlantUML](STM_ChargingRequest_Lifecycle.puml) · [PNG](STM_ChargingRequest_Lifecycle.png)

A charging draft is checked and scheduled **before** it becomes a saved `ChargingRequest`. If valid capacity is full, the system saves the request as `Waiting`, reports `Full` with the current Hub waitlist position, and assigns it by FCFS when capacity opens. Estimated duration is informational and does not reject a valid request. UC-C02 runs automatically during submission. FCFS still uses submission time; only identical timestamps use lower battery level as a tie-breaker.

The saved request lifecycle is `Scheduled → Charging → Completed`. It may move to `Cancelled` before charging or after a confirmed early stop. A hardware fault can move `Charging → Suspended`; verified recovery resumes `Charging`, while a verified stop ends in `Cancelled`. A point's idle observation alone does not release an active session.

A waiting request has no allocation until promoted; Student cancellation moves it to `Cancelled`. At the end of its requested window, it moves to `Expired` and the Student is notified. UC-C01 includes waiting requests and their current positions.
