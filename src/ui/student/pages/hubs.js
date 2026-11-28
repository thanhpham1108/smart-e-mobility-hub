import { pageHeader, badge } from "../../shared/components.js";
import { actionForm, button, e, input, list, mountRecords, panel } from "../../shared/records.js";

function hasAvailability(hub) {
  return hub.status === "Operational" && hub.freshness === "Live"
    && (hub.vehiclesFree > 0 || hub.parkingFree > 0 || hub.chargingFree > 0);
}

export function mount(root, context) {
  return mountRecords(root, context, ({ hubs }, viewer, memory) => {
    const query = memory.query ?? "";
    const visible = memory.excludeHubId
      ? hubs.filter(hub => hub.id !== memory.excludeHubId && hasAvailability(hub))
      : hubs.filter(hub => `${hub.name} ${hub.area} ${hub.id}`.toLowerCase().includes(query.trim().toLowerCase())
        && (!memory.onlyAvailable || hasAvailability(hub)));
    return `${pageHeader("Student Portal", "Mobility Hubs", "Find a Hub and check its availability.", badge(viewer.name, "info"))}
      ${panel("Find a Hub", actionForm("filter", input("query", "Hub, area or Hub ID", `value="${e(query)}"`)
        + `<label><input type="checkbox" name="onlyAvailable" ${memory.onlyAvailable ? "checked" : ""}> Show Hubs with availability</label>`, "Search"))}
      ${panel(memory.excludeHubId ? "Alternative Hubs" : "Hub availability", list(visible, hub => `<article><h3>${e(hub.name)}</h3>
        <p class="records-meta">${e(hub.area)} · ${e(hub.status)} · ${e(hub.freshness)}</p>
        <p>${hub.vehiclesFree} shared vehicles · ${hub.parkingFree} parking spaces · ${hub.chargingFree} charging points available</p>
        ${hasAvailability(hub) ? "" : button("Find alternatives", "alternatives", { hubId: hub.id })}</article>`, "No matching Hubs."))}
      ${panel("Profile", actionForm("identity.profile", input("email", "Contact email", `type="email" value="${e(memory.profile?.email ?? viewer.email ?? "")}"`)
        + input("phone", "Phone", `type="tel" value="${e(memory.profile?.phone ?? viewer.phone ?? "")}"`), "Save profile"))}`;
  }, {
    filter(input, { memory }) {
      Object.assign(memory, input, { onlyAvailable: input.onlyAvailable === "on", excludeHubId: null });
      return { ok: true, readOnly: true, message: "Hub results updated." };
    },
    alternatives({ hubId }, { memory }) {
      memory.excludeHubId = hubId;
      return { ok: true, readOnly: true, message: "Showing operational Hubs with live availability. Use Search to return to all results." };
    },
    async "identity.profile"(input, { api, memory }) {
      const result = await api.command("identity.profile", input);
      if (result.ok) memory.profile = result.data;
      return result;
    }
  });
}
