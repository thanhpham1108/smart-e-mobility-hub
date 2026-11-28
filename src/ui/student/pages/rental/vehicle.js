import { actionForm, e, panel, timeLabel } from "../../../shared/records.js";
import { vehiclePhoto, vehiclePhotoCredits } from "../../../shared/vehicle-photo.js";
import { findAlternativeHubs } from "../../../../modules/hub-identity/hub-service.js";
import { bookable, facts, heading, hubName, link, missing, rentalUrl, vehicleStatus, vehicleType } from "./components.js";

export function vehicleDetails({ hubs, vehicles }, id, memory) {
  const vehicle = vehicles.find(row => row.vehicleId === id);
  if (!vehicle) return missing("Vehicle unavailable", "This vehicle could not be found.");
  const available = bookable(vehicle, hubs);
  const needsAlternative = !available || memory.reservationUnavailable;
  const criteria = {
    vehicleType: memory.filters.vehicleType || vehicle.vehicleType,
    minBattery: Number(memory.filters.minBattery) || 0
  };
  const alternatives = needsAlternative ? findAlternativeHubs(hubs, vehicle.currentHubId, hub => vehicles.some(other =>
    other.vehicleId !== vehicle.vehicleId && other.currentHubId === hub.id && bookable(other, hubs)
    && other.vehicleType === criteria.vehicleType && other.batteryLevel >= criteria.minBattery)) : [];
  const alternativeLinks = needsAlternative ? (alternatives.length
    ? `<h3>Alternative Hubs</h3><ul class="rental-hubs">${alternatives.map(hub =>
      `<li>${link(hub.name, rentalUrl(null, null, { ...criteria, hubId: hub.id }))}</li>`).join("")}</ul>`
    : '<p class="records-meta">No other Hub has a matching available vehicle. Change your filters to search again.</p>') : "";
  return heading(vehicle.name, "Review the vehicle before placing a reservation.", "catalog") + `
    <div class="rental-layout">
      ${panel("Vehicle details", vehiclePhoto(vehicle, "rental-detail-photo", { describe: true, eager: true })
        + vehicleStatus(vehicle, hubs) + facts([
        ["Vehicle ID", vehicle.vehicleId], ["Type", vehicleType(vehicle.vehicleType)],
        ["Battery", vehicle.batteryLevel + "%"], ["Pickup Hub", hubName(hubs, vehicle.currentHubId)],
        ["Parking slot", vehicle.parkingSpaceId ?? "Unavailable"],
        ["Condition", vehicle.condition === "OPERATIONAL" ? "Operational" : "Faulted"],
        ["Last updated", timeLabel(vehicle.lastUpdated)]
      ]) + (vehicle.photoKey ? vehiclePhotoCredits() : ""))}
      ${panel("Reserve this vehicle", (available
        ? "<p>Confirm to hold this vehicle for pickup for 15 minutes.</p>" +
          actionForm("rental.reserve", `<input type="hidden" name="vehicleId" value="${e(id)}">`, "Confirm reservation")
        : "<p>This vehicle cannot be reserved right now.</p>") + alternativeLinks)}
    </div>`;
}
