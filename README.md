# Smart E-Mobility Hub

Smart E-Mobility Hub is a course project for coordinating electric mobility resources across the VNU-HCM Urban Area. A network of Mobility Hubs provides shared electric vehicles, parking spaces and charging points. Students use these resources; Operators monitor capacity, resolve incidents, coordinate vehicles between Hubs and explore hypothetical demand.

**Project status:** Submissions 1–3 document requirements, interactions and design. The Final MVP uses Student and Operator portals with direct demo access and shared Supabase PostgreSQL. See the [implementation guide](docs/implementation/README.md) for feature behavior and demo workflows.

## What the MVP must demonstrate

| Actor | Main interactions |
| --- | --- |
| Student | Open the Student portal; search Hubs and vehicles; reserve, pick up and return a shared vehicle; reserve parking for a private EV; request, view, cancel and complete charging. |
| Operator | Inspect network and resource state; coordinate redistribution; investigate incidents; view and adjust charging assignments; configure and compare what-if runs. |
| External Telemetry Provider | Supply identified, timestamped vehicle, parking and charging observations. An in-browser simulator plays this role in the MVP. These are supporting event flows rather than interactive user goals. |

The demo should show state changes across connected flows, such as a vehicle becoming unavailable after reservation, a parking booking consuming capacity, a charging request entering a waitlist when all points are occupied, and an incident restricting an affected resource.

## Six modules and team ownership

Each member continues the area they designed in Submissions 1–3. The owner implements a complete feature slice: domain behavior, its service function boundary, relevant Student or Operator screens, and the integration points listed below. Shared UI and state infrastructure should be agreed as a team before feature branches depend on it.

| Member | Module and use cases | Owned state and implementation responsibility |
| --- | --- | --- |
| Võ Hoàng Phúc Duy (2452214) | **Hub & Identity** — UC-A01–A02, UC-H01–H03, UC-X01 | Users, sessions, roles, Hub information, search/status/alternatives; common authentication and authorization contract. |
| Nguyễn Khải Ca (2452159) | **Vehicle Rental** — UC-R01–R08 | Shared vehicles, reservations, trips, vehicle eligibility, pickup/return, cancellation and problem reports. |
| Nguyễn Phước Nhật Duy (2452205) | **Parking & Private EV** — UC-P01–P07 | Parking spaces, interval reservations, check-in/checkout sessions, capacity ledger and handoff to private-EV charging. |
| Mai Hoàng Phương Đông (2452265) | **Fleet & Incident** — UC-F01–F05, UC-I01–I03, supporting UC-T01–T03 | Network overview, redistribution orders, incident tickets, telemetry validation and routing, operational alerts. |
| Phạm Nguyễn Công Thành (2453175) | **Smart Charging** — UC-C01–C03 | Charging requests, points, allocations, Hub schedules, FCFS waitlist and verified session lifecycle. |
| Nguyễn Xuân An (2452023) | **What-if Simulation** — UC-W01–W05 | Scenarios, consistent network snapshots, isolated runs, results, recommendations and comparisons. |

The [Submission 3 index](docs/submission-3/README.md) links each module's class diagram, method catalogue and design test cases. Those documents define the detailed operations; this README describes how the six parts fit together.

## Main user and operator flows

### Hub search and shared vehicle rental

A Student signs in, searches Hubs and available vehicles, inspects a vehicle and requests a reservation. Reservation confirmation rechecks vehicle eligibility so two users cannot claim the same vehicle. A confirmed reservation holds pickup eligibility for the configured period, currently 15 minutes. Pickup consumes that reservation and creates one active trip. Return records the actual destination, trip completion, vehicle condition and parking occupancy. Reporting a vehicle problem creates an incident for Operator review; a faulted vehicle cannot become available merely because its trip ended.

### Private-EV parking

A Student selects an arrival/departure interval on a parking time grid, currently 15 minutes per step. Reviewing availability does not hold capacity. Confirmation checks every slot in the continuous interval and holds the whole interval or nothing. An unused booking expires at its check-in deadline; the default grace is 15 minutes, capped by departure. Check-in creates a parking session and counts the occupied space once. Checkout closes the actual visit and releases remaining holds. A linked active charging session needs a verified stop before checkout can finish.

### Charging and the waitlist

Smart Charging receives a valid request from the Student flow or Parking. Its order is **first come, first served by submission timestamp**. Only identical timestamps use lower battery as a tie-breaker; request ID stabilizes any remaining tie. A future-start request waits without a reserved point. If an eligible request finds every point occupied, the system stores it as Waiting, reports that the Hub is Full and shows its current waitlist position. When a point actually becomes free, the service promotes the next eligible waiting request automatically. A waiting request expires when its requested window ends.

An assignment connects one request to one charging point through a `ChargingAllocation`; a `ChargingSchedule` groups a Hub's allocations. Planned end time and estimated charging duration are displayed for reference. Neither frees an active point. A verified target-reached event completes the request; a Student can also choose early Complete or Cancel, with the point released after the stop is confirmed. A Scheduled request without a verified start within 15 minutes loses its allocation. An Operator adjustment must recheck current point and schedule state without bypassing FCFS.

### Fleet, incidents and telemetry

Operators inspect the network and create redistribution orders for selected shared vehicles. Creation commits the selected vehicles but does not reserve destination capacity or change their confirmed location. On physical arrival, the Operator confirms the arrived subset; the system checks destination capacity again, updates those vehicles and occupancy, and retains the remaining order progress. Incident handling records evidence and restricts affected vehicles or charging points. Verified repair can remove the relevant incident restriction, but other active faults and commitments still apply.

