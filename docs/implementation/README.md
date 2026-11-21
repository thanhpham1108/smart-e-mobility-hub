# Implementation plan — Smart E-Mobility Hub

Start with the [contributor guide](../../CONTRIBUTING.md), [database setup](DATABASE_SETUP.md), [shared contracts](SHARED_CONTRACTS.md), [UI design system](UI_DESIGN_SYSTEM.md) and [Final architecture](FINAL_ARCHITECTURE.md). GitHub Pages serves the browser app, and Supabase PostgreSQL stores the shared demo state.

## 1. Shared implementation

- **Frontend:** One native browser app with Student and Operator shells and hash routes. Sign in with the appropriate demo account. Reuse the existing components and desktop visual references.
- **Database:** SQL migrations define the schema, RPC commands and sample data. A command checks roles, rechecks availability and applies dependent changes in one transaction.
- **Time and refresh:** Use the shared demo clock. Operator advances it manually, and the application reconciles due expiries. Visible screens re-read their authorized views every five seconds and after writes.
- **Ownership:** Each module owns its transition rules. Use shared IDs to refer to other modules. Put changes to several resources in the same SQL command.

## 2. Member assignments and definition of done

Every owner delivers **service logic + screen(s) + integration function(s) + a repeatable demo scenario**. A screen is done when it uses the shared shell/components, reads the shared database, shows real results of its service calls, and has empty/error/success states. A service is done when its main flow and important rejection/expiry behavior follow the current method design and do not change another module's records directly.

### Member 1 — Hub & Identity: Võ Hoàng Phúc Duy

**Build:** seed users/Hubs; simulated Student/Operator sign-in and sign-out; role-aware navigation; profile update; Hub search, status, freshness and alternatives. Own the shared app shell, router and current-user interface because every feature needs them. The demo login is explicitly simulated; use sample accounts only.

**UI:** login/role switch, Student Hub search/status, shared Student top bar and Operator sidebar/header. Feature owners can start from the existing shells and CSS tokens while Hub & Identity continues. Use the shared UI contract for any additions.

**Handoff:** `currentUser`, `requireRole`, `findHubs`, `getHubStatus`, `findAlternativeHubs`, shared shell/component API. **Done when:** Student and Operator can enter the correct shell; another module can request identity and Hub data from the same store.

**Early handoff:** Provide a sample Student and Operator, stable Hub IDs and a working Hub lookup. Coordinate the identity contract and fixture records with Thành. Profile editing, Hub search and alternative Hub suggestions can continue in parallel with the other features.

### Member 2 — Vehicle Rental: Nguyễn Khải Ca

**Build:** vehicle search/details, reserve, 15-minute hold expiry, pickup, return, reservation/trip history, eligible cancellation and problem report. Recheck vehicle availability at commit; one vehicle cannot have incompatible active claims. A fault during a trip does not erase the trip or make the vehicle rentable on return.

**UI:** Student vehicle list/detail, reservation confirmation, My Reservations/Trips, pickup and return flow. Adapt the existing Rental screenshots to the shared Student shell and components.

**Handoff:** read Hub status from Member 1; request parking pickup/return effects from Member 3; send problem reports to Member 4. **Done when:** one Student can reserve, pick up and return a vehicle, see the state change, and encounter a clear conflict/expiry result.

### Member 3 — Parking & Private EV: Nguyễn Phước Nhật Duy

**Build:** review a continuous parking interval on the 15-minute grid; atomically confirm all covered slots; cancel/no-show expiry; check-in; checkout; booking list/details; physical occupancy. A review never holds capacity. Check-in consumes the reservation hold without counting the visit twice. The default no-show deadline is arrival plus 15 minutes, capped at departure.

**UI:** reserve parking, ticket/QR reference, My Bookings, check-in/out and the linked charging summary. Start from the existing parking prototype but use the single Student shell and shared fields/cards/status badges.

**Handoff with Member 5:** submit charging with parking reference, Hub/vehicle, battery values and requested window; read request/status/queue position; cancel linked Waiting/Scheduled requests on parking cancellation/no-show/checkout; require a verified stop before checkout if charging is active. **Done when:** no partial parking holds or double occupancy occur and the charging link shows the same state in both modules.

### Member 4 — Fleet & Incident: Mai Hoàng Phương Đông

**Build:** network overview and resource inspection; redistribution validation/creation; dispatch, partial arrival and at-risk handling; incident reporting/investigation/repair; telemetry simulator and validation. Order creation commits vehicles but does not reserve destination capacity. Arrival confirmation rechecks capacity and moves only the confirmed subset. Resolving one incident clears only its own restriction.

**UI:** Operator network overview, transfer form/order progress, incident desk, telemetry/event controls. Use the shared Operator sidebar/header; preserve the existing Fleet mockup's information hierarchy but replace its private shell/styles.

**Handoff:** get Hub/Rental/Parking/Charging snapshots; call the owning module's restriction or arrival/occupancy operations instead of editing their records. **Done when:** a partial transfer and a fault can be shown without conflicting vehicle/Hub/point state.

