const serviceTests = {
  bikes: hub => hub.vehicleBatteries?.some(vehicle => vehicle.vehicleType === "ELECTRIC_BICYCLE"),
  scooters: hub => hub.vehicleBatteries?.some(vehicle => vehicle.vehicleType === "ELECTRIC_MOTORCYCLE"),
  cars: hub => hub.vehicleBatteries?.some(vehicle => vehicle.vehicleType === "CAR"),
  parking: hub => (hub.parkingAdmissionFree ?? hub.parkingFree) > 0 && !hub.parkingDiscrepancy,
  charging: hub => hub.chargingFree > 0
};

export function hasCoordinates(location) {
  return Number.isFinite(location?.latitude) && Math.abs(location.latitude) <= 90
    && Number.isFinite(location?.longitude) && Math.abs(location.longitude) <= 180;
}

export function distanceKm(from, to) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) return null;
  const radians = Math.PI / 180;
  const lat = (to.latitude - from.latitude) * radians;
  const lon = (to.longitude - from.longitude) * radians;
  const a = Math.sin(lat / 2) ** 2 + Math.cos(from.latitude * radians)
    * Math.cos(to.latitude * radians) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function searchText(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("đ", "d");
}

export function findHubs(hubs, { query = "", origin, radiusKm, services = [] } = {}) {
  const text = searchText(query.trim());
  return hubs.map(hub => ({ ...hub, distance: distanceKm(origin, hub) }))
    .filter(hub => {
      const matchesText = searchText([hub.name, hub.area, hub.address, hub.id].join(" ")).includes(text);
      const matchesRadius = !radiusKm || (hub.distance !== null && hub.distance <= radiusKm);
      const matchesServices = !services.length || (hub.status === "Operational" && hub.freshness === "Live"
        && services.every(service => serviceTests[service]?.(hub)));
      return matchesText && matchesRadius && matchesServices;
    })
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name));
}

export function getHubStatus(hubs, hubId) {
  return hubs.find(hub => hub.id === hubId) ?? null;
}

export function findAlternativeHubs(hubs, excludedHubId, qualifies) {
  const origin = getHubStatus(hubs, excludedHubId);
  return findHubs(hubs, { origin }).filter(hub =>
    hub.id !== excludedHubId && hub.status === "Operational" && qualifies(hub));
}
