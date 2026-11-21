const terminalStatuses = new Set(["Completed", "Cancelled", "Expired"]);
const activeCommitments = new Set(["Scheduled", "Charging", "Suspended"]);
const knownStatuses = new Set([...activeCommitments, "Waiting", ...terminalStatuses]);
const batteryCapacityKwh = 40;

const fail = (code, message) => ({ ok: false, code, message });
const ok = data => ({ ok: true, data });
const timestamp = value => Date.parse(value);
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const orderRequests = requests => [...requests].sort((a, b) => timestamp(a.submittedAt) - timestamp(b.submittedAt)
  || a.currentBatteryPercent - b.currentBatteryPercent || a.requestId.localeCompare(b.requestId));

function activeRequests(state, hubId) {
  return state.chargingRequests.filter(request => request.hubId === hubId && knownStatuses.has(request.status));
}

function queuePosition(state, request) {
  return orderRequests(state.chargingRequests.filter(item => item.hubId === request.hubId && item.status === "Waiting"))
    .findIndex(item => item.requestId === request.requestId) + 1;
}

function scheduleFor(state, hubId, now) {
  let schedule = state.chargingSchedules.find(item => item.hubId === hubId);
  if (!schedule) {
    schedule = { scheduleId: id("charge-schedule"), hubId, periodStart: now, periodEnd: new Date(timestamp(now) + 24 * 60 * 60_000).toISOString(), generatedAt: now, version: 0 };
    state.chargingSchedules.push(schedule);
  }
  return schedule;
}

function updateSchedule(state, hubId, now) {
  const schedule = scheduleFor(state, hubId, now);
  schedule.generatedAt = now;
  schedule.version += 1;
  return schedule;
}

function releaseAllocation(state, request, now) {
  const index = state.chargingAllocations.findIndex(item => item.requestId === request.requestId);
  if (index < 0) return false;
  state.chargingAllocations.splice(index, 1);
  updateSchedule(state, request.hubId, now);
  return true;
}

function pointBusy(state, pointId) {
  return state.chargingAllocations.some(allocation => allocation.pointId === pointId
    && state.chargingRequests.some(request => request.requestId === allocation.requestId && activeCommitments.has(request.status)));
}

function vehicleBusy(state, vehicleId, excludeRequestId = null) {
  return state.chargingRequests.some(request => request.vehicleId === vehicleId && request.requestId !== excludeRequestId
    && activeCommitments.has(request.status));
}

function vehicleHasOpenRequest(state, vehicleId) {
  return state.chargingRequests.some(request => request.vehicleId === vehicleId && !terminalStatuses.has(request.status));
}

export function chargingVehicleType(record) {
  return record?.chargingVehicleType === "CAR" ? "CAR" : "MOTORCYCLE";
}

function eligiblePoints(state, request) {
  return state.chargingPoints.filter(point => point.hubId === request.hubId && point.status === "Operational"
    && chargingVehicleType(point) === chargingVehicleType(request)
    && !point.reconciliationHold && (point.activeRestrictionIds || []).length === 0 && !pointBusy(state, point.pointId));
}

function estimateEnergy(currentBatteryPercent, targetBatteryPercent) {
  return Math.round((targetBatteryPercent - currentBatteryPercent) * batteryCapacityKwh) / 100;
}

function estimateMinutes(energyKwh, point) {
  return Math.ceil(energyKwh / (point?.ratedPowerKw || 7) * 60);
}

function notifyStudent(state, request, message, now) {
  state.notifications ??= [];
  state.notifications.push({ notificationId: id("charging-notice"), userId: request.studentId, requestId: request.requestId, message, createdAt: now, read: false });
}

