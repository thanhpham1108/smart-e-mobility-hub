# Smart Charging — Activity diagrams

- [Automatic FCFS allocation](AD_GenerateChargingSchedule_FCFS.puml) · [PNG](AD_GenerateChargingSchedule_FCFS.png): a submitted draft is validated and assigned a point/interval immediately. A full or insufficient window returns a message and creates no request. The decision nodes are UML diamonds; status outputs use the `<<status>>` style.
- [Adjust an existing schedule](AD_AdjustChargingSchedule.puml) · [PNG](AD_AdjustChargingSchedule.png): Operator may change the point or interval of an accepted allocation, while preserving FCFS order and checking conflicts.

There is no `Unscheduled` waiting state and no Operator refresh step for new charging requests.
