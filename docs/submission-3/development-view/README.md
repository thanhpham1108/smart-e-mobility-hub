# Development view — Smart E-Mobility Hub

[PlantUML source](Implementation_View.puml) · [PNG](Implementation_View.png) · [SVG](Implementation_View.svg)

This UML component view shows how the Student and Operator portals call API handlers, how the internal scheduler starts due charging requests and runs expiry/timeout checks, and how those entry points use six domain modules. The modules share repository, Unit of Work and versioned snapshot contracts within one application process. Dashed dependencies describe software structure, not separate network connections; the physical runtime is in the [deployment view](../deployment-view/README.md).

Hub & Identity owns users, sessions and Hub lookup; Vehicle Rental owns shared vehicles; Parking & Private EV owns parking reservations and sessions; Fleet & Incident owns redistribution, incident handling and telemetry intake; Smart Charging owns requests, points and allocations; What-if Simulation copies a consistent snapshot and produces recommendations without changing live state. Detailed interfaces and current charging/Fleet rules are in the [architecture baseline](../architectural-design/architecture_baseline.md).