function assign(state, request, point, now) {
  const schedule = scheduleFor(state, request.hubId, now);
  const energy = request.estimatedEnergyKwh ?? estimateEnergy(request.currentBatteryPercent, request.targetBatteryPercent);
  const allocation = {
    allocationId: id("charge-allocation"), scheduleId: schedule.scheduleId, requestId: request.requestId,
    pointId: point.pointId, startTime: now, endTime: request.requestedEnd
  };
  state.chargingAllocations.push(allocation);
  request.status = "Scheduled";
  request.scheduledAt = now;
  request.estimatedEnergyKwh = energy;
  request.estimatedDurationMinutes = estimateMinutes(energy, point);
  updateSchedule(state, request.hubId, now);
  notifyStudent(state, request, `Charging point ${point.pointId} assigned. Please connect within 15 minutes.`, now);
  return allocation;
}

function promoteWaiting(state, hubId, now) {
  const nowMs = timestamp(now);
  let changed = false;
  for (const request of orderRequests(state.chargingRequests.filter(item => item.hubId === hubId && item.status === "Waiting"))) {
    if (timestamp(request.requestedEnd) <= nowMs) {
      request.status = "Expired";
      request.expiredAt = now;
      notifyStudent(state, request, "Your charging request expired because its requested time window ended.", now);
      changed = true;
      continue;
    }
    if (timestamp(request.requestedStart) > nowMs || vehicleBusy(state, request.vehicleId, request.requestId)) continue;
    const point = eligiblePoints(state, request)[0];
    if (!point) continue;
    assign(state, request, point, now);
    changed = true;
  }
  return changed;
}

export function reconcileCharging(store, hubId = null) {
  const snapshot = store.readSnapshot();
  const hubIds = hubId ? [hubId] : [...new Set(snapshot.chargingRequests.map(item => item.hubId))];
  let result = ok(null);
  for (const currentHubId of hubIds) {
    result = store.commit({
      operation: "charging.reconcile",
      input: { hubId: currentHubId, now: store.readSnapshot().demoTime },
      apply(state, { now }) {
        let changed = false;
        const nowMs = timestamp(now);
        for (const request of state.chargingRequests.filter(item => item.hubId === currentHubId)) {
          if (request.status === "Waiting" && timestamp(request.requestedEnd) <= nowMs) {
            request.status = "Expired";
            request.expiredAt = now;
            notifyStudent(state, request, "Your charging request expired because its requested time window ended.", now);
            changed = true;
          } else if (request.status === "Scheduled") {
            const allocation = state.chargingAllocations.find(item => item.requestId === request.requestId);
            if (allocation && nowMs >= timestamp(allocation.startTime) + 15 * 60_000) {
              request.status = "Cancelled";
              request.cancelledAt = now;
              request.cancelReason = "START_TIMEOUT";
              releaseAllocation(state, request, now);
              notifyStudent(state, request, "The charging request was cancelled because charging did not start within 15 minutes.", now);
              changed = true;
            }
          }
        }
        if (promoteWaiting(state, currentHubId, now)) changed = true;
        return changed ? ok(null) : fail("NO_CHANGE", "Charging state is already current.");
      }
    });
    if (!result.ok && result.code !== "NO_CHANGE") return result;
  }
  return ok(null);
}

export function getChargingOverview(store, hubId) {
  const state = store.readSnapshot();
  const hub = state.hubs.find(item => item.id === hubId);
  if (!hub) return fail("HUB_NOT_FOUND", "The selected Hub is not available.");
  const points = state.chargingPoints.filter(item => item.hubId === hubId);
  if (!points.length) return fail("CHARGING_DATA_UNAVAILABLE", "Charging point data is unavailable for this Hub.");
  const requests = orderRequests(activeRequests(state, hubId));
  const allocations = state.chargingAllocations.filter(item => item.scheduleId === state.chargingSchedules.find(schedule => schedule.hubId === hubId)?.scheduleId);
  const schedule = state.chargingSchedules.find(item => item.hubId === hubId) || null;
  const waiting = orderRequests(requests.filter(item => item.status === "Waiting")).map(request => ({ ...request, queuePosition: queuePosition(state, request), full: timestamp(request.requestedStart) <= timestamp(state.demoTime) }));
  return ok({ hub, points, requests, waiting, allocations, schedule, currentTime: state.demoTime });
}

