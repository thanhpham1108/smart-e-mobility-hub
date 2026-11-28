import { findAlternativeHubs, findHubs, getHubStatus, hasCoordinates } from "../../../modules/hub-identity/hub-service.js";
import { badge, pageHeader } from "../../shared/components.js";
import { button, e, input, mountRecords, timeLabel } from "../../shared/records.js";
import { hubNetworkMap } from "./hub-map.js";

const services = [
  ["bikes", "E-bikes"], ["scooters", "E-scooters"], ["cars", "Electric cars"],
  ["parking", "Parking"], ["charging", "Charging"]
];
const vehicleLabels = { ELECTRIC_BICYCLE: "E-bike", ELECTRIC_MOTORCYCLE: "E-scooter", CAR: "Electric car" };
const radiusOptions = [1, 3, 5, 10, 25];
const option = (value, label, selected) =>
  `<option value="${e(value)}" ${selected === value ? "selected" : ""}>${e(label)}</option>`;

function filterForm(hubs, memory) {
  const form = memory.form ?? {};
  const originOptions = hubs.filter(hasCoordinates).map(hub => option(hub.id, hub.name, form.origin)).join("");
  const gpsOption = memory.location ? option("current", "Current location", form.origin) : "";
  return `<section class="card hub-filters" aria-label="Hub search filters">
    <form class="hub-filter-form" data-operation="hub.search">
      <div class="hub-filter-fields">
        ${input("query", "Hub name or address", `type="search" autocomplete="off" placeholder="e.g. Dĩ An or Metro" value="${e(form.query ?? "")}"`)}
        <label class="field"><span>Search from</span><select name="origin">
          ${option("", "All locations", form.origin)}${gpsOption}${originOptions}
        </select></label>
        <label class="field"><span>Radius</span><select name="radius">
          ${option("", "Any distance", form.radius)}
          ${radiusOptions.map(km => option(String(km), `Within ${km} km`, form.radius)).join("")}
        </select></label>
      </div>
      <div class="hub-filter-bottom">
        <fieldset class="hub-service-filters"><legend>Require available services</legend>
          ${services.map(([id, label]) => `<label><input type="checkbox" name="service-${id}" ${form["service-" + id] ? "checked" : ""}> ${label}</label>`).join("")}
        </fieldset>
        <div class="hub-actions">
          <button class="button button--primary">Search Hubs</button>
          ${button("Use my location", "hub.locate")}
          ${button("Reset filters", "hub.reset")}
        </div>
      </div>
      ${memory.filterNote ? `<p class="hub-filter-note" role="status">${e(memory.filterNote)}</p>` : ""}
    </form>
  </section>`;
}

function hubRow(hub, selectedId) {
  const fresh = hub.freshness === "Live";
  return `<li><button type="button" class="hub-result-row" data-operation="hub.select"
    data-input="${e(JSON.stringify({ hubId: hub.id }))}" aria-controls="hub-details" aria-pressed="${hub.id === selectedId}">
    <span class="hub-result-name"><strong>${e(hub.name)}</strong><span>${e(hub.area)}${hub.distance !== null ? " · " + hub.distance.toFixed(1) + " km" : ""}</span></span>
    <span class="hub-result-meta">${badge(hub.freshness, fresh ? "positive" : "warning")}
      <small>${e(hub.status)}</small></span>
  </button></li>`;
}

function metrics(hub) {
  const occupancy = hub.parkingTotal == null || hub.parkingFree == null ? null : Math.max(0, hub.parkingTotal - hub.parkingFree);
  const entries = [
    ["Shared vehicles", hub.status === "Operational" ? hub.vehiclesFree : 0, "available"],
    ["Parking", occupancy == null ? "—" : `${occupancy} / ${hub.parkingTotal}`, "occupied now"],
    ["Charging points", hub.chargingTotal == null ? "—" : `${hub.status === "Operational" ? hub.chargingFree ?? "—" : 0} / ${hub.chargingTotal}`, "available"]
  ];
  return `<dl class="hub-capacity">${entries.map(([name, value, unit]) =>
    `<div><dt>${e(name)}</dt><dd>${e(value ?? "—")}<small>${e(unit)}</small></dd></div>`).join("")}</dl>`;
}

