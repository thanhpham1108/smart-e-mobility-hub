import { badge, pageHeader } from "../../shared/components.js";
import { actionForm, button, e, input, list, mountRecords, options, panel, select, timeLabel } from "../../shared/records.js";

export function mount(root, context) {
  return mountRecords(root, context, ({ hubs, vehicles, reservations, trips }, viewer, memory) => {
    const hubOptions = options(hubs, "id", "name");
    const visible = vehicles.filter(vehicle => vehicle.status === "AVAILABLE" && vehicle.condition === "OPERATIONAL" && !vehicle.chargingCommitted
      && (!memory.hubId || vehicle.currentHubId === memory.hubId) && vehicle.batteryLevel >= (memory.minBattery || 0)
      && (!memory.vehicleType || vehicle.vehicleType === memory.vehicleType));
    const summary = vehicleId => vehicles.find(vehicle => vehicle.vehicleId === vehicleId)?.name ?? vehicleId;
    return `${pageHeader("Student Portal", "Vehicle Rental", "Reserve, pick up and return a shared vehicle.")}
      ${panel("Filter vehicles", actionForm("filter", select("hubId", "Hub", '<option value="">All Hubs</option>' + hubOptions).replace(" required", "")
        + select("vehicleType", "Vehicle type", '<option value="">All types</option><option>ELECTRIC_BICYCLE</option><option>ELECTRIC_MOTORCYCLE</option>').replace(" required","")
        + input("minBattery", "Minimum battery (%)", `type="number" min="0" max="100" value="${e(memory.minBattery ?? 0)}"`), "Apply filters"))}
      ${panel("Available vehicles", list(visible, v => `<article><h3>${e(v.name)}</h3><p>${e(v.currentHubId)} · ${v.batteryLevel}% battery · ${e(v.vehicleType)}</p>
        ${button("Reserve", "rental.reserve", { vehicleId: v.vehicleId })}</article>`, "No vehicles match. Try another Hub or a lower battery filter."))}
      ${panel("My reservations", list(reservations, r => `<article><h3>${e(summary(r.vehicleId))} ${badge(r.status)}</h3><p class="records-meta">Hold ends ${timeLabel(r.expiresAt)}</p>
        ${r.status === "CONFIRMED" ? button("Pick up", "rental.pickup", { reservationId:r.reservationId })
          + button("Cancel", "rental.cancel", { reservationId:r.reservationId }) : ""}</article>`, "No reservations."))}
      ${panel("My trips", list(trips, trip => `<article><h3>${e(summary(trip.vehicleId))} ${badge(trip.status)}</h3>
        <p class="records-meta">${timeLabel(trip.startTime)} · ${e(trip.startHubId)} ${trip.endHubId ? "→ " + e(trip.endHubId) : ""}</p>
        ${trip.status === "ACTIVE" ? actionForm("rental.return", `<input type="hidden" name="tripId" value="${e(trip.tripId)}">`
          + select("hubId","Return Hub",hubOptions), "Return vehicle")
          + actionForm("incident.report", `<input type="hidden" name="vehicleId" value="${e(trip.vehicleId)}">`
            + input("description","Problem",'required maxlength="280"'), "Report problem") : ""}</article>`, "No trips."))}`;
  }, {
    filter(input, { memory }) {
      Object.assign(memory,input);
      return { ok:true, readOnly:true, message:"Vehicle results updated." };
    }
  });
}
