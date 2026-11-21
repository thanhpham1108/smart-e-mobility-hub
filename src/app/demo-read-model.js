// Counts for the reference screens. Owner services enforce booking and allocation eligibility.
export function demoHubRows(state) {
  const occupiedSpaceIds = new Set([
    ...state.vehicles.map(vehicle => vehicle.parkingSpaceId),
    ...state.parkingSessions.filter(session => session.status === "Active").map(session => session.parkingSpaceId)
  ]);

  return state.hubs.map(hub => {
    const spaces = state.parkingSpaces.filter(space => space.hubId === hub.id && space.inService);
    return {
      ...hub,
      parkingTotal: spaces.length,
      parkingFree: spaces.filter(space => !occupiedSpaceIds.has(space.spaceId)).length,
      vehiclesFree: state.vehicles.filter(vehicle => vehicle.currentHubId === hub.id
        && vehicle.status === "AVAILABLE" && vehicle.condition === "OPERATIONAL").length,
      chargingTotal: state.chargingPoints.filter(point => point.hubId === hub.id).length,
      chargingActive: state.chargingRequests.filter(request => request.hubId === hub.id && request.status === "Charging").length
    };
  });
}
