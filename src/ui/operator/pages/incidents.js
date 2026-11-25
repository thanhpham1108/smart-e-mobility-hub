import { pageHeader, statCard } from "../../shared/components.js";
import { e, time, status, empty, panel, act, input, select, note, history, mountFleetView } from "../fleet-components.js";
import { isIncidentOpen } from "../../../modules/fleet-incident/service.js";

export function mountIncidents(root, context) {
  return mountFleetView(root, context, { selected: null, filter: "Active" }, (data, ui) => {
    const tickets = data.incidents.filter(i => ui.filter === "All" || (ui.filter === "Active" ? isIncidentOpen(i) : i.status === ui.filter));
    const ticket = tickets.find(i => i.incidentId === ui.selected) ?? tickets[0];
    const attrs = ticket ? `data-incident-id="${e(ticket.incidentId)}" data-expected-version="${ticket.version}"` : "";
    const hidden = ticket ? `<input type="hidden" name="incidentId" value="${e(ticket.incidentId)}"><input type="hidden" name="expectedVersion" value="${ticket.version}">` : "";
    return `${pageHeader("Operations / Incident desk", "Incidents & Recovery", "Investigate faults, record repair evidence and verify each resource before release.")}
      <div class="fi-stats">${statCard("Active incidents", data.incidents.filter(isIncidentOpen).length, "Resource restrictions remain in force", "warning")}${statCard("High priority", data.incidents.filter(i => isIncidentOpen(i) && i.severity === "High").length, "Requires operator attention", "danger")}${statCard("Recovered", data.incidents.filter(i => ["Resolved", "Closed"].includes(i.status)).length, "Repair and recovery recorded")}</div>
      <div class="fi-columns fi-desk">${panel("Incident queue", `<form data-action="filter" class="fi-inline">${select("filter", "Show incidents", ["Active", "All", "Open", "Investigating", "ActionAssigned", "InRepair", "Resolved", "Closed"].map(v => `<option ${v === ui.filter ? "selected" : ""}>${v}</option>`).join(""))}<button class="button button--secondary">Apply</button></form>${tickets.length ? `<div class="fi-order-list">${tickets.map(i => `<button type="button" class="fi-order ${i.incidentId === ticket?.incidentId ? "is-selected" : ""}" data-action="select" data-id="${e(i.incidentId)}"><span><strong>${e(i.vehicleId ?? i.pointId)}</strong><small>${e(i.description)}</small></span>${status(i.severity)}<small>${e(i.incidentId)}</small>${status(i.status)}</button>`).join("")}</div>` : empty("No matching incidents", "New resource faults will appear here.")}`)}
      ${panel("Investigation workspace", ticket ? `<div class="fi-detail-heading"><div><h3>${e(ticket.vehicleId ?? ticket.pointId)}</h3><p>${e(ticket.faultKey)} · ${time(ticket.createdAt)}</p></div>${status(ticket.status)}</div><p>${e(ticket.description)}</p><p class="fi-muted">${e(ticket.incidentId)} · Version ${ticket.version}${ticket.assignee ? ` · Assigned to ${e(ticket.assignee)}` : ""}</p>
        <div class="fi-callout">${isIncidentOpen(ticket) ? "This incident restricts the resource. Repair evidence and verified recovery are required to release it." : "This incident restriction has been lifted. Other incidents and commitments may still prevent availability."}</div>
        ${ticket.status === "Open" ? act("Start investigation", "investigate", attrs, true) : ""}
        ${ticket.status === "Investigating" ? `<form class="fi-form" data-action="plan" data-draft="plan-${e(ticket.incidentId)}-${ticket.version}">${hidden}${input("assignee", "Repair owner", 'required maxlength="100" placeholder="Technician or team"')}${note("note", "Investigation and repair plan", "Diagnosis, intended action and checks")}<button class="button button--primary">Assign repair plan</button></form>` : ""}
        ${["ActionAssigned", "InRepair"].includes(ticket.status) ? `<form class="fi-form" data-action="repair" data-draft="repair-${e(ticket.incidentId)}-${ticket.version}">${hidden}${note("note", "Repair evidence", "Work performed and verification results")}<label class="fi-check"><input type="checkbox" name="complete" value="true"><span>Repair work is complete</span></label><button class="button button--primary">Save repair update</button></form>` : ""}
        ${ticket.repairedAt && ticket.status === "InRepair" ? `<div class="fi-review"><strong>Ready for recovery verification</strong><p>${e(ticket.repairNote)}</p>${ticket.pointId ? '<p>Record a newer Operational point observation in Network before resolving. An active session remains owned by Charging.</p>' : ""}${act("Verify recovery and resolve", "resolve", attrs, true)}</div>` : ""}
        ${ticket.status === "Resolved" ? act("Close incident", "close", attrs, true) : ""}
        <h3>Evidence & activity</h3>${history(data.incidentHistory.filter(h => h.incidentId === ticket.incidentId))}` : empty("Select an incident", "Report a fault below or inspect the queue."))}</div>
      ${panel("Report a resource fault", `<form class="fi-form" data-action="report" data-draft="report"><div class="fi-form-grid">${select("resource", "Affected resource", '<optgroup label="Shared vehicles">' + data.vehicles.map(v => `<option value="vehicle:${e(v.vehicleId)}">${e(v.name)} · ${e(v.vehicleId)}</option>`).join("") + '</optgroup><optgroup label="Charging points">' + data.points.map(p => `<option value="point:${e(p.pointId)}">${e(p.pointId)}</option>`).join("") + '</optgroup>')}${select("severity", "Priority", ["Medium", "High", "Low"].map(v => `<option>${v}</option>`).join(""))}${input("faultKey", "Fault reference", 'required maxlength="80" value="reported-fault"')}<p class="fi-muted">Use the same fault reference for more evidence on an existing issue; a different reference creates an independent restriction.</p></div>${note("description", "Observed fault", "Describe the symptom and context")}<button class="button button--primary">Report and restrict resource</button></form>`)}`;
  }, {
    filter(v, t) { t.state.filter = v.filter; },
    select(v, t) { t.state.selected = v.id; },
    async report({ resource, ...values }, t) {
      const [kind, id] = resource.split(":");
      const result = await t.save("incident.report", { ...values, [kind === "vehicle" ? "vehicleId" : "pointId"]: id }, "Fault recorded; the resource is restricted.");
      if (result.ok) { t.state.filter = "Active"; t.state.selected = result.data.incidentId; t.clearDraft("report"); }
    },
    async investigate(v, t) { await t.save("incident.investigate", v, "Investigation started."); },
    async plan(v, t) { await t.save("incident.plan", v, "Repair plan assigned."); },
    async repair(v, t) { await t.save("incident.repair", { ...v, complete: v.complete === "true" }, "Repair evidence saved."); },
    async resolve(v, t) { if (globalThis.confirm("Have you verified recovery? This lifts only this incident's restriction.")) { const r = await t.save("incident.resolve", { ...v, verified: true }, "Recovery verified. This incident restriction was lifted."); if (r.ok) t.state.filter = "Resolved"; } },
    async close(v, t) { const r = await t.save("incident.close", v, "Incident closed. Evidence retained."); if (r.ok) t.state.filter = "Closed"; }
  });
}
