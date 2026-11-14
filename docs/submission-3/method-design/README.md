# Method design — Submission 3

Each catalogue describes the purpose, inputs and outputs, preconditions, state changes, and failure behavior of every operation drawn in its module's [class diagram](../class-diagram/README.md). The current catalogues are:

1. [Hub & Identity](01-hub-identity.md)
2. [Vehicle Rental](02-vehicle-rental.md)
3. [Parking & Private EV](03-parking-private-ev.md)
4. [Fleet & Incident](04-fleet-incident.md)
5. [Smart Charging](05-smart-charging.md)
6. [What-if Simulation](06-what-if.md)

[TEMPLATE.md](TEMPLATE.md) is an authoring aid. The six numbered files above are the module designs. Smart Charging's `endTime` is planned information and does not release an active point; Fleet rechecks destination capacity at confirmed arrival.