export function submitChargingRequest(store, draft, { actorId, commandId } = {}) {
  if (!draft || typeof draft !== "object") return fail("INVALID_REQUEST", "Enter a valid charging request.");
  const input = { ...draft };
  return store.commit({
    operation: "charging.submitRequest", callerId: actorId, commandId,
    input,
    apply(state, { now }) {
      const hub = state.hubs.find(item => item.id === draft.hubId);
      const points = state.chargingPoints.filter(item => item.hubId === draft.hubId);
      if (!hub || !points.length) return fail("CHARGING_DATA_UNAVAILABLE", "Charging point data is unavailable. Please try again later.");
      if (!draft.vehicleId || !draft.studentId || !Number.isFinite(draft.currentBatteryPercent) || !Number.isFinite(draft.targetBatteryPercent)
        || draft.currentBatteryPercent < 0 || draft.currentBatteryPercent > 100 || draft.targetBatteryPercent < 0 || draft.targetBatteryPercent > 100
        || !Number.isFinite(timestamp(draft.requestedStart)) || !Number.isFinite(timestamp(draft.requestedEnd))
        || timestamp(draft.requestedStart) >= timestamp(draft.requestedEnd) || timestamp(draft.requestedEnd) <= timestamp(now)) {
        return fail("INVALID_REQUEST", "Check the battery levels and requested charging time.");
      }
      if (draft.targetBatteryPercent <= draft.currentBatteryPercent) return fail("NO_CHARGING_REQUIRED", "The target battery level has already been reached.");
      if (draft.parkingReservationId) {
        const parking = state.parkingReservations.find(item => item.reservationId === draft.parkingReservationId);
        if (!parking || parking.studentId !== draft.studentId || parking.hubId !== draft.hubId || parking.vehicleId !== draft.vehicleId
          || !["Confirmed", "Checked In"].includes(parking.status)
          || timestamp(draft.requestedStart) < timestamp(parking.arrivalTime)
          || timestamp(draft.requestedEnd) > timestamp(parking.departureTime)) {
          return fail("PARKING_NOT_ELIGIBLE", "A valid parking reservation for this vehicle and Hub is required.");
        }
      }
      if (vehicleHasOpenRequest(state, draft.vehicleId)) return fail("VEHICLE_HAS_CHARGING_REQUEST", "This vehicle already has an active or waiting charging request.");

      const requestId = id("charge-request");
      const vehicle = state.privateVehicles.find(item => item.vehicleId === draft.vehicleId)
        ?? state.vehicles.find(item => item.vehicleId === draft.vehicleId);
      const request = {
        requestId, studentId: draft.studentId, hubId: draft.hubId, vehicleId: draft.vehicleId,
        chargingVehicleType: chargingVehicleType(vehicle),
        ...(draft.parkingReservationId ? { parkingReservationId: draft.parkingReservationId } : {}),
        ...(draft.parkingSessionId ? { parkingSessionId: draft.parkingSessionId } : {}),
        submittedAt: now, currentBatteryPercent: draft.currentBatteryPercent, targetBatteryPercent: draft.targetBatteryPercent,
        requestedStart: new Date(timestamp(draft.requestedStart)).toISOString(), requestedEnd: new Date(timestamp(draft.requestedEnd)).toISOString(),
        estimatedEnergyKwh: estimateEnergy(draft.currentBatteryPercent, draft.targetBatteryPercent),
        estimatedDurationMinutes: estimateMinutes(estimateEnergy(draft.currentBatteryPercent, draft.targetBatteryPercent)), status: "Waiting"
      };
      state.chargingRequests.push(request);
      promoteWaiting(state, draft.hubId, now);
      const position = request.status === "Waiting" ? queuePosition(state, request) : null;
      if (request.status === "Waiting" && timestamp(request.requestedStart) <= timestamp(now)) {
        notifyStudent(state, request, `No compatible charging point is available. You are #${position} on the waitlist.`, now);
      } else if (request.status === "Waiting") {
        notifyStudent(state, request, `Your request is recorded for ${request.requestedStart}. No charging point is reserved yet.`, now);
      }
      const allocation = state.chargingAllocations.find(item => item.requestId === requestId) || null;
      return ok({ requestId, status: request.status, allocationId: allocation?.allocationId || null, queuePosition: position,
        reason: request.status === "Waiting" ? (timestamp(request.requestedStart) > timestamp(now) ? "FutureStart" : "Full") : null,
        estimatedEnergyKwh: request.estimatedEnergyKwh, estimatedDurationMinutes: request.estimatedDurationMinutes, request });
    }
  });
}

