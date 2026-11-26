import { actionForm, button, e, input, panel, timeLabel } from "../../../shared/records.js";
import { facts, heading, hubMapLink, hubName, link, missing, rentalUrl, statusBadge } from "./components.js";

export function reservation({ demoTime, hubs, reservations, trips, vehicles }, id) {
  const record = reservations.find(row => row.reservationId === id);
  if (!record) return missing("Reservation unavailable", "This reservation could not be found in your rentals.");
  const vehicle = vehicles.find(row => row.vehicleId === record.vehicleId);
  const trip = trips.find(row => row.reservationId === id);
  const seconds = Math.max(0, Math.ceil((Date.parse(record.expiresAt) - Date.parse(demoTime)) / 1000));
  const status = record.status === "CONFIRMED" && seconds === 0 ? "EXPIRED" : record.status;
  const confirmed = status === "CONFIRMED";
  const canPickup = confirmed && vehicle?.status === "RESERVED" && vehicle.condition === "OPERATIONAL";
  const pickupHub = hubs.find(hub => hub.id === vehicle?.currentHubId);
  const remaining = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  return heading("Reservation & pickup", "Pick up your vehicle before the reservation expires.") + `
    <div class="rental-layout">
      <div class="rental-stack">
        ${panel("Reservation hold time", `<div class="rental-hold">
          ${statusBadge(status)}
          ${confirmed ? `<p><strong>${remaining}</strong> remaining on the demo clock</p>
            <progress aria-label="Reservation hold remaining" max="900" value="${Math.min(900, seconds)}"></progress>` : ""}
          <p>Pickup deadline <strong>${e(timeLabel(record.expiresAt))}</strong></p>
        </div>`)}
        ${panel("Reserved vehicle", facts([
          ["Vehicle", vehicle?.name ?? record.vehicleId], ["Vehicle ID", record.vehicleId],
          ["Battery", vehicle ? vehicle.batteryLevel + "%" : "Unavailable"],
          ["Pickup Hub", trip || confirmed ? hubName(hubs, trip?.startHubId ?? vehicle?.currentHubId) : "—"],
          ["Parking slot", confirmed ? vehicle?.parkingSpaceId ?? "Unavailable" : "—"],
          ["Reservation code", record.reservationId]
        ]))}
      </div>
      <aside class="rental-stack">
        ${confirmed && pickupHub ? panel("Pickup location",
          `<p><strong>${e(pickupHub.name)}</strong></p><p class="records-meta">${e(pickupHub.area)}</p>` +
          hubMapLink(pickupHub)) : ""}
        ${panel("Pickup actions", (canPickup
        ? "<p>Enter the vehicle ID to simulate identifying and unlocking the vehicle at the Hub.</p>" +
          actionForm("rental.pickup", `<input type="hidden" name="reservationId" value="${e(id)}">` +
            input("vehicleId", "Vehicle ID", 'required autocomplete="off"'), "Pick up vehicle")
        : confirmed ? "<p>Pickup is unavailable because the vehicle is restricted or its status changed.</p>" : "") +
        (confirmed ? button("Cancel reservation", "rental.cancel", { reservationId: id }) : "") +
        (trip ? link("View trip", rentalUrl("trips", trip.tripId), true) : "") +
        (!confirmed && !trip ? link("Find another vehicle", rentalUrl()) : ""))}
      </aside>
    </div>`;
}
