# Smart Charging — Activity diagrams

- [Automatic FCFS allocation](AD_GenerateChargingSchedule_FCFS.puml) · [PNG](AD_GenerateChargingSchedule_FCFS.png): a submitted draft is validated and assigned a point when capacity is available. Valid capacity-blocked requests enter the FCFS waitlist; estimated duration is displayed without rejecting a request. The decision nodes are UML diamonds; status outputs use the `<<status>>` style.
- [Adjust an existing schedule](AD_AdjustChargingSchedule.puml) · [PNG](AD_AdjustChargingSchedule.png): Operator may change the point or interval of an accepted allocation, while preserving FCFS order and checking conflicts.

The UC-C02 activity shows `Scheduled` with an allocation when the requested start has arrived and a point is free, or `Waiting` without an allocation for a future start or full current capacity. It reports Full only for eligible capacity-blocked requests and promotes the earliest eligible waiting request when a point opens.