export function generateChargingSchedule(store, hubId) {
  const result = reconcileCharging(store, hubId);
  if (!result.ok) return result;
  const state = store.readSnapshot();
  const schedule = state.chargingSchedules.find(item => item.hubId === hubId);
  return schedule ? ok(schedule) : fail("SCHEDULE_UNAVAILABLE", "No charging schedule exists for this Hub yet.");
}

export function cancelChargingRequest(store, requestId, actorId, commandId) {
  return store.commit({ operation: "charging.cancelRequest", callerId: actorId, commandId, input: { requestId }, apply(state, { now }) {
    const request = state.chargingRequests.find(item => item.requestId === requestId);
    if (!request) return fail("REQUEST_NOT_FOUND", "Charging request not found.");
    if (request.studentId !== actorId) return fail("NOT_REQUEST_OWNER", "Only the request owner can cancel this request.");
    if (!new Set(["Waiting", "Scheduled"]).has(request.status)) return fail("REQUEST_CANNOT_BE_CANCELLED", "This request can no longer be cancelled here.");
    request.status = "Cancelled";
    request.cancelledAt = now;
    releaseAllocation(state, request, now);
    promoteWaiting(state, request.hubId, now);
    return ok(request);
  }});
}

export function adjustChargingAllocation(store, allocationId, pointId, expectedVersion, operatorId, commandId) {
  return store.commit({ operation: "charging.adjustAllocation", callerId: operatorId, commandId,
    input: { allocationId, pointId, expectedVersion }, apply(state, { now }) {
      const allocation = state.chargingAllocations.find(item => item.allocationId === allocationId);
      const request = allocation && state.chargingRequests.find(item => item.requestId === allocation.requestId);
      if (!allocation || !request) return fail("ALLOCATION_NOT_FOUND", "The charging allocation is no longer available.");
      const schedule = state.chargingSchedules.find(item => item.scheduleId === allocation.scheduleId);
      if (!schedule || schedule.version !== expectedVersion) return fail("STALE_SCHEDULE", "The schedule changed. Refresh before adjusting it.");
      if (request.status !== "Scheduled") return fail("REQUEST_NOT_ADJUSTABLE", "Only a scheduled request can be adjusted.");
      if (timestamp(allocation.startTime) > timestamp(now)) return fail("FUTURE_ALLOCATION", "Future charging points are not reserved in this demo.");
      const point = state.chargingPoints.find(item => item.pointId === pointId && item.hubId === request.hubId);
      if (!point || point.status !== "Operational" || point.reconciliationHold || point.activeRestrictionIds?.length) return fail("POINT_UNAVAILABLE", "Choose an operational charging point without restrictions.");
      if (chargingVehicleType(point) !== chargingVehicleType(request)) return fail("INCOMPATIBLE_POINT", "Choose a point for this vehicle type.");
      if (point.pointId !== allocation.pointId && pointBusy(state, point.pointId)) return fail("POINT_OCCUPIED", "That charging point is already occupied or assigned.");
      const earlier = orderRequests(state.chargingRequests.filter(item => item.hubId === request.hubId && item.status === "Waiting"
        && chargingVehicleType(item) === chargingVehicleType(request)
        && timestamp(item.requestedStart) <= timestamp(now) && timestamp(now) < timestamp(item.requestedEnd)));
      if (earlier.length && orderRequests([...earlier, request])[0].requestId !== request.requestId) return fail("FCFS_PRIORITY", "An earlier eligible request is waiting for this Hub.");
      if (vehicleBusy(state, request.vehicleId, request.requestId)) return fail("VEHICLE_BUSY", "This vehicle has another active charging commitment.");
      allocation.pointId = point.pointId;
      updateSchedule(state, request.hubId, now);
      return ok({ ...allocation, scheduleVersion: state.chargingSchedules.find(item => item.scheduleId === allocation.scheduleId).version });
    }});
}

