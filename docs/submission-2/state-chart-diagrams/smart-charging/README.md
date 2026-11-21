# Smart Charging — ChargingRequest state chart

[PlantUML](STM_ChargingRequest_Lifecycle.puml) · [PNG](STM_ChargingRequest_Lifecycle.png)

A valid draft becomes `Scheduled` when its requested start has arrived and a point can be assigned. Otherwise, it becomes `Waiting` without an allocation. A future-start request becomes eligible at its requested start. If an eligible request is blocked by full capacity, show `Full` and the current Hub waitlist position. Assign eligible requests by FCFS when capacity opens. Estimated duration is informational. UC-C02 runs automatically during submission, and an identical submission timestamp uses lower battery as its tie-breaker.

The saved request lifecycle is `Scheduled → Charging → Completed`. A verified target-reached event or confirmed Student Complete action sets `Completed`. A confirmed Cancel sets `Cancelled`. A verified fault can move `Charging → Suspended`, and verified recovery resumes `Charging` on the same point. A suspended request follows the same confirmed Complete or Cancel outcomes. A point's idle observation alone does not release an active session.

A waiting request has no allocation until promoted; Student cancellation moves it to `Cancelled`. At the end of its requested window, it moves to `Expired` and the Student is notified. UC-C01 includes waiting requests and their current positions.

For implementation, follow the [Final contracts](../../../implementation/SHARED_CONTRACTS.md) and [Charging method design](../../../submission-3/method-design/05-smart-charging.md). The Submission 2 diagram predates the future-start transition and the explicit Complete outcome from `Suspended`.
