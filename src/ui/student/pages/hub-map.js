import { hasCoordinates } from "../../../modules/hub-identity/hub-service.js";
import { e } from "../../shared/records.js";

export function hubNetworkMap(hubs, selectedId) {
  const located = hubs.filter(hasCoordinates);
  if (!located.length) return "";
  const east = located.map(hub => hub.longitude);
  const north = located.map(hub => hub.latitude);
  const eastSpan = Math.max(Math.max(...east) - Math.min(...east), 0.006);
  const northSpan = Math.max(Math.max(...north) - Math.min(...north), 0.006);
  const eastMiddle = (Math.max(...east) + Math.min(...east)) / 2;
  const northMiddle = (Math.max(...north) + Math.min(...north)) / 2;
  const pins = [];
  const offsets = [[0, 0], [0, -13], [12, 0], [0, 13], [-12, 0], [12, -13], [-12, 13]];

  for (const [index, hub] of located.entries()) {
    const x = 50 + 68 * (hub.longitude - eastMiddle) / eastSpan;
    const y = 50 - 63 * (hub.latitude - northMiddle) / northSpan;
    const candidates = offsets.map(([dx, dy]) => ({
      x: Math.max(8, Math.min(92, x + dx)),
      y: Math.max(10, Math.min(90, y + dy))
    }));
    const point = candidates.find(candidate => pins.every(pin =>
      Math.abs(candidate.x - pin.x) > 10 || Math.abs(candidate.y - pin.y) > 12)) ?? candidates[0];
    pins.push({ ...point, hub, number: index + 1 });
  }

  return `<section class="card hub-map-card" aria-label="Map of matching Hubs">
    <header><h2>Hub map</h2><span>Approximate locations</span></header>
    <div class="hub-map-grid">
      <span class="hub-map-north" aria-hidden="true">↑ N</span>
      ${pins.map(({ hub, x, y, number }) => `<button type="button" class="hub-map-pin"
        style="--hub-x:${x}%;--hub-y:${y}%" data-operation="hub.select"
        data-input="${e(JSON.stringify({ hubId: hub.id }))}" aria-controls="hub-details"
        aria-label="${e(hub.name)}" title="${e(hub.name)}" aria-pressed="${hub.id === selectedId}">${number}</button>`).join("")}
    </div>
  </section>`;
}