export function recordChargingEvent(store, event, operatorId, commandId) {
  return store.commit({ operation: "charging.recordEvent", callerId: operatorId, commandId, input: event, apply(state, { now }) {
    if (!event?.eventId || state.telemetryEvents.some(item => item.eventId === event.eventId)) {
      const previous = state.telemetryEvents.find(item => item.eventId === event?.eventId);
      return previous ? ok(previous.result ?? null) : fail("INVALID_EVENT", "A unique event ID is required.");
    }
    const request = state.chargingRequests.find(item => item.requestId === event.requestId);
    const allocation = state.chargingAllocations.find(item => item.requestId === event.requestId);
    const point = allocation && state.chargingPoints.find(item => item.pointId === allocation.pointId);
    const observedAt = event.observedAt || now;
    if (!Number.isFinite(timestamp(observedAt)) || timestamp(observedAt) > timestamp(now)) return fail("INVALID_EVENT_TIME", "The charging event time is invalid or in the future.");
    if (!request || !allocation || !point || request.vehicleId !== event.vehicleId || allocation.pointId !== event.pointId) {
      if (point) point.reconciliationHold = true;
      const invalid = { eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: event.requestId, receivedAt: now, status: "RECONCILIATION_REQUIRED" };
      state.telemetryEvents.push(invalid);
      return ok({ status: "RECONCILIATION_REQUIRED", requestId: event.requestId, message: "The event does not match the current request, vehicle and point." });
    }
    if (timestamp(observedAt) < timestamp(allocation.startTime)
      || (request.startedAt && timestamp(observedAt) < timestamp(request.startedAt))) {
      point.reconciliationHold = true;
      state.telemetryEvents.push({ eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: request.requestId, receivedAt: now, status: "RECONCILIATION_REQUIRED" });
      return ok({ status: "RECONCILIATION_REQUIRED", requestId: request.requestId, message: "The event time predates the current charging commitment." });
    }
    if (event.sessionId && request.activeSessionId && event.sessionId !== request.activeSessionId) {
      point.reconciliationHold = true;
      state.telemetryEvents.push({ eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: request.requestId, receivedAt: now, status: "RECONCILIATION_REQUIRED" });
      return ok({ status: "RECONCILIATION_REQUIRED", requestId: request.requestId, message: "The session ID does not match the active charging session." });
    }
    let result;
    if (event.kind === "START" && request.status === "Scheduled") {
      if (point.status !== "Operational" || point.reconciliationHold || point.activeRestrictionIds?.length) return fail("POINT_UNAVAILABLE", "This charging point is restricted and cannot start a session.");
      if (event.sessionId && state.chargingSessions.some(item => item.sessionId === event.sessionId)) return fail("SESSION_ID_IN_USE", "This session ID is already used.");
      if (request.parkingReservationId) {
        const reservation = state.parkingReservations.find(item => item.reservationId === request.parkingReservationId);
        const activeParking = state.parkingSessions.some(item => item.reservationId === request.parkingReservationId && item.status === "Active");
        if (!reservation || reservation.status !== "Checked In" || !activeParking) return fail("PARKING_NOT_ACTIVE", "The Student must check in to parking before charging can start.");
      }
      request.status = "Charging";
      request.activeSessionId ??= event.sessionId || id("charge-session");
      request.startedAt = observedAt;
      state.chargingSessions.push({ sessionId: request.activeSessionId, requestId: request.requestId, vehicleId: request.vehicleId, pointId: point.pointId, startedAt: request.startedAt, lastEventAt: observedAt, endedAt: null });
      result = ok(request);
    } else if (["SUSPEND", "RESUME"].includes(event.kind) && ["Charging", "Suspended"].includes(request.status)) {
      request.status = event.kind === "SUSPEND" ? "Suspended" : "Charging";
      const session = state.chargingSessions.find(item => item.sessionId === request.activeSessionId);
      if (session) session.lastEventAt = observedAt;
      result = ok(request);
    } else if (["STOP", "TARGET_REACHED"].includes(event.kind) && ["Charging", "Suspended"].includes(request.status)) {
      const targetReached = event.kind === "TARGET_REACHED" || event.batteryPercent >= request.targetBatteryPercent;
      if (event.kind === "TARGET_REACHED" && (!Number.isFinite(event.batteryPercent) || event.batteryPercent < request.targetBatteryPercent)) {
        point.reconciliationHold = true;
        state.telemetryEvents.push({ eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: request.requestId, receivedAt: now, status: "RECONCILIATION_REQUIRED" });
        return ok({ status: "RECONCILIATION_REQUIRED", requestId: request.requestId, message: "Target-reached event has no valid battery reading at or above the target." });
      }
      if (event.kind === "STOP" && !["COMPLETE", "CANCEL"].includes(event.stopChoice)) return fail("STOP_CHOICE_REQUIRED", "Confirm whether the Student completed or cancelled charging.");
      request.status = targetReached || event.stopChoice === "COMPLETE" ? "Completed" : "Cancelled";
      request.endedAt = observedAt;
      if (Number.isFinite(event.batteryPercent)) request.finalBatteryPercent = event.batteryPercent;
      if (Number.isFinite(event.batteryPercent)) {
        const vehicle = state.privateVehicles.find(item => item.vehicleId === request.vehicleId) || state.vehicles.find(item => item.vehicleId === request.vehicleId);
        if (vehicle) {
          if (Object.hasOwn(vehicle, "batteryLevel")) vehicle.batteryLevel = event.batteryPercent;
          if (Object.hasOwn(vehicle, "batteryPercent")) vehicle.batteryPercent = event.batteryPercent;
        }
      }
      const session = state.chargingSessions.find(item => item.sessionId === request.activeSessionId);
      if (session) { session.lastEventAt = observedAt; session.endedAt = request.endedAt; }
      releaseAllocation(state, request, now);
      promoteWaiting(state, request.hubId, now);
      result = ok(request);
    } else {
      point.reconciliationHold = true;
      state.telemetryEvents.push({ eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: request.requestId, receivedAt: now, status: "RECONCILIATION_REQUIRED" });
      return ok({ status: "RECONCILIATION_REQUIRED", requestId: request.requestId, message: "This event does not match the request's current charging state." });
    }
    state.telemetryEvents.push({ eventId: event.eventId, source: "ChargingDemo", kind: event.kind, requestId: request.requestId, observedAt, status: "APPLIED", result: request });
    return result;
  }});
}

