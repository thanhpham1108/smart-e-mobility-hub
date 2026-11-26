import { actionForm, button, e, input, panel, select } from "../../../shared/records.js";
import { bookable, heading, link, vehicleCard, vehicleType } from "./components.js";

export function filterCatalog(input, { memory }) {
  memory.filters = input;
  return { ok: true, readOnly: true, message: "" };
}

export function clearFilters(input, { memory }) {
  delete memory.filters;
  return { ok: true, readOnly: true, message: "" };
}

export function catalog({ hubs, vehicles }, id, { filters = {} }) {
  const option = (value, label, selected) =>
    `<option value="${e(value)}"${value === selected ? " selected" : ""}>${e(label)}</option>`;
  const filter = actionForm("rental.filter",
    select("hubId", "Pickup Hub", option("", "All Hubs", filters.hubId) +
      hubs.map(hub => option(hub.id, hub.name, filters.hubId)).join("")).replace(" required", "") +
    select("vehicleType", "Vehicle type", option("", "All types", filters.vehicleType) +
      ["ELECTRIC_BICYCLE", "ELECTRIC_MOTORCYCLE"].map(type => option(type, vehicleType(type), filters.vehicleType)).join("")).replace(" required", "") +
    input("minBattery", "Minimum battery (%)", `type="number" min="0" max="100" value="${e(filters.minBattery ?? 0)}"`),
    "Search") + button("Clear filters", "rental.clearFilters");
  const matches = vehicles.filter(vehicle =>
    (!filters.hubId || vehicle.currentHubId === filters.hubId) &&
    (!filters.vehicleType || vehicle.vehicleType === filters.vehicleType) &&
    vehicle.batteryLevel >= Number(filters.minBattery || 0));
  const alternatives = hubs.filter(hub => hub.id !== filters.hubId && vehicles.some(vehicle =>
    bookable(vehicle, hubs) && vehicle.currentHubId === hub.id &&
    (!filters.vehicleType || vehicle.vehicleType === filters.vehicleType) &&
    vehicle.batteryLevel >= Number(filters.minBattery || 0)));
  const alternativeLinks = alternatives.map(hub => button(hub.name, "rental.filter", { ...filters, hubId: hub.id })).join(" ");
  return heading("Find a shared vehicle", "Choose an e-bike or e-scooter for your trip.") + `
    <div class="rental-layout">
      <div class="rental-stack">
        ${panel("Filter vehicles", filter)}
        <h2 class="rental-results">${matches.length} ${matches.length === 1 ? "vehicle" : "vehicles"} found</h2>
        ${matches.length ? `<div class="rental-grid">${matches.map(vehicle => vehicleCard(vehicle, hubs)).join("")}</div>`
          : panel("No matching vehicles", "<p>Try another Hub, type, or battery level.</p>")}
        ${!matches.some(vehicle => bookable(vehicle, hubs)) && alternatives.length ? panel("Try another Hub", alternativeLinks) : ""}
      </div>
      <aside>${panel("Campus Hubs", `<ul class="rental-hubs">${hubs.map(hub => `<li><strong>${e(hub.name)}</strong>
        <span class="records-meta">${vehicles.filter(vehicle => vehicle.currentHubId === hub.id && bookable(vehicle, hubs)).length} available</span></li>`).join("")}</ul>
        ${link("View all Hubs", "#/student/hubs")}`)}</aside>
    </div>`;
}
