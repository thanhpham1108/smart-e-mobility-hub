# Class diagrams — Submission 3

The [combined inventory](CLASS_INVENTORY.md) lists every module's owned classes and cross-module contracts. Each feature has its own folder with an editable PlantUML source and rendered image:

| Module | Diagram | Inventory |
| --- | --- | --- |
| Hub & Identity | [PNG](hub-identity/01-hub-identity.png) · [PlantUML](hub-identity/01-hub-identity.puml) | [Combined inventory](CLASS_INVENTORY.md) |
| Vehicle Rental | [PNG](vehicle-rental/02-vehicle-rental.png) · [PlantUML](vehicle-rental/02-vehicle-rental.puml) | [Combined inventory](CLASS_INVENTORY.md) |
| Parking & Private EV | [PNG](parking/03-parking-private-ev.png) · [PlantUML](parking/03-parking-private-ev.puml) | [Combined inventory](CLASS_INVENTORY.md) |
| Fleet & Incident | [PNG](fleet-incident/04-fleet-incident.png) · [PlantUML](fleet-incident/04-fleet-incident.puml) | [Combined inventory](CLASS_INVENTORY.md) |
| Smart Charging | [PNG](smart-charging/05-smart-charging.png) · [PlantUML](smart-charging/05-smart-charging.puml) | [Module inventory](smart-charging/05-smart-charging-inventory.md) |
| What-if Simulation | [PNG](what-if/06-what-if.png) · [PlantUML](what-if/06-what-if.puml) | [Module inventory](what-if/06-what-if-inventory.md) |

Green headers and `C`/`E` icons distinguish classes from enumerations. Association, multiplicity and dependency lines follow the diagrams; an external module's class is a reference, not a second owner. Every displayed operation has a matching entry in [method design](../method-design/README.md). Smart Charging's `Waiting` request has no allocation; `Scheduled` and active charging hold an allocation until their state changes. Its planned `endTime` does not release a point by itself.