function hubDetails(hub) {
  if (!hub) return `<aside class="card hub-detail" id="hub-details"><h2>Hub status</h2><p class="records-meta">Select a Hub to see its services and current status.</p></aside>`;
  const live = hub.freshness === "Live";
  const batteries = hub.vehicleBatteries ?? [];
  const url = encodeURIComponent(hub.id);
  return `<aside class="card hub-detail" id="hub-details" aria-labelledby="hub-detail-title">
    <header class="hub-detail-head">
      <div><p class="eyebrow">Hub status</p><h2 id="hub-detail-title" tabindex="-1">${e(hub.name)}</h2></div>
      ${badge(hub.status, hub.status === "Operational" ? "positive" : "warning")}
    </header>
    <p class="hub-address">${e(hub.address && hub.address !== hub.name ? hub.address : hub.area)}</p>
    <div class="hub-freshness">
      ${badge(hub.freshness === "Live" ? "Live data" : hub.freshness === "Stale" ? "Stale data" : "Status unavailable", live ? "positive" : "warning")}
      <span>${hub.lastObservedAt ? "Charging telemetry · " + e(timeLabel(hub.lastObservedAt)) : "Charging telemetry timestamp unavailable"}</span>
      <button class="text-button" type="button" data-operation="hub.refresh" data-input="{}">Refresh status</button>
    </div>
    ${live ? "" : '<p class="hub-stale">These are last reported counts. Confirm availability before you travel.</p>'}
    ${hub.parkingDiscrepancy ? '<p class="hub-stale">Parking occupancy is being verified by an Operator.</p>' : ""}
    ${metrics(hub)}
    <p class="records-meta">Parking occupancy reflects the current ledger. Review a time window for future availability.</p>
    ${hub.status === "Operational" ? `<div class="hub-actions">
      <a class="button button--primary" href="#/student/rental?hub=${url}">Browse vehicles</a>
      <a class="button button--secondary" href="#/student/parking?hub=${url}">Review parking</a>
    </div>` : ""}
    ${!live || hub.status !== "Operational" || !(hub.vehiclesFree || hub.parkingFree || hub.chargingFree)
      ? `<div class="hub-actions">${button("Find alternative Hubs", "hub.alternatives", { hubId: hub.id })}</div>` : ""}
    <section class="hub-batteries">
      <h3>Reported vehicle battery levels</h3>
      ${batteries.length ? `<ul>${batteries.map(vehicle => `<li><span>${e(vehicle.name)}
        ${vehicleLabels[vehicle.vehicleType] ? `<small>${e(vehicleLabels[vehicle.vehicleType])}</small>` : ""}</span>
        <strong>${vehicle.batteryLevel == null ? "—" : e(vehicle.batteryLevel) + "%"}</strong></li>`).join("")}</ul>`
        : '<p class="records-meta">No battery readings for available shared vehicles at this Hub.</p>'}
    </section>
  </aside>`;
}

function browserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Location unavailable")); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) =>
      resolve({ latitude: coords.latitude, longitude: coords.longitude }), reject,
    { timeout: 7000, maximumAge: 60000 });
  });
}

export function mount(root, context) {
  const saved = { ok: true, readOnly: true, message: "" };
  return mountRecords(root, context, ({ hubs }, _viewer, memory) => {
    const form = memory.criteria ?? {};
    const origin = form.origin === "current" ? memory.location : getHubStatus(hubs, form.origin);
    const required = services.filter(([id]) => form["service-" + id]).map(([id]) => id);
    const matching = memory.alternativeFrom
      ? findAlternativeHubs(hubs, memory.alternativeFrom, hub => hub.freshness === "Live" &&
        (hub.vehiclesFree > 0 || (hub.parkingFree > 0 && !hub.parkingDiscrepancy) || hub.chargingFree > 0))
      : findHubs(hubs, { query: form.query, origin, radiusKm: Number(form.radius) || 0, services: required });
    const selected = getHubStatus(matching, memory.selectedId)
      ?? getHubStatus(matching, "ktx-a") ?? matching[0];
    return `${pageHeader("Student Portal", "Find a Mobility Hub", "Search campus Hubs and check their status before you travel.")}
      ${filterForm(hubs, memory)}
      <div class="hub-workspace">
        <div class="hub-results">
          <section class="card hub-results-card" aria-labelledby="hub-results-heading">
            <header><h2 id="hub-results-heading">${memory.alternativeFrom ? "Alternative Hubs" : "Matching Hubs"}</h2>${badge(String(matching.length), "info")}</header>
            ${matching.length ? `<ul>${matching.map(hub => hubRow(hub, selected?.id)).join("")}</ul>`
              : '<p class="hub-empty">No matching Hubs. Change the location, radius or services to try again.</p>'}
          </section>
          ${hubNetworkMap(matching, selected?.id)}
        </div>
        ${hubDetails(selected)}
      </div>`;
  }, {
    "hub.search"(form, { memory }) {
      memory.form = form;
      if (form.radius && !form.origin) {
        memory.filterNote = "Choose a starting Hub or use your current location for a radius search.";
        return saved;
      }
      memory.criteria = { ...form, radius: radiusOptions.includes(Number(form.radius)) ? form.radius : "" };
      memory.filterNote = form.origin ? "Distances are measured in a straight line." : "";
      memory.alternativeFrom = null;
      return saved;
    },
    async "hub.locate"(_, { memory }) {
      const form = Object.fromEntries(new FormData(root.querySelector(".hub-filter-form")));
      memory.form = form;
      try {
        memory.location = await browserLocation();
        memory.form = { ...form, origin: "current", radius: form.radius || "3" };
        memory.criteria = memory.form;
        memory.alternativeFrom = null;
        memory.filterNote = "Distances are measured from your current location in a straight line.";
      } catch {
        memory.filterNote = "Location unavailable. Choose a starting Hub or search by name or address.";
      }
      return saved;
    },
    "hub.reset"(_, { memory }) {
      Object.assign(memory, { form: {}, criteria: {}, selectedId: null, alternativeFrom: null, filterNote: "" });
      return saved;
    },
    async "hub.refresh"(_, { store }) {
      const refreshed = await store.refresh();
      return { ...saved, ok: refreshed, message: refreshed ? "Hub status refreshed." : "Unable to refresh Hub status." };
    },
    "hub.select"({ hubId }, { memory }) {
      memory.selectedId = hubId;
      requestAnimationFrame(() => root.querySelector("#hub-detail-title")?.focus({
        preventScroll: !matchMedia("(max-width: 52rem)").matches
      }));
      return saved;
    },
    "hub.alternatives"({ hubId }, { memory }) {
      memory.alternativeFrom = hubId;
      memory.selectedId = null;
      requestAnimationFrame(() => root.querySelector("#hub-results-heading")?.scrollIntoView({ block: "nearest" }));
      return saved;
    }
  });
}
