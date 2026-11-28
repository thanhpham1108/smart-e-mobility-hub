const messages = {
  PARKING_FULL: "At least one 15-minute slot is full. Choose another Hub or interval.",
  INVALID_PARKING_WINDOW: "Choose arrival and departure on the 15-minute grid, up to seven days apart.",
  PARKING_WINDOW_EXPIRED: "The check-in deadline has passed. Choose a later arrival.",
  PARKING_OVERLAP: "This vehicle already has a booking during that interval.",
  VEHICLE_ALREADY_PARKED: "This vehicle has an active parking visit. Check out before checking in again.",
  CHECK_IN_WINDOW_CLOSED: "Check-in is available from arrival until the exact check-in deadline.",
  BOOKING_NOT_FOUND: "This parking reference is unavailable for your profile.",
  HUB_UNAVAILABLE: "This Hub is currently unavailable. Choose another Hub.",
  PARKING_SUMMARY_CHANGED: "The booking or its linked charging requests changed. Review the latest details and confirm again.",
  PARKING_REVIEW_CHANGED: "The check-in policy changed. Review the interval again.",
  STOP_CHARGING_FIRST: "Charging is still active. Complete or stop it, then review checkout again.",
  INVALID_BOOKING_TRANSITION: "This action is no longer available. Refresh the booking details.",
  ARRIVAL_MISMATCH: "The confirmed Hub or vehicle does not match the ticket.",
  PARKING_HOLD_UNAVAILABLE: "The reserved capacity needs verification. Please contact the Operator."
};

export function parkingResult(result) {
  return { ...result, message: messages[result.code] ?? result.message };
}

export function defaultDraft(state) {
  const arrival = Math.ceil(Date.parse(state.demoTime) / 900000) * 900000;
  return {
    hubId: state.hubs.find(hub => hub.id === "ktx-a")?.id ?? state.hubs[0]?.id ?? "",
    vehicleId: state.privateVehicles[0]?.vehicleId ?? "",
    arrivalTime: localInput(arrival),
    departureTime: localInput(arrival + 3600000)
  };
}

export function localInput(value) {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
}

export function parkingInput(draft) {
  return { ...draft, arrivalTime: new Date(draft.arrivalTime + ":00+07:00").toISOString(),
    departureTime: new Date(draft.departureTime + ":00+07:00").toISOString() };
}

export function validateDraft(draft) {
  const errors = {};
  if (!draft.hubId) errors.hubId = "Select a Hub.";
  if (!draft.vehicleId) errors.vehicleId = "Select your vehicle.";
  const arrival = Date.parse(draft.arrivalTime + ":00+07:00");
  const departure = Date.parse(draft.departureTime + ":00+07:00");
  if (!Number.isFinite(arrival) || arrival % 900000) errors.arrivalTime = "Select an arrival on a 15-minute boundary.";
  if (!Number.isFinite(departure) || departure % 900000) errors.departureTime = "Select a departure on a 15-minute boundary.";
  else if (departure <= arrival || departure - arrival > 7 * 86400000) {
    errors.departureTime = "Departure must follow arrival, within seven days.";
  }
  return errors;
}

// Persist only an in-flight submission identity, so a refresh can resolve a lost
// response using the same database receipt. Domain records stay in PostgreSQL.
export function createParkingService(api, userId, storage = globalThis.sessionStorage) {
  const storageKey = "smarthub-parking-command-" + userId;
  let pending = null;
  try { pending = JSON.parse(storage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }
  if (!pending?.id || !pending.operation || !pending.input) pending = null;
  function save() {
    try {
      if (pending) storage.setItem(storageKey, JSON.stringify(pending));
      else storage.removeItem(storageKey);
    } catch { /* The current page still retains the submission key. */ }
  }
  return {
    pending: () => pending,
    async read(view, filter) { return parkingResult(await api.read(view, filter)); },
    async command(operation, input) {
      if (pending && (pending.operation !== operation || JSON.stringify(pending.input) !== JSON.stringify(input))) {
        return { ok: false, message: "Resolve the previous submission before starting another parking action." };
      }
      pending ??= { id: crypto.randomUUID(), operation, input };
      save();
      let result;
      try { result = await api.command(operation, input, pending.id); }
      catch { result = { ok: false, code: "CONNECTION_FAILED", message: "Connection interrupted. Resolve the original submission to check its outcome." }; }
      if (result.code !== "CONNECTION_FAILED") { pending = null; save(); }
      return parkingResult(result);
    }
  };
}
