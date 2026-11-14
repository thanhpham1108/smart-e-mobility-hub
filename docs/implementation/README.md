# Implementation plan — Smart E-Mobility Hub

This is the working handoff for the six implementation owners. It follows the latest agreed MVP: **one responsive HTML/CSS/JavaScript app on GitHub Pages, demonstrated in one browser, with seeded data and browser-local state**. It is not a claim that code already exists. The [UI contract](UI_DESIGN_SYSTEM.md) is mandatory for every feature screen.

## 1. What the team must agree before parallel coding

Build one app, not six independently styled sites. The shared foundation must land on `develop` before feature branches import it:

1. **Entry point and routing:** one `index.html`, ES modules, hash routes (for example `#/student/parking` and `#/operator/charging`) so refresh works on GitHub Pages under the repository URL. The shared shell renders navigation, role switch, page header, loading/error feedback and responsive layout.
2. **State ownership:** one browser store initializes from versioned seed data, persists to `localStorage`, and exposes `readSnapshot()`, `commit(command)` and `resetDemo()`. Each module writes only its own records through a service; cross-module commands apply all related changes together before persisting. A command returns a result or an error without publishing a partial state. Use a schema version so an old browser store can be reset after a fixture change.
3. **Common contracts:** agree on ID names, enum values, timestamps (`ISO 8601`; display in GMT+7), money-free demo data, result/error shape, idempotency key, current demo user/role, and where validation errors appear. These are JavaScript module contracts, not HTTP endpoints.
4. **Time and event simulation:** all services receive an injected `now` or clock service. On app start and before relevant actions, reconcile expired vehicle/parking holds, charging start timeouts, due future requests and waiting expiry. An active tab may also run a timer. The demo controls may advance time and emit identified telemetry events. No business transition depends solely on a timer running while the browser is closed.
5. **Integration boundary:** feature owners publish function signatures, input/output examples and error/status meanings before consumers start their UI. The provider owns the contract; consumers use it without writing provider state directly.

Suggested source shape after the foundation is agreed: `src/app/` (entry and router), `src/shared/` (store, clock, IDs and contracts), `src/modules/<module>/` (domain services), `src/ui/shared/` (tokens, components and common feedback), `src/ui/student/` (Student shell and pages), and `src/ui/operator/` (Operator shell and pages). Keep seed fixtures separate from UI code. These are target conventions, not existing directories. The [UI contract](UI_DESIGN_SYSTEM.md) names the two canonical Submission 2 references and explains how feature pages extend them.

## 2. Member assignments and definition of done

Every owner delivers **service logic + screen(s) + integration function(s) + a repeatable demo scenario**. A screen is done when it uses the shared shell/components, reads the shared store, shows real results of its service calls, and has empty/error/success states. A service is done when its main flow and important rejection/expiry behavior follow the current method design and do not change another module's records directly.

### Member 1 — Hub & Identity: Võ Hoàng Phúc Duy

**Build:** seed users/Hubs; simulated Student/Operator sign-in and sign-out; role-aware navigation; profile update; Hub search, status, freshness and alternatives. Own the shared app shell, router and current-user interface because every feature needs them. The demo login is explicitly simulated; use sample accounts only.

**UI:** login/role switch, Student Hub search/status, shared Student top bar, shared Operator sidebar/header. Implement the shared UI components and token CSS from [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) before other members build their pages. Do not leave Hub screens in their older blue-only visual language.

**Handoff:** `currentUser`, `requireRole`, `findHubs`, `getHubStatus`, `findAlternativeHubs`, shared shell/component API. **Done when:** Student and Operator can enter the correct shell; another module can request identity and Hub data from the same store.

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

| Gate | Merge into `develop` when this works | Pair review |
| --- | --- | --- |
| 0 — foundation | One app opens locally; role switch, seeded store, reset, shared shells/components and one reference page per role work at PC width. GitHub Pages deployment is verified before release. | All six owners approve contracts and [UI system](UI_DESIGN_SYSTEM.md). |
| 1 — Student core | Hub search, rental reserve/pickup/return and parking reserve/check-in/out use one store. | Members 1–2–3 review IDs, capacity and occupancy. |
| 2 — Charging | Parking submission creates Scheduled or Waiting correctly; queue position, cancellation, automatic promotion and verified stop appear in Student and Operator views. | Members 3–5 review the same request and allocation after every transition. |
| 3 — Operations | Incident restriction and partial redistribution call owner services and preserve Hub/resource counts. | Members 2–3–4–5 review cross-module effects. |
| 4 — Simulation and demo | What-if copy is isolated; all four end-to-end demo journeys can be replayed from `resetDemo()`. | Member 6 checks snapshot; all six verify navigation and visual consistency. |

Each feature branch starts from `develop` and merges through a small pull request after its gate slice runs. Do not wait for all six modules to be complete before integration. Keep `main` for the stable demonstration; merge `develop` there when the integrated app is ready. The [root README](../../README.md) remains the public entry point.

## 4. Acceptance scenarios for the final demo

1. **Student rental:** sign in → find Hub/vehicle → reserve → pick up → return; show vehicle and parking counts before/after.
2. **Student parking + charging:** reserve an interval → check in → submit charging when point is full → see waitlist position → free a point through a verified event → see automatic assignment/start/complete → check out.
3. **Operator operations:** inspect an issue → restrict the resource → dispatch a transfer → confirm one vehicle arrival → show partial order progress; resolve the incident without clearing unrelated restrictions.
4. **What-if:** capture a baseline → simulate a demand/fault change → inspect metrics/recommendation → compare with baseline → confirm live state did not change.

The original [use-case catalogue](../submission-1/use-case-diagram/use-case-catalogue.md), [Submission 2 interactions](../submission-2/Submission2_Report.md), [class inventory](../submission-3/class-diagram/CLASS_INVENTORY.md) and [method/test catalogues](../submission-3/README.md) provide detail on each flow. If a mockup or older design note conflicts with a later agreed rule, record the decision here and update the Final report to match the implemented MVP.
