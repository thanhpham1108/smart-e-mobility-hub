const messages = {
  STALE_TRANSFER_REVIEW: "The fleet changed after your review. Check feasibility again.",
  TRANSFER_NOT_FEASIBLE: "The selected vehicles or destination are no longer available. Review the transfer again.",
  STALE_ORDER: "This order was updated elsewhere. The latest version is shown; review it before retrying.",
  STALE_INCIDENT: "This incident was updated elsewhere. Review its latest evidence before retrying.",
  REVALIDATE_ORDER_FIRST: "Resolve the risk and revalidate this order before confirming arrival.",
  STALE_OBSERVATION: "Use a newer observation within the last 15 demo minutes, no later than the demo clock.",
  STALE_OR_UNKNOWN_VEHICLE: "The vehicle is unknown or this observation predates its latest update.",
  STALE_OR_UNKNOWN_POINT: "The point is unknown or this observation predates its latest update.",
  EVENT_CONFLICT: "This event ID already belongs to different data. Use a new ID for a new observation.",
  RECOVERY_NOT_VERIFIED: "Record completed repair evidence and verify recovery before resolving.",
  POINT_NOT_RECOVERED: "Verify an Operational point observation and resolve any charging reconciliation hold first.",
  PARKING_RECONCILIATION_REQUIRED: "Parking observations disagree with the ledger. Verify occupancy before admitting more vehicles.",
  DISPOSITION_REQUIRED: "Confirm the remaining vehicles have returned to their source before cancelling.",
  SOURCE_PARKING_FULL: "The source cannot receive all remaining vehicles. Verify its parking capacity before cancelling.",
  DISPOSITION_CONFLICT: "A remaining vehicle is recorded at another occupied location. Reconcile its physical disposition first.",
  TRANSFER_ALREADY_DISPATCHED: "Dispatched vehicles must be reconciled before cancelling the outstanding transfer."
};

export const isTransferOpen = order => !["Completed", "Cancelled"].includes(order.status);
export const isIncidentOpen = ticket => !["Resolved", "Closed"].includes(ticket.status);
export const vehicleEligible = vehicle => vehicle.status === "AVAILABLE" && vehicle.condition === "OPERATIONAL" && !vehicle.chargingCommitted;
export const outstanding = order => order.vehicles.filter(vehicle => !vehicle.arrivedAt);

export function operationalAlerts(state) {
  const alerts = [];
  const policy = state.policy ?? { lowVehicleThreshold: 2, capacityWarningPercent: 85 };
  for (const hub of state.hubs) {
    if (hub.status && hub.status !== "Operational") alerts.push({ kind: "danger", title: "Hub unavailable", detail: `Hub status: ${hub.status}. Choose an operational destination.`, hubId: hub.id });
    if (hub.parkingDiscrepancy) alerts.push({ kind: "danger", title: "Occupancy needs verification", detail: hub.parkingDiscrepancy, hubId: hub.id });
    if (hub.freshness !== "Live") {
      alerts.push({ kind: "warning", title: "Stale observations", detail: "Refresh resource observations before relying on these counts.", hubId: hub.id });
      continue;
    }
    if (hub.vehiclesFree < policy.lowVehicleThreshold) alerts.push({ kind: "warning", title: "Vehicle shortage", detail: `${hub.vehiclesFree} shared vehicles available.`, hubId: hub.id });
    if (hub.parkingTotal && (hub.parkingTotal - hub.parkingFree) / hub.parkingTotal * 100 >= policy.capacityWarningPercent)
      alerts.push({ kind: "warning", title: "Parking near capacity", detail: `${hub.parkingTotal - hub.parkingFree} of ${hub.parkingTotal} spaces occupied.`, hubId: hub.id });
  }
  for (const order of state.orders ?? []) if (order.status === "AtRisk") alerts.push({ kind: "danger", title: "Transfer at risk", detail: order.riskReason, hubId: order.sourceHubId });
  for (const ticket of state.incidents ?? []) if (isIncidentOpen(ticket)) alerts.push({ kind: "danger", title: `${ticket.severity} priority incident`, detail: ticket.description,
    hubId: state.vehicles.find(v => v.vehicleId === ticket.vehicleId)?.currentHubId ?? state.points.find(p => p.pointId === ticket.pointId)?.hubId });
  return alerts;
}

export function fleetService(api, store) {
  return {
    review: draft => api.read("fleet.validate", draft),
    async command(operation, input) {
      const result = await api.command(operation, input);
      // Conflicts also refresh the screen, without automatically repeating a mutation.
      await store.refresh();
      return result.ok ? result : { ...result, message: messages[result.code] ?? result.message };
    }
  };
}
