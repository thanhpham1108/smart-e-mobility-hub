export function chargingVehicleType(record) {
  return record?.chargingVehicleType === "CAR" ? "CAR" : "MOTORCYCLE";
}

export function chargingWaitReason(request) {
  const names = { VehicleUnavailable: "Vehicle unavailable", HubUnavailable: "Hub unavailable", FutureStart: "Future start", Full: "Full" };
  return names[request.waitingReason] ?? (request.full ? "Full" : "Future start");
}

export function getChargingOverview(store, hubId) {
  const state = store.readSnapshot();
  const hub = state.hubs.find(item => item.id === hubId);
  if (!hub) return { ok: false, code: "HUB_NOT_FOUND", message: "The selected Hub is not available." };
  const points = state.chargingPoints.filter(item => item.hubId === hubId);
  if (!points.length) return { ok: false, code: "CHARGING_DATA_UNAVAILABLE", message: "Charging point data is unavailable for this Hub." };
  const requests = state.chargingRequests.filter(request => request.hubId === hubId);
  const schedule = state.chargingSchedules.find(item => item.hubId === hubId) ?? null;
  const allocations = state.chargingAllocations.filter(item => item.scheduleId === schedule?.scheduleId);
  return { ok: true, data: { hub, points, requests, schedule, allocations,
    waiting: requests.filter(request => request.status === "Waiting"), currentTime: state.demoTime } };
}

export async function chargingCommand(api, store, operation, input, commandId) {
  const result = await api.command(operation, input, commandId);
  if (result.ok) await store.refresh();
  return result;
}

export function studentChargingRows(store, studentId) {
  const state = store.readSnapshot();
  return state.chargingRequests.filter(item => item.studentId === studentId).map(request => {
    const allocation = state.chargingAllocations.find(item => item.requestId === request.requestId) ?? null;
    const point = state.chargingPoints.find(item => item.pointId === allocation?.pointId) ?? null;
    return { ...request, allocation, point };
  });
}
