import { pageHeader, statCard } from "../../shared/components.js";
import { e, status, empty, panel, act, select, options, note, history, mountFleetView } from "../fleet-components.js";
import { isTransferOpen, outstanding, vehicleEligible } from "../../../modules/fleet-incident/service.js";
export { mountIncidents } from "./incidents.js";

export function mountFleet(root, context) {
  return mountFleetView(root, context, { source: "ktx-a", selected: null, review: null }, (data, ui) => {
    const hubName = id => data.hubs.find(h => h.id === id)?.name ?? id;
    const candidates = data.vehicles.filter(v => v.currentHubId === ui.source && vehicleEligible(v));
    const order = data.orders.find(o => o.orderId === ui.selected) ?? data.orders.find(isTransferOpen) ?? data.orders[0];
    const attrs = order ? `data-order-id="${e(order.orderId)}" data-expected-version="${order.version}"` : "";
    return `${pageHeader("Operations / Fleet", "Fleet & Redistribution", "Balance vehicle supply, review capacity and track every confirmed arrival.", '<a class="button button--secondary" href="#/operator/network">Inspect network</a>')}
      <div class="fi-stats">${statCard("Ready to move", data.vehicles.filter(vehicleEligible).length, "Available shared vehicles")}${statCard("Active transfers", data.orders.filter(isTransferOpen).length, "Capacity checked again on arrival", "info")}${statCard("Orders at risk", data.orders.filter(o => o.status === "AtRisk").length, "Resolve the cause before continuing", "warning")}</div>
      <div class="fi-columns">${panel("Plan a transfer", `
        <form data-action="source" class="fi-inline">${select("source", "Source Hub", options(data.hubs.filter(h => h.status === "Operational"), "id", "name", ui.source))}<button class="button button--secondary">Load vehicles</button></form>
        <form data-action="review" data-draft="transfer-${e(ui.source)}" class="fi-form">
          <input type="hidden" name="sourceHubId" value="${e(ui.source)}">
          ${select("destinationHubId", "Destination Hub", options(data.hubs.filter(h => h.id !== ui.source && h.status === "Operational"), "id", "name", "hcmut"))}
          <fieldset><legend>Select vehicles</legend>${candidates.length ? candidates.map(v => `<label class="fi-check fi-vehicle-choice"><input type="checkbox" name="vehicleIds" value="${e(v.vehicleId)}"><span><strong>${e(v.name)}</strong><small>${e(v.vehicleId)} · ${v.batteryLevel}% battery</small></span>${status(v.condition)}</label>`).join("") : empty("No eligible vehicles", "Choose another source Hub or resolve existing commitments.")}</fieldset>
          <button class="button button--primary" ${candidates.length ? "" : "disabled"}>Review feasibility</button>
        </form>
        ${ui.review ? `<div class="fi-review"><strong>${ui.review.feasible ? "Ready for confirmation" : "Transfer needs attention"}</strong><p>${e(hubName(ui.draft.sourceHubId))} → ${e(hubName(ui.draft.destinationHubId))}</p><p>${ui.review.vehicleCount} selected · ${ui.review.availableCapacity} spaces available</p><p>${ui.draft.vehicleIds.map(e).join(", ")}</p>${ui.review.reasons.map(r => `<p>${e(r)}</p>`).join("")}<small>This reviewed selection is committed on confirmation. Destination capacity is not reserved.</small>${ui.review.feasible ? act("Confirm reviewed transfer", "create", "", true) : ""}</div>` : ""}
      `)}${panel("Transfer orders", data.orders.length ? `<div class="fi-order-list">${data.orders.map(o => `<button type="button" data-action="select" data-id="${e(o.orderId)}" class="fi-order ${o.orderId === order?.orderId ? "is-selected" : ""}"><span><strong>${e(hubName(o.sourceHubId))} → ${e(hubName(o.destinationHubId))}</strong><small>${e(o.orderId)}</small></span>${status(o.status)}<span class="fi-progress"><span style="width:${Math.round((o.vehicles.length - outstanding(o).length) / o.vehicles.length * 100)}%"></span></span><small>${o.vehicles.length - outstanding(o).length}/${o.vehicles.length} arrived</small></button>`).join("")}</div>` : empty("No transfers yet", "Select vehicles and review a destination to create your first order."))}</div>
      ${order ? panel("Order progress", `<div class="fi-detail-heading"><div><h3>${e(hubName(order.sourceHubId))} → ${e(hubName(order.destinationHubId))}</h3><p>${e(order.orderId)} · Version ${order.version}</p></div>${status(order.status)}</div>
        ${order.riskReason ? `<div class="fi-callout">${e(order.riskReason)}</div>` : ""}
        <form data-action="arrive" data-draft="arrivals-${e(order.orderId)}-${order.version}" class="fi-form"><input type="hidden" name="orderId" value="${e(order.orderId)}"><input type="hidden" name="expectedVersion" value="${order.version}">
          <div class="fi-resource-list">${order.vehicles.map(ov => { const v = data.vehicles.find(v => v.vehicleId === ov.vehicleId); return `<label class="fi-check"><input type="checkbox" name="vehicleIds" value="${e(ov.vehicleId)}" ${ov.arrivedAt || !["Dispatched", "Partial"].includes(order.status) ? "disabled" : ""}><span><strong>${e(v?.name ?? ov.vehicleId)}</strong><small>${e(ov.vehicleId)} · ${ov.arrivedAt ? "Arrival confirmed" : order.status === "Cancelled" ? "Remaining work cancelled; verified at source" : "Awaiting arrival confirmation"}</small></span>${status(ov.arrivedAt ? "Completed" : v?.condition)}</label>`; }).join("")}</div>
          ${["Dispatched", "Partial"].includes(order.status) ? '<button class="button button--primary">Confirm selected arrivals</button><small>Confirm only vehicles physically received. All selected arrivals succeed together or none move.</small>' : ""}
        </form><div class="fi-actions">${order.status === "Planned" ? act("Dispatch vehicles", "dispatch", attrs, true) : ""}${order.status === "AtRisk" ? act("Revalidate order", "revalidate", attrs, true) : ""}${order.status === "Planned" || (order.status === "AtRisk" && order.resumeStatus === "Planned") ? act("Cancel transfer", "cancel", attrs) : ""}</div>
        ${order.status === "AtRisk" && order.resumeStatus !== "Planned" ? `<details><summary>Cancel remaining work after verified return</summary><form class="fi-form" data-action="cancel" data-draft="disposition-${e(order.orderId)}-${order.version}"><input type="hidden" name="orderId" value="${e(order.orderId)}"><input type="hidden" name="expectedVersion" value="${order.version}"><p>Confirm all outstanding vehicles have physically returned to ${e(hubName(order.sourceHubId))}. Source parking capacity is checked again. Vehicles already received at the destination stay there.</p>${note("note", "Disposition evidence", "Who verified the return, which vehicles and where they are parked")}<label class="fi-check"><input type="checkbox" name="sourceDispositionVerified" value="true" required><span>All outstanding vehicles are physically at the source Hub</span></label><button class="button button--secondary">Confirm return and cancel remaining work</button></form></details>` : ""}
        <details><summary>Transfer history</summary>${history(data.transferHistory.filter(h => h.orderId === order.orderId))}</details>`) : ""}`;
  }, {
    source(values, { state }) { state.source = values.source; state.review = null; },
    select(values, { state }) { state.selected = values.id; },
    async review(values, tools) {
      const draft = { ...values, vehicleIds: values.vehicleIds ?? [] };
      const result = await tools.service.review(draft);
      tools.state.review = result.ok ? result.data : null;
      tools.state.draft = draft;
      if (!result.ok) tools.tell(result.message, true);
    },
    async create(_, tools) {
      const result = await tools.save("fleet.create", { ...tools.state.draft, validationToken: tools.state.review.validationToken }, "Transfer created. Vehicles are committed until arrival or eligible cancellation.");
      tools.state.review = null;
      if (result.ok) { tools.state.selected = result.data.orderId; tools.clearDraft(`transfer-${tools.state.source}`); }
    },
    async dispatch(values, tools) { await tools.save("fleet.dispatch", values, "Dispatch recorded. Source spaces released; arrivals still need confirmation."); },
    async arrive(values, tools) { await tools.save("fleet.arrive", { ...values, vehicleIds: values.vehicleIds ?? [] }, "Selected arrivals confirmed."); },
    async revalidate(values, tools) { await tools.save("fleet.revalidate", values, "Order revalidated. You can continue its previous stage."); },
    async cancel(values, tools) { if (globalThis.confirm("Cancel outstanding work and release only the vehicles verified at the source Hub?")) await tools.save("fleet.cancel", values, "Remaining transfer work cancelled. Previously arrived vehicles are unchanged."); }
  });
}