export function recordChargingPointObservation(store, { pointId, status, observedAt, eventId }, callerId, commandId) {
  return store.commit({ operation: "charging.recordPointObservation", callerId, commandId, input: { pointId, status, observedAt, eventId }, apply(state, { now }) {
    const point = state.chargingPoints.find(item => item.pointId === pointId);
    if (!point) return fail("POINT_NOT_FOUND", "The charging point does not exist.");
    if (!eventId || state.telemetryEvents.some(item => item.eventId === eventId)) return fail("DUPLICATE_EVENT", "This telemetry event has already been received.");
    if (!["Operational", "Maintenance", "Faulty", "Unknown"].includes(status) || !Number.isFinite(timestamp(observedAt)) || timestamp(observedAt) > timestamp(now)) {
      return fail("INVALID_OBSERVATION", "The charging point observation is invalid or from the future.");
    }
    if (timestamp(observedAt) < timestamp(point.statusObservedAt)) return fail("STALE_OBSERVATION", "A newer charging point status is already recorded.");
    point.status = status;
    point.statusObservedAt = observedAt;
    state.telemetryEvents.push({ eventId, source: "FleetTelemetry", kind: "POINT_STATUS", pointId, observedAt, receivedAt: now, status: "APPLIED" });
    if (status === "Operational") promoteWaiting(state, point.hubId, now);
    return ok(point);
  }});
}

