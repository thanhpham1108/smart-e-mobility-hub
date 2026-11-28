import { e } from "../../../shared/records.js";

const halfSpanKm = 1;
const kmPerDegree = 111.32;

function hasLocation(hub) {
  return Number.isFinite(hub.latitude) && Math.abs(hub.latitude) <= 90 &&
    Number.isFinite(hub.longitude) && Math.abs(hub.longitude) <= 180;
}

export function hubMap(hub, hubs) {
  const address = hub.address && hub.address !== hub.name ? hub.address : hub.area;
  if (!hasLocation(hub)) {
    return `<p><strong>${e(hub.name)}</strong></p><p class="records-meta">${e(address)}</p>
      <p class="records-meta">Map coordinates are unavailable for this Hub.</p>`;
  }

  const eastKmPerDegree = kmPerDegree * Math.cos(hub.latitude * Math.PI / 180);
  const points = hubs.filter(other => other.id !== hub.id && hasLocation(other)).map(other => {
    const east = (other.longitude - hub.longitude) * eastKmPerDegree;
    const north = (other.latitude - hub.latitude) * kmPerDegree;
    return { name: other.name, east, north };
  }).filter(({ east, north }) => Math.abs(east) < halfSpanKm * 0.8 && Math.abs(north) < halfSpanKm * 0.8);

  const directions = new URL("https://www.google.com/maps/dir/");
  directions.search = new URLSearchParams({
    api: "1", destination: `${hub.latitude},${hub.longitude}`, travelmode: "walking"
  });

  const nearbyPins = points.map(({ east, north }, index) =>
    `<span class="rental-map-pin" style="--pin-x:${50 + east / (2 * halfSpanKm) * 100}%;--pin-y:${50 - north / (2 * halfSpanKm) * 100}%">${index + 1}</span>`
  ).join("");

  return `<figure class="rental-map">
    <div class="rental-map-plot" role="img" aria-label="North-up Hub map centered on ${e(hub.name)}">
      <span class="rental-map-north" aria-hidden="true">↑ N</span>
      <div aria-hidden="true">
        ${nearbyPins}
        <span class="rental-map-pin rental-map-pin--selected">●</span>
      </div>
      <span class="rental-map-scale" aria-hidden="true">250 m</span>
    </div>
    <figcaption>
      <p><span class="rental-map-key rental-map-key--selected" aria-hidden="true">●</span><strong>${e(hub.name)}</strong></p>
      ${address ? `<p class="records-meta">${e(address)}</p>` : ""}
      ${points.length ? `<ol aria-label="Nearby Hubs">${points.map(({ name }, index) =>
        `<li><span class="rental-map-key" aria-hidden="true">${index + 1}</span>${e(name)}</li>`
      ).join("")}</ol>` : ""}
      <p class="records-meta">Hub locations only. Use walking directions for street routing.</p>
    </figcaption>
  </figure>
  <a class="button button--secondary" href="${e(directions.href)}" target="_blank" rel="noopener">Walking directions (online)</a>`;
}
