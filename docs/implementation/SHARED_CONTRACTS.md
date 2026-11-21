# Shared implementation contracts

Use this file with the [implementation plan](README.md), the [UI contract](UI_DESIGN_SYSTEM.md), and each module's [method catalogue](../submission-3/method-design/README.md). For the Final MVP, the runtime decisions below take precedence over server, transport and storage details in Submissions 1–3. Use those submissions for the business rules, ownership and expected outcomes.

## Runtime and existing skeleton

- Use the existing `index.html`, hash router and Student/Operator shells. Keep the existing route paths, relative asset paths and `mount(root, context)` interface. Add domain services under `src/modules/` and use the UI inside `src/ui/`. The entry point provides `store` and `clock` in the page context. Feature owners add their services as they wire up their pages.
- GitHub Pages serves the static app. The demo uses one tab and one browser profile. JavaScript service calls represent the older API calls. The Fleet simulator emits local events and the lock/unlock and parking-gate outcomes are simulated. Use synthetic accounts and fixture data. When publishing, package `index.html`, `src/` and any app assets and fixtures needed at runtime. For a classroom fallback, run the same release over `localhost` and reset to the same seed. Pages and localhost have separate storage.
- Member 1 owns the demo session and role switch. Service calls use the current demo session or app-created simulator context. An Operator hash with a missing or wrong role shows the role selection and then opens the requested route. The current preview router automatically switches roles from the hash. Replace that preview behavior when Hub & Identity is implemented. These checks demonstrate workflow authorization inside the browser.
- Keep What-if on a background browser task. It uses a copied network snapshot, returns advisory results and does not alter operational records. The older server worker describes this logical responsibility.
- Rental and charging are free in the Final MVP. Campus credits and billing from Submission 1 are outside Final scope. Record this scope change in the Final report.

## IDs, state and time

- Keep `hubs[].id` from the current skeleton. Cross-module references use `hubId` with that exact string, for example `ktx-a`. Use the owning record's IDs, with qualified reference names where needed. For example, a charging request's `parkingReservationId` refers to the Parking record's `reservationId`, and a `parkingSessionId` reference points to `ParkingSession.sessionId`. A shared vehicle's `currentHubId` can be `null` during an active rental trip. During a Fleet transfer, the confirmed Hub records the last confirmed location until verified arrival at the destination.
- Seed the store from one versioned JSON fixture set in `src/data/fixtures/`. Thành owns the shared store, fixtures, demo clock and reset, and coordinates fixture IDs with each feature owner. Member 1 supplies the demo users and Hub data. Domain records and events use JSON-safe values. Represent incident ID sets as arrays when saving. Preserve the enum spelling in the owner method catalogue and map labels in the UI. Internal demo roles use the skeleton's `student` and `operator` values.
- Use `readSnapshot()`, `subscribe()`, `commit(command)` and `resetDemo()` from the shared store in `context`. Each command works on a copy of the latest state and saves once before notifying views. A failed write keeps the previous snapshot. Store semantics apply within the demo tab. The two reference screens derive preview counts from the fixture records, and feature services enforce availability and allocation rules.
- For cross-module calls, wrap results as `{ ok: true, data }` or `{ ok: false, code, message }`. A successfully queued request is a success outcome. A write that may be retried carries a `commandId` or uses the method's existing retry key. Scope it by caller and operation. An identical retry returns the original result, while reuse with changed inputs is a conflict. Telemetry keeps its own `eventId` and owner validation.
- Use `clock.now()` or the command's `now` value for ISO 8601 demo time. Compare instants and display them in `Asia/Ho_Chi_Minh`. The clock advances manually and is saved together with the state. Operator has a `+15 min` control. Reset Demo in either portal restores the seed and original clock, clears retry receipts and remounts the current route. Owners run expiry and promotion checks at startup and before relevant actions. Wire the clock handler to call these services after a successful advance returns.

### Using the foundation

The fixture is [demo.json](../../src/data/fixtures/demo.json). It starts at **09:00 ICT on 24 October 2026**. KTX Khu A (`ktx-a`) has an available shared bike, one free parking space and one occupied charging point. Its active charging session is linked to the guest's checked-in booking. KTX Khu B (`ktx-b`) has a free charging point. Extend the existing collections using IDs that resolve to the same fixture records. After editing the fixture, reload the app to fetch it, then click Reset Demo to replace the saved state. Bump `schemaVersion` when an older saved shape becomes incompatible.

Pages receive `{ store, clock }` from the existing router. Call the store from your module's service, using the following command shape. The callback below illustrates the two related writes for Rental.

