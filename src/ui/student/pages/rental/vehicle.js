import { actionForm, e, panel, timeLabel } from "../../../shared/records.js";
import { bookable, facts, heading, hubName, missing, vehicleStatus, vehicleType } from "./components.js";

export function vehicleDetails({ hubs, vehicles }, id) {
  const vehicle = vehicles.find(row => row.vehicleId === id);
  if (!vehicle) return missing("Vehicle unavailable", "This vehicle could not be found.");
  const available = bookable(vehicle, hubs);
  return heading(vehicle.name, "Review the vehicle before placing a reservation.", "catalog") + `
    <div class="rental-layout">
      ${panel("Vehicle details", vehicleStatus(vehicle, hubs) + facts([
        ["Vehicle ID", vehicle.vehicleId], ["Type", vehicleType(vehicle.vehicleType)],
        ["Battery", vehicle.batteryLevel + "%"], ["Pickup Hub", hubName(hubs, vehicle.currentHubId)],
        ["Parking slot", vehicle.parkingSpaceId ?? "Unavailable"],
        ["Condition", vehicle.condition === "OPERATIONAL" ? "Operational" : "Faulted"],
        ["Last updated", timeLabel(vehicle.lastUpdated)]
      ]))}
      ${panel("Reserve this vehicle", available
        ? "<p>Confirm to hold this vehicle for pickup for 15 minutes.</p>" +
          actionForm("rental.reserve", `<input type="hidden" name="vehicleId" value="${e(id)}">`, "Confirm reservation")
        : "<p>This vehicle cannot be reserved right now. Check the catalog for another vehicle.</p>")}
    </div>`;
}
