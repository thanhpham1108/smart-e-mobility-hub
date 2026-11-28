import { actionForm, e, field, panel, select, timeLabel } from "../../../shared/records.js";
import { facts, heading, hubName, link, missing, rentalUrl, statusBadge } from "./components.js";
import { hubMap } from "./hub-map.js";

export async function returnOptions({ tripId, hubId }, { api, memory }) {
  memory.returnHubId = hubId;
  const result = await api.read("rental.returnOptions", { tripId, hubId });
  memory.returnOptions = result.ok ? result.data : null;
  return { ...result, readOnly: true, message: result.ok ? "" : result.message };
}

export function trip({ demoTime, hubs, trips, vehicles }, id, memory) {
  const record = trips.find(row => row.tripId === id);
  if (!record) return missing("Trip unavailable", "This trip could not be found in your rentals.");
  const vehicle = vehicles.find(row => row.vehicleId === record.vehicleId);
  const active = record.status === "ACTIVE";
  const minutes = Math.max(0, Math.floor((Date.parse(record.endTime ?? demoTime) - Date.parse(record.startTime)) / 60000));
  const tripId = `<input type="hidden" name="tripId" value="${e(id)}">`;
  const operational = hubs.filter(hub => hub.status === "Operational");
  const returnHub = hubs.find(hub => hub.id === (record.endHubId ?? memory.returnHubId));
  const hubOptions = '<option value="">Select a Hub</option>' + operational.map(hub =>
    `<option value="${e(hub.id)}"${hub.id === memory.returnHubId ? " selected" : ""}>${e(hub.name)}</option>`).join("");
  const spaces = memory.returnOptions?.spaces ?? [];
  const spaceOptions = '<option value="">Select a parking slot</option>' +
    spaces.map(space => `<option value="${e(space.spaceId)}">${e(space.spaceId)}</option>`).join("");
  const returnForm = actionForm("rental.returnOptions", tripId + select("hubId", "Return Hub", hubOptions), "Check parking slots") +
    (spaces.length ? actionForm("rental.return", tripId + select("parkingSpaceId",
      "Parking slot at " + hubName(hubs, memory.returnOptions.hubId), spaceOptions), "Complete return")
      : memory.returnOptions ? "<p>No return slots are available at this Hub. Choose another Hub.</p>" : "");
  const report = actionForm("incident.report", tripId + `<input type="hidden" name="vehicleId" value="${e(record.vehicleId)}">` +
    field("description", "Describe the problem", `<textarea name="{{name}}" rows="3" required maxlength="1000">${e(memory.problemDescription)}</textarea>`), "Submit report");
  return heading(active ? "Active trip & return" : "Trip complete",
    active ? "Select an available Hub and parking slot to return your vehicle." : "Review your completed rental.") + `
    <div class="rental-layout">
      <div class="rental-stack">
        ${panel(vehicle?.name ?? record.vehicleId, statusBadge(record.status) + facts([
          ["Vehicle ID", record.vehicleId], ["Pickup Hub", hubName(hubs, record.startHubId)],
          ["Pickup time", timeLabel(record.startTime)],
          ...(active ? [["Battery remaining", vehicle ? vehicle.batteryLevel + "%" : "Unavailable"]]
            : [["Return Hub", hubName(hubs, record.endHubId)], ["Return time", timeLabel(record.endTime)],
               ["Parking slot", record.returnParkingSpaceId ?? "Unavailable"],
               ["Condition at return", record.returnCondition === "FAULTED" ? "Faulted" :
                 record.returnCondition === "OPERATIONAL" ? "Operational" : "Unavailable"]]),
          ["Duration", minutes + " min"], ["Distance", record.distanceKm == null ? "Unavailable" : record.distanceKm + " km"]
        ]))}
        ${returnHub ? panel("Return location", hubMap(returnHub, hubs)) : ""}
        ${!active ? link("Back to my rentals", rentalUrl("history")) : ""}
      </div>
      <aside class="rental-stack">
        ${active ? panel("Return vehicle", `<p>Park in the selected slot before confirming the simulated lock.</p>
          <p>Vehicle condition ${statusBadge(vehicle?.condition ?? "Unavailable")}</p>` + returnForm) : ""}
        ${active ? panel("Report a vehicle issue", (memory.incidentId
          ? `<p role="status">Report saved. Incident reference <strong>${e(memory.incidentId)}</strong></p>` : "") + report) : ""}
      </aside>
    </div>`;
}
