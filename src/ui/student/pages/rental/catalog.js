import { button, e, input, panel, select } from "../../../shared/records.js";
import { vehiclePhotoCredits } from "../../../shared/vehicle-photo.js";
import { findAlternativeHubs } from "../../../../modules/hub-identity/hub-service.js";
import { bookable, heading, link, vehicleRow, vehicleType } from "./components.js";

export function filterCatalog(input, { memory }) {
  memory.filters = input;
  return { ok: true, readOnly: true, message: "" };
}

export function clearFilters(input, { memory }) {
  memory.filters = {};
  return { ok: true, readOnly: true, message: "" };
}

export function catalog({ hubs, vehicles }, id, { filters = {} }) {
  const option = (value, label, selected) =>
    `<option value="${e(value)}"${value === selected ? " selected" : ""}>${e(label)}</option>`;
  const filter = `<form class="records-form rental-filter" data-operation="rental.filter">
    ${select("hubId", "Pickup Hub", option("", "All Hubs", filters.hubId) +
      hubs.map(hub => option(hub.id, hub.name, filters.hubId)).join("")).replace(" required", "")}
    ${select("vehicleType", "Vehicle type", option("", "All types", filters.vehicleType) +
      ["ELECTRIC_BICYCLE", "ELECTRIC_MOTORCYCLE", "CAR"].map(type => option(type, vehicleType(type), filters.vehicleType)).join("")).replace(" required", "")}
    ${input("minBattery", "Minimum battery (%)", `type="number" min="0" max="100" value="${e(filters.minBattery ?? 0)}"`)}
    <div class="rental-filter-actions">
      <button type="submit" class="button button--primary">Search</button>
      ${button("Clear filters", "rental.clearFilters")}
    </div>
  </form>`;
  const matches = vehicles.filter(vehicle =>
    (!filters.hubId || vehicle.currentHubId === filters.hubId) &&
    (!filters.vehicleType || vehicle.vehicleType === filters.vehicleType) &&
    vehicle.batteryLevel >= Number(filters.minBattery || 0));
  const alternatives = findAlternativeHubs(hubs, filters.hubId, hub => vehicles.some(vehicle =>
    bookable(vehicle, hubs) && vehicle.currentHubId === hub.id &&
    (!filters.vehicleType || vehicle.vehicleType === filters.vehicleType) &&
    vehicle.batteryLevel >= Number(filters.minBattery || 0)));
  const alternativeLinks = alternatives.map(hub => button(hub.name, "rental.filter", { ...filters, hubId: hub.id })).join(" ");
  return heading("Find a shared vehicle", "Search e-bikes, e-scooters and electric cars by Hub.") + `
    <div class="rental-layout">
      <div class="rental-stack">
        ${panel("Filter vehicles", filter)}
        <h2 class="rental-results" id="rental-results">${matches.length} ${matches.length === 1 ? "vehicle" : "vehicles"} found</h2>
        ${matches.length ? `<ul class="rental-vehicles" aria-labelledby="rental-results">${matches.map(vehicle => vehicleRow(vehicle, hubs, filters)).join("")}</ul>`
          : panel("No matching vehicles", "<p>Try another Hub, type, or battery level.</p>")}
        ${matches.some(vehicle => vehicle.photoKey) ? vehiclePhotoCredits() : ""}
        ${!matches.some(vehicle => bookable(vehicle, hubs)) && alternatives.length ? panel("Try another Hub", alternativeLinks) : ""}
      </div>
      <aside>${panel("Campus Hubs", `<ul class="rental-hubs">${hubs.map(hub => `<li><strong>${e(hub.name)}</strong>
        <span class="records-meta">${vehicles.filter(vehicle => vehicle.currentHubId === hub.id && bookable(vehicle, hubs)).length} available</span></li>`).join("")}</ul>
        ${link("View all Hubs", "#/student/hubs")}`)}</aside>
    </div>`;
}