export function setChargingPointRestriction(store, { pointId, incidentId, active }, callerId, commandId) {
  return store.commit({ operation: "charging.setPointRestriction", callerId, commandId, input: { pointId, incidentId, active }, apply(state, { now }) {
    const point = state.chargingPoints.find(item => item.pointId === pointId);
    if (!point || !incidentId || typeof active !== "boolean") return fail("INVALID_RESTRICTION", "Provide a charging point, incident ID and restriction state.");
    point.activeRestrictionIds ??= [];
    point.activeRestrictionIds = active
      ? [...new Set([...point.activeRestrictionIds, incidentId])]
      : point.activeRestrictionIds.filter(id => id !== incidentId);
    if (!active) promoteWaiting(state, point.hubId, now);
    return ok(point);
  }});
}

export function getChargingSnapshot(store) {
  const state = store.readSnapshot();
  const points = structuredClone(state.chargingPoints);
  const requests = structuredClone(state.chargingRequests);
  const allocations = structuredClone(state.chargingAllocations);
  const scheduleVersions = state.chargingSchedules.map(schedule => ({ hubId: schedule.hubId, version: schedule.version }));
  const snapshot = { revision: state.revision, capturedAt: state.demoTime, points, requests, allocations, scheduleVersions };
  const freeze = value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) freeze(child);
    }
    return value;
  };
  return ok(freeze(snapshot));
}

export function cancelLinkedChargingDraft(state, parkingReservationId, now, reason = "PARKING_CANCELLED") {
  const affected = state.chargingRequests.filter(request => request.parkingReservationId === parkingReservationId && ["Waiting", "Scheduled"].includes(request.status));
  for (const request of affected) {
    request.status = "Cancelled";
    request.cancelledAt = now;
    request.cancelReason = reason;
    releaseAllocation(state, request, now);
    notifyStudent(state, request, "The linked parking booking ended, so the charging request was cancelled.", now);
  }
  for (const hubId of new Set(affected.map(request => request.hubId))) promoteWaiting(state, hubId, now);
  return affected.map(request => request.requestId);
}

export function studentChargingRows(store, studentId) {
  const state = store.readSnapshot();
  return state.chargingRequests.filter(item => item.studentId === studentId).map(request => ({
    ...request, queuePosition: request.status === "Waiting" ? queuePosition(state, request) : null,
    full: request.status === "Waiting" && timestamp(request.requestedStart) <= timestamp(state.demoTime),
    allocation: state.chargingAllocations.find(item => item.requestId === request.requestId) || null,
    point: (() => { const allocation = state.chargingAllocations.find(item => item.requestId === request.requestId); return state.chargingPoints.find(item => item.pointId === allocation?.pointId) || null; })()
  })).sort((a, b) => timestamp(b.submittedAt) - timestamp(a.submittedAt));
}