```js
return store.commit({
  operation: "rental.reserve",
  callerId: studentId,
  commandId,
  input: { vehicleId },
  apply(draft, { now }) {
    const vehicle = draft.vehicles.find(item => item.vehicleId === vehicleId);
    if (!vehicle || vehicle.status !== "AVAILABLE" || vehicle.condition !== "OPERATIONAL") {
      return { ok: false, code: "VEHICLE_UNAVAILABLE", message: "Choose an available vehicle." };
    }
    // The full service also checks the current session and vehicle restrictions.
    const reservation = {
      reservationId,
      studentId,
      vehicleId,
      createdAt: now,
      expiresAt: new Date(Date.parse(now) + 15 * 60_000).toISOString(),
      status: "CONFIRMED"
    };
    draft.rentalReservations.push(reservation);
    vehicle.status = "RESERVED";
    return { ok: true, data: reservation };
  }
});
```

In the example, the service supplies `studentId`, `vehicleId`, a new `reservationId` and a `commandId` tied to the original action. `apply` is synchronous and receives the working copy and time captured for that command. Coordinated owner updates work on that same draft. Use a JSON value for success `data`, including `null` for a result without data. To handle retries, reuse the same `commandId` and include all effective user inputs in `input`. A replay returns the saved result, and reusing the ID with changed inputs returns `COMMAND_CONFLICT`. Keep rendering and asynchronous work outside `apply`. Use `subscribe()` to refresh a view and call its returned cleanup function when unmounting. Writes from a synchronous subscriber return `WRITE_IN_PROGRESS` because the current command is still publishing.

## Handoffs for the first integrated flows

The existing method names remain the domain reference. Where a provider method has yet to be named, the owners can choose its JavaScript name while keeping the inputs and effects below.

1. **Hub & Identity → feature services.** Resolve the current session to `{ userId, role }` within the app and use `getHubStatus(hubId)` for Hub context. Student write actions derive the Student identity from the current session.
2. **Rental ↔ Parking.** Pickup passes the confirmed `vehicleId` and source `hubId` so Parking releases the matching occupancy. Return passes `vehicleId`, `hubId` and `parkingSpaceId` so Parking validates the selected space and records the arrival. Commit the Rental transition and Parking update together. Rental reports vehicle problems through Fleet/Incident with the vehicle, reporter and rental reference.
3. **Parking ↔ Charging.** Parking checks the Student and parking window, then sends `parkingReservationId`, `hubId`, `vehicleId`, `currentBatteryPercent`, `targetBatteryPercent`, `requestedStart`, `requestedEnd` and a retry key to `submitRequest`. Return `requestId`, `status`, `allocationId`, `queuePosition` and `reason`. An eligible request at capacity gets `{ status: "Waiting", allocationId: null, queuePosition: 1, reason: "Full" }` for first position. A future request gets `Waiting` and `FutureStart`; an assigned request gets `Scheduled` and an allocation ID. Both portals read the same request. Parking cancellation or expiry coordinates cancellation of unused linked requests. Checkout requires a verified stop for a `Charging` or `Suspended` request before the parking visit can close.
4. **Fleet/Telemetry → owners.** Fleet validates the simulator's `eventId`, source, resource IDs and time and calls the owner service. The charging session contract carries `kind`, `requestId`, `sessionId`, `pointId`, `vehicleId`, `observedAt` and, where needed, the battery reading or confirmed `COMPLETE`/`CANCEL` choice. A point condition report preserves an existing commitment until the owner confirms its outcome. Fleet records occupancy/location changes through the owners on verified arrival. An order reserves no destination capacity at creation, and partial arrivals change only the confirmed subset.
5. **Live modules → What-if.** Capture a single versioned snapshot with `capturedAt`, source versions and data from Hub, Rental, Parking, Fleet and Charging. Persist simulation records in the What-if area only. Apply scenarios to the copy. To verify isolation, compare the operational records from those five modules before and after. Saving a simulation run also updates the store revision. Live charging can queue a Full request, while What-if counts an unserved arrival when its modeled capacity is exhausted, using its existing metrics.

## Charging rules where older artifacts differ

- `Waiting` covers both future-start requests and currently eligible requests blocked by capacity. Show `Full` only for the latter. Queue display follows submission time, then lower battery on an identical timestamp, then request ID. Promotion considers only requests eligible at the decision time. A waiting position is informational, and `requestedEnd` expires a waiting request. Use 20 entries per Hub as a workload for testing. An eligible request can still join when there are already 20 waiting entries.
- A Scheduled point hold has a 15-minute start timeout. Planned end and estimated duration remain informational and do not release an active point. A confirmed START sets `Charging`, a confirmed suspension sets `Suspended` and keeps the commitment, and verified recovery can resume on the same point. Verified `COMPLETE` or target reached sets `Completed`; verified `CANCEL` sets `Cancelled`. A stop report without a matching confirmed outcome goes to reconciliation. Older `Active`, `Paused` and `Interrupted` labels in telemetry artifacts describe observations and are not additional live request states. The separate What-if `Paused` outcome still applies within the simulation copy.

## Final report alignment

Report the browser deployment and demo session limits. Record the billing scope change and the queue test workload. Update the server-based deployment and development views and any older telemetry or request diagrams used in the Final report to match the rules above. Capture the walkthrough from the integrated build.
