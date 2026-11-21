import { pageHeader, badge } from "../../shared/components.js";
import { actionForm, e, input, list, mountRecords, panel } from "../../shared/records.js";

export function mount(root, context) {
  return mountRecords(root, context, ({ hubs }, viewer, memory) => {
    const query = memory.query ?? "";
    const visible = hubs.filter(hub => `${hub.name} ${hub.area}`.toLowerCase().includes(query.toLowerCase())
      && (!memory.onlyAvailable || hub.vehiclesFree || hub.parkingFree || hub.chargingFree));
    return `${pageHeader("Student Portal", "Mobility Hubs", "Find a Hub and check its availability.", badge(viewer.name, "info"))}
      ${panel("Find a Hub", actionForm("filter", input("query", "Hub or area", `value="${e(query)}"`)
        + '<label><input type="checkbox" name="onlyAvailable"> Show Hubs with availability</label>', "Search"))}
      ${panel("Hub availability", list(visible, hub => `<article><h3>${e(hub.name)}</h3>
        <p class="records-meta">${e(hub.area)} · ${e(hub.status)} · ${e(hub.freshness)}</p>
        <p>${hub.vehiclesFree} shared vehicles · ${hub.parkingFree} parking spaces · ${hub.chargingFree} charging points available</p></article>`, "No matching Hubs."))}
      ${panel("Profile", actionForm("identity.profile", input("email", "Contact email", `type="email" value="${e(memory.profile?.email ?? viewer.email ?? "")}"`)
        + input("phone", "Phone", `type="tel" value="${e(memory.profile?.phone ?? viewer.phone ?? "")}"`), "Save profile"))}`;
  }, {
    filter(input, { memory }) {
      Object.assign(memory, input, { onlyAvailable: input.onlyAvailable === "on" });
      return { ok: true, readOnly: true, message: "Hub results updated." };
    },
    async "identity.profile"(input, { api, memory }) {
      const result = await api.command("identity.profile", input);
      if (result.ok) memory.profile = result.data;
      return result;
    }
  });
}