### Member 5 — Smart Charging: Phạm Nguyễn Công Thành

**Build:** request submission, FCFS order, exact-timestamp lower-battery tie, current queue position, automatic promotion, point/allocation/schedule state, Operator adjustment, 15-minute no-start timeout, verified start/stop/target-reached events and point restrictions. Future-start requests remain Waiting without a point. Full eligible requests remain Waiting and report `Full` plus queue position. Planned end/estimated duration never releases an active point.

**UI:** Operator Charging Queue, schedule overview and adjustment modal; Student charging status/actions inside Parking's booking flow. Adapt the existing charging mockups to current rules: one common demo power setting, no guaranteed future point, no grid-load optimization or `InsufficientChargingTime` rejection.

**Handoff:** publish the Parking contract with Member 3 first; accept verified point/session observations from Member 4; export a read-only charging snapshot for Member 6. **Done when:** Full → Waiting → Scheduled → Charging → Completed/Cancelled is visible and FCFS is preserved through cancellation, timeout and adjustment.

### Member 6 — What-if Simulation: Nguyễn Xuân An

**Build:** scenario configuration, consistent baseline snapshot, isolated run, result, recommendation and comparison. Use copies of the five live modules' state; a failed run must not publish a completed result. Recommendations remain advisory and never invoke live mutation functions.

**UI:** Operator scenario form, run status/results, comparison and recommendation details, all inside the shared Operator shell. Reuse the existing What-if information layout with shared controls and responsive rules.

**Handoff:** consume one shared `readSnapshot()` contract instead of five private data imports. **Done when:** the Operator can run and compare scenarios and the live state is unchanged before/after the run.

## 3. Integration order and review gates

**Integration, shared foundation and Final lead:** Phạm Nguyễn Công Thành (Member 5) builds the PostgreSQL migrations, SQL seed, demo clock and shared reset. He merges verified PRs into `develop` and owns the Final submission. Each feature owner implements and fixes their module, tests its connections with the other owner, and supplies verified demo steps, screenshots and their AI usage record.

### First handoff for each member

1. **Hub & Identity:** Select a demo Student or Operator and read the same Hub by ID. Verify the matching portal opens.
2. **Vehicle Rental:** Confirm a reservation for an available vehicle and show the saved reservation and the vehicle's changed status.
3. **Parking & Private EV:** Confirm a parking interval and show the saved booking and check-in deadline.
4. **Fleet & Incident:** Show the current Hub resources and send one identified simulated event to its owning service. Verify the result appears in the Operator view.
5. **Smart Charging:** Save a valid request when the Hub is full and show the same request ID and `Waiting #1` in both portals with Parking.
6. **What-if Simulation:** Run one demand scenario from a compatible snapshot. Show one changed result metric and verify the original operational records are unchanged.

### How to hand over a feature

1. **Start from `develop`.** Each owner works on a feature branch and first builds one usable action in the existing PC shell. Use a fixture that matches the shared contracts while a dependency is in progress. The first handoff can be as small as confirming a rental and seeing that vehicle become reserved.
2. **Open a PR to `develop`.** Include the route, the setup or reset step, a short list of clicks, the state change expected after those clicks, and any dependencies still in progress. Link the related PR if the flow spans two modules.
3. **Check the connection with both owners.** Run the feature, then run the related existing flow to check that it still works. For Parking and Charging, verify the request ID and Waiting status on both portals. If a result differs, the owner of the affected service fixes it on their branch.
4. **Merge and replay.** Thành merges the verified slice, the owners pull the updated `develop`, and the pair replays the flow from the shared seed. A feature branch can start before a dependency is complete. A cross-module flow is ready for the demo once it runs through the actual shared services and store.

### Which flows to connect first

| Gate | Merge into `develop` when this works | Pair review |
| --- | --- | --- |
| 0 — foundation | One app opens locally in both roles at PC width. One sample Student and Operator, stable Hub IDs, the demo clock and the shared database are available. Verify one real write survives reload and reset restores the seed. | Member 1 and Thành verify the common calls on the existing shells. |
| 1 — Student core | Hub search, rental reserve/pickup/return and parking reserve/check-in/out use the same database. | Members 1–2–3 review IDs, capacity and occupancy. |
| 2 — Charging | Parking submission creates Scheduled or Waiting correctly; queue position, cancellation, automatic promotion and verified stop appear in Student and Operator views. | Members 3–5 review the same request and allocation after every transition. |
| 3 — Operations | Incident restriction and partial redistribution call owner services and preserve Hub/resource counts. | Members 2–3–4–5 review cross-module effects. |
| 4 — Simulation and demo | What-if copy is isolated; all four end-to-end demo journeys can be replayed from `resetDemo()`. | Member 6 checks snapshot; all six verify navigation and visual consistency. |

Use the gates to check integrated behavior as each connected group becomes ready. Keep `main` for the stable demonstration and verify the GitHub Pages deployment before release. The [root README](../../README.md) remains the public entry point.

