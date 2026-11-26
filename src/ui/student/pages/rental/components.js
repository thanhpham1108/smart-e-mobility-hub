import { badge, pageHeader } from "../../../shared/components.js";
import { e } from "../../../shared/records.js";

const base = "#/student/rental";

export function rentalUrl(section, id) {
  return base + (section ? "/" + section : "") + (id ? "/" + encodeURIComponent(id) : "");
}

export function link(label, href, primary = false) {
  return `<a class="button button--${primary ? "primary" : "secondary"}" href="${e(href)}">${e(label)}</a>`;
}

export function heading(title, description, action = "history") {
  return pageHeader("Student Portal", title, description, action === "history"
    ? link("My rentals", rentalUrl("history"))
    : link("Find vehicles", rentalUrl()));
}

export function hubName(hubs, id) {
  return hubs.find(hub => hub.id === id)?.name ?? id ?? "In transit";
}

export function vehicleType(type) {
  return type === "ELECTRIC_BICYCLE" ? "E-bike" : type === "ELECTRIC_MOTORCYCLE" ? "E-scooter" : type;
}

export function bookable(vehicle, hubs) {
  return vehicle.status === "AVAILABLE" && vehicle.condition === "OPERATIONAL" &&
    !vehicle.chargingCommitted && hubs.some(hub => hub.id === vehicle.currentHubId && hub.status === "Operational");
}

export function statusBadge(status) {
  const labels = {
    AVAILABLE: ["Available", "positive"], RESERVED: ["Reserved", "info"],
    CONFIRMED: ["Reserved", "info"], IN_USE: ["In use", "info"], ACTIVE: ["Active", "info"],
    UNDER_MAINTENANCE: ["Maintenance", "danger"], FAULTED: ["Faulted", "danger"],
    REDISTRIBUTING: ["Redistributing", "warning"], CHARGING_COMMITTED: ["Charging commitment", "warning"],
    PICKED_UP: ["Picked up", "positive"], COMPLETED: ["Completed", "positive"],
    CANCELLED: ["Cancelled", "neutral"], EXPIRED: ["Expired", "warning"],
    OPERATIONAL: ["Operational", "positive"], HUB_UNAVAILABLE: ["Hub unavailable", "warning"]
  };
  return badge(...(labels[status] ?? [status]));
}

export function vehicleStatus(vehicle, hubs) {
  if (vehicle.condition === "FAULTED") return statusBadge("FAULTED");
  if (vehicle.status === "AVAILABLE" && vehicle.chargingCommitted) return statusBadge("CHARGING_COMMITTED");
  if (vehicle.status === "AVAILABLE" && !bookable(vehicle, hubs)) return statusBadge("HUB_UNAVAILABLE");
  return statusBadge(vehicle.status);
}

export function facts(items) {
  return `<dl class="rental-facts">${items.map(([label, value]) =>
    `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl>`;
}

export function vehicleCard(vehicle, hubs) {
  return `<article class="card rental-vehicle">
    <div class="rental-card-top"><h3>${e(vehicle.name)}</h3>${vehicleStatus(vehicle, hubs)}</div>
    <p class="records-meta">${e(vehicleType(vehicle.vehicleType))} · ${e(vehicle.vehicleId)}</p>
    <p><strong>${e(vehicle.batteryLevel)}%</strong> battery</p>
    <p class="records-meta">${e(hubName(hubs, vehicle.currentHubId))}</p>
    ${link("View vehicle", rentalUrl("vehicles", vehicle.vehicleId), bookable(vehicle, hubs))}
  </article>`;
}

export function missing(title, description) {
  return heading(title, description, "catalog") + `<p>${link("My rentals", rentalUrl("history"))}</p>`;
}
