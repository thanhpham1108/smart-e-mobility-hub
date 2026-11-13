# Smart Charging — Activity diagrams

- [Automatic FCFS allocation](AD_GenerateChargingSchedule_FCFS.puml) · [PNG](AD_GenerateChargingSchedule_FCFS.png): a submitted draft is validated and assigned a point/interval immediately when capacity is available. The current use-case specification places valid capacity-blocked requests in the FCFS waitlist; insufficient charging time is rejected without a request. The decision nodes are UML diamonds; status outputs use the `<<status>>` style.
- [Adjust an existing schedule](AD_AdjustChargingSchedule.puml) · [PNG](AD_AdjustChargingSchedule.png): Operator may change the point or interval of an accepted allocation, while preserving FCFS order and checking conflicts.

The UC-C02 activity now shows both outcomes: `Scheduled` with an allocation when a point is available, or `Waiting` without an allocation when capacity is full. The system returns the FCFS position and promotes eligible waiting requests when capacity opens; insufficient charging time is not queued.