## 4. Acceptance scenarios for the final demo

1. **Student rental:** sign in → find Hub/vehicle → reserve → pick up → return; show vehicle and parking counts before/after.
2. **Student parking + charging:** reserve an interval → check in → submit charging when point is full → see waitlist position → free a point through a verified event → see automatic assignment/start/complete → check out.
3. **Operator operations:** inspect an issue → restrict the resource → dispatch a transfer → confirm one vehicle arrival → show partial order progress, then resolve the incident with unrelated restrictions preserved. Extend the shared fixture for this demo with two eligible vehicles and enough destination spaces. Fleet, Rental and Parking agree on those IDs.
4. **What-if:** capture a baseline → simulate a demand/fault change → inspect metrics/recommendation → compare with baseline → confirm live state did not change.

The original [use-case catalogue](../submission-1/use-case-diagram/use-case-catalogue.md), [Submission 2 interactions](../submission-2/Submission2_Report.md), [class inventory](../submission-3/class-diagram/CLASS_INVENTORY.md) and [method/test catalogues](../submission-3/README.md) provide detail on each flow. If a mockup or older design note conflicts with a later agreed rule, record the decision here and update the Final report to match the implemented MVP.

## 5. Countdown to the classroom presentation

The classroom presentation date, duration and final PDF deadline are pending announcement. In the proposed milestones below, `T` is the presentation date. Track the PDF deadline separately if it falls before the presentation.

- **First work session.** Thành checks the shared database, clock and reset with Member 1, who connects the demo identity and Hub records. Members 3 and 5 verify the Parking → Charging request and status contract. Members 4 and 5 verify the charging event inputs. Member 6 verifies the network snapshot shape with Thành and gets any Hub-specific fields from Member 1. Each owner starts from `develop` and builds the first handoff in the shared PC shell.
- **Around T−7 days, assemble the first demo.** Connect Student Identity, Rental and Parking in `develop`, then connect Parking and Charging across both portals. Use one seeded Hub with an occupied charger and a scenario that can free it through the normal service flow. Fleet and What-if owners can work against agreed fixture data while these integrations are underway. Start the slide outline and consolidate Submissions 1–3 in parallel.
- **Around T−4 days, complete the demo routes.** Integrate Fleet/Incident and What-if with the shared state. Run all four journeys from section 4 with the intended starting data. Check visible state changes across portals and confirm that What-if leaves operational records unchanged. Capture the report screens from the integrated app once the journeys pass.
- **Around T−2 days, freeze the demo version.** Run a timed rehearsal with the intended laptop and presentation setup. Test the GitHub Pages build when available and serve the same version on `localhost` for the offline fallback. Save a short recording or ordered screenshots of the demo. After rehearsal, limit changes to issues that block the demo or the final submission.
- **T−1 day.** Rehearse again from a reset state, check projector readability and presenter handoffs, and confirm the local Supabase fallback works. If there is less than a week, compress the build milestones and preserve time for both rehearsals.

## 6. Presentation and final PDF

### Suggested classroom run of show

This provisional plan allocates **10 minutes before Q&A**. Adjust it when the lecturer announces the slot. Use one laptop and one person to run the demo, with separate browser profiles for Student and Operator. Each owner explains the state change their module contributes as the demo moves through the script.

1. **1 min · Member 1.** Introduce the campus problem, the two portals and their shared PostgreSQL data. Start as Student and show a Hub.
2. **1 min · Member 2.** Reserve, pick up and return a seeded vehicle. Point out the change in its availability.
3. **3 min · Members 3 and 5.** Book parking and check in. Request charging at a full Hub and show the Student's waitlist position. Switch to Operator, complete the existing session through a verified simulated event and show automatic FCFS assignment of the next eligible request. Begin and complete the newly assigned session, then show the final state in Student and check out.
4. **2 min · Member 4.** Show a fault restricting a resource and confirm one vehicle's arrival on a seeded redistribution order. Show that the order remains partially complete and destination occupancy reflects the confirmed arrival.
5. **1 min · Member 6.** Run a demand or fault scenario, show one comparison metric and one recommendation, then show the baseline operational state is unchanged.
6. **2 min · Member 1 and the team.** Close with lessons learned, a live-demo limitation and a buffer for switching screens. Keep use-case details and design diagrams on backup slides for Q&A.

Prepare slides for the problem and roles, the deployed MVP architecture, the demo checkpoints, and lessons learned. Thành coordinates the Final report and presentation materials. Each owner supplies a short explanation, verified screens and their AI usage record while they work.

The [course brief](../BTL_SoftwareEngineering_HK26_v1.pdf) requires an MVP demonstration of the whole project, slides, repeated practice and a brief presentation that includes lessons learned. The final submission is **one PDF** containing Submissions 1–3, the working demonstration as an ordered sequence of screens, and a Generative AI declaration listing tools, scope and level of contribution. Align the submitted architecture views with the GitHub Pages and Supabase deployment and capture the report screens from the version used for rehearsal.
