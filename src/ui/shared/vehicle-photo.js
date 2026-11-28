import { escapeHtml } from "./components.js";

const directory = new URL("../../assets/vehicles/", import.meta.url);

export function vehiclePhoto(vehicle, style, { describe = false, eager = false } = {}) {
  const key = vehicle?.photoKey;
  if (!key || !/^[a-z0-9-]+$/.test(key)) return "";
  const url = new URL(`${key}.jpg`, directory);
  const alt = describe ? `Illustration of ${vehicle.name}` : "";
  return `<img class="vehicle-photo ${escapeHtml(style)}" src="${escapeHtml(url.href)}"
    alt="${escapeHtml(alt)}" ${eager ? "" : 'loading="lazy"'} decoding="async">`;
}

export function vehiclePhotoCredits() {
  return `<a class="vehicle-photo-credits" href="${escapeHtml(new URL("credits.html", directory).href)}" target="_blank" rel="noopener">Vehicle photo credits</a>`;
}
