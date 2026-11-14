# Submission 3 — Design

Submission 3 contains one shared [deployment view](deployment-view/README.md), one shared [development view](development-view/README.md), six module class diagrams, method descriptions for every operation shown, and bonus design test cases. The [architecture baseline](architectural-design/architecture_baseline.md) records the contracts between modules. These are design artifacts, not evidence of an implemented backend.

| Module | Class diagram | Method descriptions | Test cases |
| --- | --- | --- | --- |
| Hub & Identity | [PNG](class-diagram/hub-identity/01-hub-identity.png) · [PlantUML](class-diagram/hub-identity/01-hub-identity.puml) | [Methods](method-design/01-hub-identity.md) | [Cases](test-cases/01-hub-identity.md) |
| Vehicle Rental | [PNG](class-diagram/vehicle-rental/02-vehicle-rental.png) · [PlantUML](class-diagram/vehicle-rental/02-vehicle-rental.puml) | [Methods](method-design/02-vehicle-rental.md) | [Cases](test-cases/02-vehicle-rental.md) |
| Parking & Private EV | [PNG](class-diagram/parking/03-parking-private-ev.png) · [PlantUML](class-diagram/parking/03-parking-private-ev.puml) | [Methods](method-design/03-parking-private-ev.md) | [Cases](test-cases/03-parking-private-ev.md) |
| Fleet & Incident | [PNG](class-diagram/fleet-incident/04-fleet-incident.png) · [PlantUML](class-diagram/fleet-incident/04-fleet-incident.puml) | [Methods](method-design/04-fleet-incident.md) | [Cases](test-cases/04-fleet-incident.md) |
| Smart Charging | [PNG](class-diagram/smart-charging/05-smart-charging.png) · [PlantUML](class-diagram/smart-charging/05-smart-charging.puml) | [Methods](method-design/05-smart-charging.md) | [Cases](test-cases/05-smart-charging.md) |
| What-if Simulation | [PNG](class-diagram/what-if/06-what-if.png) · [PlantUML](class-diagram/what-if/06-what-if.puml) | [Methods](method-design/06-what-if.md) | [Cases](test-cases/06-what-if.md) |

The [combined class inventory](class-diagram/CLASS_INVENTORY.md) explains ownership and cross-module relationships. The [team assignment](task_assignment.md) records who owns each module; it is a planning document, so use the diagrams and method catalogues above for the current design.

The current charging rule is FCFS by submission timestamp, with lower battery as the tie-breaker only for identical timestamps. A future-start request waits without a reserved point; a currently eligible request waits with a `Full` response when capacity is occupied. Planned end times and duration estimates are informational. Fleet redistribution commits vehicles but does not reserve destination capacity; arrival confirmation rechecks it. What-if reads a copied snapshot and never changes live operation.