The in-browser telemetry simulator creates vehicle, parking and charging observations for the intake module. The intake validates simulated source identity, resource identity, timestamp, freshness and duplicate events, then calls the module that owns the resource. A parking count observation does not itself check a vehicle in/out. An idle charging-point observation does not end a held or active charging session. Telemetry-observed location does not replace redistribution arrival confirmation.

### What-if Simulation

An Operator configures a scenario, starts a run and reviews predicted metrics and recommendations. Each run starts from a consistent, versioned network snapshot and changes only a copy. The result can show capacity, parking use, vehicle availability, charging congestion and unserved demand. Recommendations are advisory; applying an operational change would require the owning live module to validate current state. Comparing runs identifies different baselines, assumptions or time horizons rather than treating them as equivalent.

## Architecture and integration

GitHub Pages serves the browser app. The browser starts a Supabase demo session automatically. The Student and Operator portals use seeded profiles. Supabase PostgreSQL owns the clock, bookings, sessions and other live records. See the [Final architecture](docs/implementation/FINAL_ARCHITECTURE.md).

The [deployment view](docs/submission-3/deployment-view/README.md) and [development view](docs/submission-3/development-view/README.md) record Submission 3. The Final implementation uses database transactions and authenticated RPCs to enforce the module ownership rules.

| Integration boundary | Shared interface |
| --- | --- |
| Hub & Identity → all modules | Session and role-check result; Hub IDs, status, capacity and alternative-Hub lookup. |
| Rental ↔ Parking | Pickup/return effects on physical parking occupancy and Hub projections. |
| Parking ↔ Smart Charging | Linked parking reference and requested window; request creation/status; cancellation of unused linked requests; verified stop before checkout. |
| Fleet & Incident → Rental / Parking / Charging | Typed telemetry and incident events; owner-controlled restriction, reconciliation and status updates. |
| All operational modules → What-if | One consistent, read-only snapshot with source versions and freshness information. |
| UI / simulated timer → owning services | Selected demo role, authoritative app time, retry key or event ID, and expiry/timeout triggers. |

Use the [shared implementation contracts](docs/implementation/SHARED_CONTRACTS.md) for the SQL runtime, data ownership and API shapes. The Submission 3 baseline supplies the domain context.

## How to divide and assemble implementation work

**Start with [CONTRIBUTING.md](CONTRIBUTING.md).** It explains where to read the shared contracts and assignments, how to run the skeleton and where to place code, and how to open and verify a PR to `develop`.

1. **Extend the shared browser app.** Follow the [database setup](docs/implementation/DATABASE_SETUP.md), shared API and stable IDs. Reuse the two portal shells and UI tokens.
2. **Agree on cross-module contracts first.** The owner of each service writes its request/response shapes and error/status meanings. Its consumers build against the same contract, using temporary adapters or fixtures while the provider is unfinished. In particular, settle the Parking–Charging handoff and Fleet's calls to Rental/Parking/Charging before implementing dependent flows.
3. **Build feature slices in module branches.** Each owner connects UI → domain service → shared browser state for at least one main flow, then adds the remaining actions and exceptional states. Keep domain rules in the owning service rather than duplicating them in UI components.
4. **Integrate in dependency order.** Bring up the shared app and Hub & Identity first; connect Rental and Parking; then Charging with Parking; then Fleet/Incident and telemetry; then What-if snapshot reads. Merge small, reviewable changes into the shared branch after each connected flow works.
5. **Run end-to-end scenarios before the demo.** Verify a Student rental journey, a parking and charging journey with Full/waitlist behavior, an incident and partial redistribution, and an isolated simulation. Check resource counts and lifecycle states after each flow.

Phạm Nguyễn Công Thành coordinates PostgreSQL migrations, shared fixtures, demo controls and integration into develop. Feature owners review their module’s contracts, implementation and demo.

## Final submission

The course brief requires **one final PDF** containing all content from Submissions 1, 2 and 3, a working demonstration shown as a sequence of screens, and a clear Generative AI declaration naming the tools, scope and level of contribution. The group must also develop and present the working MVP and prepare presentation slides. The PDF is the report; the application is run for the demonstration. The brief does not name a separate source-code archive as a final submission item. Check the LMS for deadlines and any additional upload instructions.

## Documentation map

| Phase | Primary source |
| --- | --- |
| Submission 1: requirements, actors and use cases | [Use-case catalogue](docs/submission-1/use-case-diagram/use-case-catalogue.md), [non-interactive requirements](docs/submission-1/functional-requirements/non_interactive_functional_requirements.md), [non-functional requirements](docs/submission-1/non-functional-requirements/non_functional_requirements.md) |
| Submission 2: UI and behavior | [Submission 2 report](docs/submission-2/Submission2_Report.md), [sequence diagrams](docs/submission-2/sequence-diagrams/), [activity diagrams](docs/submission-2/activity-diagrams/), [state charts](docs/submission-2/state-chart-diagrams/) |
| Submission 3: architecture and detailed design | [Submission 3 index](docs/submission-3/README.md), [architecture baseline](docs/submission-3/architectural-design/architecture_baseline.md), [class diagrams](docs/submission-3/class-diagram/), [method design](docs/submission-3/method-design/), [design test cases](docs/submission-3/test-cases/) |
| Team process | [Submission 3 assignment](docs/submission-3/task_assignment.md), [contribution guidance](CONTRIBUTING.md) |

## Development setup

**Stack:** HTML, CSS and JavaScript on GitHub Pages with Supabase Auth and PostgreSQL. For local frontend and database setup, demo access and migration checks, follow [Database setup](docs/implementation/DATABASE_SETUP.md).
