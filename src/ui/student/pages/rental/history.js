import { e, list, panel, timeLabel } from "../../../shared/records.js";
import { heading, hubName, link, rentalUrl, statusBadge } from "./components.js";

export function history({ hubs, reservations, trips, vehicles }) {
  const name = id => vehicles.find(vehicle => vehicle.vehicleId === id)?.name ?? id;
  return heading("My rentals", "Review your reservations and trips.", "catalog") + `
    <div class="rental-layout rental-history">
      ${panel("My reservations", list(reservations, record => `<article>
        <h3>${e(name(record.vehicleId))} ${statusBadge(record.status)}</h3>
        <p class="records-meta">Reserved ${e(timeLabel(record.createdAt))} · Hold ends ${e(timeLabel(record.expiresAt))}</p>
        ${link("View reservation", rentalUrl("reservations", record.reservationId))}
      </article>`, "You have no reservations yet."))}
      ${panel("My trips", list(trips, trip => `<article>
        <h3>${e(name(trip.vehicleId))} ${statusBadge(trip.status)}</h3>
        <p class="records-meta">${e(timeLabel(trip.startTime))} · ${e(hubName(hubs, trip.startHubId))}
           ${trip.endHubId ? " → " + e(hubName(hubs, trip.endHubId)) : ""}</p>
        ${link("View trip", rentalUrl("trips", trip.tripId))}
      </article>`, "Your trips will appear after pickup."))}
    </div>`;
}
