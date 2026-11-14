import { badge, escapeHtml, pageHeader, statCard } from "../../shared/components.js";

export function mount(root, { store }) {
  function render() {
    const hubs = store.readSnapshot().hubs;
    const vehicles = hubs.reduce((sum, hub) => sum + hub.vehiclesFree, 0);
    const parkingFree = hubs.reduce((sum, hub) => sum + hub.parkingFree, 0);
    const parkingTotal = hubs.reduce((sum, hub) => sum + hub.parkingTotal, 0);
    const chargingActive = hubs.reduce((sum, hub) => sum + hub.chargingActive, 0);
    const chargingTotal = hubs.reduce((sum, hub) => sum + hub.chargingTotal, 0);
    const atRisk = hubs.filter(hub => hub.freshness !== "Live");
    root.innerHTML = `${pageHeader("Operations / Live network", "Network Overview", "Vehicle availability, Hub utilization and attention areas across VNU-HCM.", '<span class="badge badge--info">Seed snapshot</span>')}
      <section class="network-stats" aria-label="Network metrics">${statCard("Available vehicles", vehicles, `Across ${hubs.length} Mobility Hubs`)}${statCard("Parking utilization", `${Math.round((1 - parkingFree / parkingTotal) * 100)}%`, `${parkingTotal - parkingFree} of ${parkingTotal} spaces occupied`, "info")}${statCard("Charging points active", `${chargingActive}/${chargingTotal}`, "Seed resource snapshot", "warning")}${statCard("Hubs to review", atRisk.length, "Near capacity or stale", "danger")}</section>
      <div class="network-grid"><section class="card network-panel"><h2>Mobility Hub network</h2><div class="network-map" role="img" aria-label="Schematic list of four Mobility Hubs">${hubs.map(hub => `<div class="network-map__hub"><strong>${escapeHtml(hub.name)}</strong><small>${hub.vehiclesFree} vehicles available · ${escapeHtml(hub.freshness)}</small></div>`).join("")}</div><p style="margin:9px 0 0;color:var(--color-muted);font-size:12px">Schematic layout · Values are seeded for the foundation demo.</p></section><section class="card network-panel"><h2>Operational alerts</h2>${atRisk.length ? atRisk.map(hub => `<div class="network-alert"><strong>${escapeHtml(hub.freshness)} · ${escapeHtml(hub.name)}</strong><p>${hub.parkingFree} parking spaces free in the seed snapshot.</p></div>`).join("") : '<p>No Hubs need review.</p>'}</section></div>
      <section class="hub-performance"><h2>Hub performance</h2><div class="hub-performance__grid">${hubs.map(hub => `<article class="card hub-performance__item"><strong>${escapeHtml(hub.name)}</strong><small>${escapeHtml(hub.area)}</small><p>${hub.vehiclesFree} vehicles</p>${badge(hub.freshness, hub.freshness === "Live" ? "positive" : "warning")}</article>`).join("")}</div></section>`;
  }
  render();
  const unsubscribe = store.subscribe(render);
  return () => unsubscribe();
}
