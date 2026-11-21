/* Standalone UI mockup. Data comes from fixtures.json; changes stay in this browser session. */
const state = { data: null, screen: "overview", sourceId: "metro", destinationId: "ktx-b", selectedVehicleIds: new Set(["EV-017", "EV-019"]), selectedOrderId: "RO-204", arrivedIds: new Set(), selectedIncidentId: "INC-041", incidentFilter: "All", validation: null };
const root = document.querySelector("#screen-root");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const hub = (id) => state.data.hubs.find((item) => item.id === id);
const vehicle = (id) => state.data.vehicles.find((item) => item.id === id);
const order = (id) => state.data.orders.find((item) => item.id === id);
const incident = (id) => state.data.incidents.find((item) => item.id === id);
const openIncidents = () => state.data.incidents.filter((item) => item.status !== "Closed");
const cssStatus = (status) => ({ Available: "green", Assigned: "blue", InTransit: "blue", PartiallyCompleted: "amber", Reported: "amber", Investigating: "amber", ActionAssigned: "amber", InRepair: "amber", AtRisk: "red", Faulted: "red", Completed: "green", Resolved: "green", Closed: "gray", Reserved: "blue", Cancelled: "gray" })[status] || "gray";
const badge = (status, label = status) => `<span class="badge ${cssStatus(status)}">${esc(label)}</span>`;
const formatTime = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const navNames = { overview: "Network Map", redistribution: "Fleet & Redistribution", incidents: "Incidents" };

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3300);
}

function head(eyebrow, title, description, actions = "") {
  return `<div class="screen-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="head-buttons">${actions}</div></div>`;
}

function overview() {
  const hubs = state.data.hubs;
  const available = hubs.reduce((sum, item) => sum + item.availableVehicles, 0);
  const occupied = hubs.reduce((sum, item) => sum + item.occupied, 0);
  const capacity = hubs.reduce((sum, item) => sum + item.capacity, 0);
  const charging = hubs.reduce((sum, item) => sum + item.chargingActive, 0);
  const chargingTotal = hubs.reduce((sum, item) => sum + item.chargingTotal, 0);
  const staleAfter = state.data.configuration.staleAfterMinutes;
  const mapMarkers = hubs.map((item) => {
    const stale = item.ageMinutes > staleAfter;
    const warn = item.availableVehicles < state.data.configuration.lowVehicleThreshold || item.occupied / item.capacity >= .85;
    return `<div class="map-marker ${stale ? "stale" : warn ? "warn" : ""}" style="left:${item.mapX}%;top:${item.mapY}%"><span class="dot"></span><span class="label"><strong>${esc(item.shortName)}</strong><small>${item.availableVehicles} available · ${item.ageMinutes}m ago</small></span></div>`;
  }).join("");
  const alerts = state.data.alerts.map((item) => `<div class="alert"><div class="alert-icon ${item.kind}">${item.kind === "danger" ? "!" : "⚠"}</div><div class="alert-copy"><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>${esc(item.requirement)} · ${esc(hub(item.hubId)?.shortName)}</small></div></div>`).join("");
  const hubCards = hubs.map((item) => {
    const pct = Math.round(item.occupied / item.capacity * 100);
    const stale = item.ageMinutes > staleAfter;
    const warn = pct >= state.data.configuration.capacityWarningPercent;
    return `<article class="card hub-card"><div class="row"><div><h3>${esc(item.name)}</h3><div class="zone">${esc(item.zone)}</div></div>${badge(stale ? "AtRisk" : warn ? "Reported" : "Available", stale ? "Stale" : warn ? "Near full" : "Live")}</div><div class="hub-metrics"><div><strong>${item.availableVehicles}</strong><small>available vehicles</small></div><div style="text-align:right"><strong>${pct}%</strong><small>parking used</small></div></div><div class="progress"><i class="${warn ? "warn" : ""}" style="width:${pct}%"></i></div></article>`;
  }).join("");
  return `${head("OPERATIONS / LIVE NETWORK", "Network overview", "Vehicle availability, Hub utilization and incident alerts across VNU-HCM.", `<button class="button secondary" data-action="simulate-fault">⚡ Simulate fault event</button><button class="button primary" data-action="go-redistribution">＋ Create redistribution</button>`)}
  <section class="kpi-grid">
    <article class="card kpi"><div class="kpi-top"><span>Available vehicles</span><b class="kpi-icon green">▣</b></div><div class="kpi-value">${available}</div><div class="kpi-sub">Across ${hubs.length} Mobility Hubs</div></article>
    <article class="card kpi"><div class="kpi-top"><span>Parking utilization</span><b class="kpi-icon cyan">▤</b></div><div class="kpi-value">${Math.round(occupied / capacity * 100)}%</div><div class="kpi-sub">${occupied} of ${capacity} spaces occupied</div></article>
    <article class="card kpi"><div class="kpi-top"><span>Charging points active</span><b class="kpi-icon amber">ϟ</b></div><div class="kpi-value">${charging}<span style="font-size:15px;color:#94a3b8"> / ${chargingTotal}</span></div><div class="kpi-sub">Live resource snapshot</div></article>
    <article class="card kpi"><div class="kpi-top"><span>Open incidents</span><b class="kpi-icon red">⚑</b></div><div class="kpi-value">${openIncidents().length}</div><div class="kpi-sub">${state.data.alerts.length} active network alerts</div></article>
  </section>
  <div class="overview-grid"><section class="card network-card"><div class="section-heading"><h2>Mobility Hub network</h2><small>Map is a schematic mockup · GMT+7</small></div><div class="map"><svg viewBox="0 0 800 360" aria-hidden="true" preserveAspectRatio="none"><rect width="800" height="360" fill="#effaf6"/><path d="M0 70 L800 70 M0 185 L800 185 M0 290 L800 290 M150 0 L150 360 M395 0 L395 360 M640 0 L640 360" stroke="#dbece6" stroke-width="22"/><path d="M0 70 L800 70 M0 185 L800 185 M0 290 L800 290 M150 0 L150 360 M395 0 L395 360 M640 0 L640 360" stroke="#ffffff" stroke-width="15"/><path d="M110 335 C200 260 190 210 255 155 C340 80 415 145 505 92 C585 45 640 110 735 65" fill="none" stroke="#a5dfcf" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 12"/><path d="M50 330 C145 276 240 335 335 278 C470 199 590 255 770 180" fill="none" stroke="#d1e5df" stroke-width="4" stroke-dasharray="8 9"/></svg>${mapMarkers}<div class="map-legend"><i></i> Normal <i class="w"></i> Attention <i class="s"></i> Stale</div></div><div class="caption">Locations and values are fixture data for the mockup. Physical vehicle locations change only after UC-F05 confirms arrival.</div></section>
  <section class="card alerts-card"><div class="section-heading"><h2>Operational alerts</h2><button class="button link" data-action="go-incidents">View tickets →</button></div>${alerts}</section></div>
  <section class="hub-section"><div class="section-heading"><h2>Hub performance</h2><small>Data freshness shown per Hub</small></div><div class="hub-grid">${hubCards}</div></section>`;
}

function inboundCommitments(destinationId) {
  return state.data.orders.filter((item) => item.destinationId === destinationId && !["Completed", "Cancelled"].includes(item.status)).reduce((count, item) => count + item.vehicleIds.filter((id) => !item.arrivedIds.includes(id)).length, 0);
}

function validateTransfer() {
  const selected = [...state.selectedVehicleIds];
  const source = hub(state.sourceId);
  const destination = hub(state.destinationId);
  const reasons = [];
  if (!source || !destination || source.id === destination.id) reasons.push("Choose two different, valid Hubs.");
  if (selected.length === 0) reasons.push("Select at least one vehicle.");
  selected.forEach((id) => {
    const item = vehicle(id);
    if (!item || item.hubId !== state.sourceId || item.status !== "Available" || item.assignmentId || item.activeRental || item.pendingReservations) reasons.push(`${id} is unavailable or has a conflicting commitment.`);
  });
  if (destination) {
    const free = destination.capacity - destination.occupied - inboundCommitments(destination.id);
    if (selected.length > free) reasons.push(`Only ${Math.max(free, 0)} destination spaces remain after existing incoming assignments.`);
    if (destination.ageMinutes > state.data.configuration.staleAfterMinutes) reasons.push("Destination Hub status is stale; refresh before assigning.");
  }
  if (source && source.ageMinutes > state.data.configuration.staleAfterMinutes) reasons.push("Source Hub status is stale; refresh before assigning.");
  return { ok: reasons.length === 0, reasons, selected };
}

function redistribution() {
  const source = hub(state.sourceId);
  const destination = hub(state.destinationId);
  const hubOptions = (selectedId) => state.data.hubs.map((item) => `<option value="${esc(item.id)}" ${item.id === selectedId ? "selected" : ""}>${esc(item.name)}</option>`).join("");
  const vehicles = state.data.vehicles.filter((item) => item.hubId === state.sourceId);
  const vehicleRows = vehicles.map((item) => `<label class="vehicle-row"><input type="checkbox" data-vehicle-id="${esc(item.id)}" ${state.selectedVehicleIds.has(item.id) ? "checked" : ""}><span><strong>${esc(item.id)}</strong><small>${esc(item.type)}</small></span><span class="battery"><span class="meter"><i style="width:${item.battery}%"></i></span>${item.battery}%</span>${badge(item.status)}<span style="color:${item.assignmentId || item.pendingReservations ? "#b45309" : "#64748b"}">${item.assignmentId ? "Assigned" : item.pendingReservations ? "Reserved" : "Clear"}</span></label>`).join("");
  const orders = [...state.data.orders].reverse().map((item) => `<article class="order-card ${item.id === state.selectedOrderId ? "selected" : ""}" data-order-id="${esc(item.id)}"><div class="order-head"><strong>${esc(item.id)}</strong>${badge(item.status)}</div><p>${esc(hub(item.sourceId)?.shortName)} → ${esc(hub(item.destinationId)?.shortName)} · ${item.vehicleIds.length} vehicle${item.vehicleIds.length > 1 ? "s" : ""}</p><small>${item.riskReason ? esc(item.riskReason) : `${item.arrivedIds.length} confirmed arrived`}</small></article>`).join("");
  const selectedOrder = order(state.selectedOrderId) || state.data.orders[0];
  const remaining = selectedOrder ? selectedOrder.vehicleIds.filter((id) => !selectedOrder.arrivedIds.includes(id)) : [];
  const arrivalRows = remaining.map((id) => `<div class="arrive-row"><label><input type="checkbox" data-arrival-id="${esc(id)}" ${state.arrivedIds.has(id) ? "checked" : ""}> ${esc(id)}</label><span>${esc(hub(vehicle(id)?.hubId)?.shortName || "Unknown")} → ${esc(hub(selectedOrder.destinationId)?.shortName)}</span></div>`).join("");
  const validation = state.validation ? `<div class="validation-box ${state.validation.ok ? "" : "error"}">${state.validation.ok ? `Feasible: ${state.validation.selected.length} eligible vehicle(s). Destination has ${destination.capacity - destination.occupied - inboundCommitments(destination.id)} uncommitted space(s).` : state.validation.reasons.map(esc).join("<br>")}</div>` : "";
  return `${head("FLEET / REDISTRIBUTION", "Plan a vehicle transfer", "Validate vehicles and destination capacity before creating an assignment.", `<button class="button secondary" data-action="go-overview">← Network overview</button>`)}
  <div class="two-col"><section class="card pad"><div class="section-heading"><h2>New assignment</h2>${badge("Assigned", "Step 1 of 2")}</div><div class="field-grid"><div class="field"><label for="source-hub">Source Hub</label><select id="source-hub">${hubOptions(state.sourceId)}</select></div><div class="field"><label for="destination-hub">Destination Hub</label><select id="destination-hub">${hubOptions(state.destinationId)}</select></div></div><p class="helper">${esc(source?.shortName)} currently has ${source?.availableVehicles} available vehicles. ${esc(destination?.shortName)} has ${destination ? destination.capacity - destination.occupied - inboundCommitments(destination.id) : 0} spaces after incoming commitments.</p><div class="subhead"><h3>Select vehicles at source</h3><small>UC-S03 checks commitments and capacity</small></div>${vehicleRows || `<div class="empty">No vehicles at this Hub in the mock fixture.</div>`}<div class="action-row"><button class="button secondary" data-action="validate-transfer">Check feasibility</button><button class="button primary" data-action="create-order" ${state.validation?.ok ? "" : "disabled"}>Create assignment →</button></div>${validation}<div class="inline-callout">Assignment creation reserves the selected vehicles for transfer. Their physical Hub and parking occupancy change only when an Operator confirms arrival.</div></section>
  <section class="card pad"><div class="section-heading"><h2>Redistribution orders</h2><small>${state.data.orders.length} order(s)</small></div>${orders}<div class="detail-divider"></div>${selectedOrder ? `<div class="section-heading"><h2>Confirm arrival · ${esc(selectedOrder.id)}</h2></div><div class="stepper"><span class="done"><i>✓</i> Assigned</span><em></em><span class="${selectedOrder.arrivedIds.length ? "done" : ""}"><i>${selectedOrder.arrivedIds.length ? "✓" : "2"}</i> In transit</span><em></em><span class="${selectedOrder.status === "Completed" ? "done" : ""}"><i>${selectedOrder.status === "Completed" ? "✓" : "3"}</i> Completed</span></div><p class="muted">Confirm only vehicles physically delivered to ${esc(hub(selectedOrder.destinationId)?.name)}.</p>${arrivalRows || `<div class="empty">All vehicles in this order are already confirmed.</div>`}<div class="action-row"><button class="button primary" data-action="confirm-arrival" ${remaining.length && selectedOrder.status !== "AtRisk" ? "" : "disabled"}>Confirm selected arrival</button></div>${selectedOrder.status === "AtRisk" ? `<div class="validation-box error">${esc(selectedOrder.riskReason)}. Resolve the conflict before confirming this transfer.</div>` : ""}` : ""}</section></div>`;
}

function incidents() {
  const list = state.data.incidents.filter((item) => state.incidentFilter === "All" || (state.incidentFilter === "Open" ? item.status !== "Closed" : item.severity === "High"));
  const ticket = incident(state.selectedIncidentId) || list[0];
  const itemRows = list.map((item) => `<article class="incident-item ${item.id === ticket?.id ? "selected" : ""}" data-incident-id="${esc(item.id)}"><div class="row"><strong>${esc(item.id)}</strong>${badge(item.severity === "High" ? "Faulted" : "Reported", item.severity)}</div><p>${esc(item.title)}</p><small>${esc(item.vehicleId)} · ${esc(hub(item.hubId)?.shortName)} · ${formatTime(item.reportedAt)}</small><div style="margin-top:7px">${badge(item.status)}</div></article>`).join("");
  const affectedVehicle = ticket ? vehicle(ticket.vehicleId) : null;
  const detail = ticket ? `<div class="incident-title"><div><div class="eyebrow">VEHICLE INCIDENT · ${esc(ticket.id)}</div><h2>${esc(ticket.title)}</h2></div>${badge(ticket.status)}</div><div class="muted">Reported ${formatTime(ticket.reportedAt)} · Source: ${esc(ticket.source)}</div><div class="info-grid"><div class="info-tile"><span>Vehicle</span><strong>${esc(ticket.vehicleId)}</strong></div><div class="info-tile"><span>Current Hub</span><strong>${esc(hub(ticket.hubId)?.name)}</strong></div><div class="info-tile"><span>Severity</span><strong>${esc(ticket.severity)}</strong></div><div class="info-tile"><span>Operating state</span><strong>${esc(affectedVehicle?.status)}</strong></div><div class="info-tile"><span>Active rental</span><strong>${affectedVehicle?.activeRental ? "Yes" : "No"}</strong></div><div class="info-tile"><span>Reservations</span><strong>${affectedVehicle?.pendingReservations || 0} affected</strong></div></div><div class="detail-divider"></div><div class="section-heading"><h2>Evidence & response</h2><small>UC-I02</small></div><p class="muted" style="line-height:1.55">${esc(ticket.description)}</p><div class="timeline"><div class="timeline-item"><strong>Incident received</strong>${esc(ticket.source)} · ${formatTime(ticket.reportedAt)}</div><div class="timeline-item"><strong>Vehicle allocation restricted</strong>New reservations and redistribution are blocked.</div><div class="timeline-item"><strong>Latest corrective action</strong>${esc(ticket.action)}</div></div><div class="field"><label for="repair-note">Corrective action / repair note</label><textarea id="repair-note" placeholder="Record technician inspection or recovery evidence..."></textarea></div><div class="incident-actions"><button class="button secondary" data-action="save-incident-note">Save progress</button><button class="button secondary" data-action="complete-repair" ${ticket.repairComplete || ["Resolved", "Closed"].includes(ticket.status) ? "disabled" : ""}>Mark repair complete</button><button class="button primary" data-action="resolve-incident" ${ticket.repairComplete && !["Resolved", "Closed"].includes(ticket.status) ? "" : "disabled"}>Resolve & restore</button><button class="button secondary" data-action="close-incident" ${ticket.status === "Resolved" ? "" : "disabled"}>Close ticket</button></div>${ticket.repairComplete ? `<div class="validation-box">Repair evidence is recorded. Verify vehicle safety and commitments before restoring eligibility.</div>` : `<div class="inline-callout">The vehicle stays restricted while repair is incomplete. Handle affected reservations or rentals under the agreed policy.</div>`}` : `<div class="empty">Select an incident to inspect its details.</div>`;
  return `${head("OPERATIONS / INCIDENTS", "Vehicle incident desk", "Review evidence, protect affected users and record repair before restoring a vehicle.", `<button class="button secondary" data-action="simulate-fault">⚡ Simulate fault telemetry</button>`)}<div class="incident-layout"><section class="card incident-list"><div class="filterline"><button class="filter-pill ${state.incidentFilter === "All" ? "active" : ""}" data-filter="All">All (${state.data.incidents.length})</button><button class="filter-pill ${state.incidentFilter === "Open" ? "active" : ""}" data-filter="Open">Open (${openIncidents().length})</button><button class="filter-pill ${state.incidentFilter === "High" ? "active" : ""}" data-filter="High">High priority</button></div>${itemRows || `<div class="empty">No tickets match this filter.</div>`}</section><section class="card pad">${detail}</section></div>`;
}

function render() {
  if (!state.data) return;
  state.screen = ["overview", "redistribution", "incidents"].includes(state.screen) ? state.screen : "overview";
  root.innerHTML = ({ overview, redistribution, incidents })[state.screen]();
  if (state.screen === "incidents") {
    const ticket = incident(state.selectedIncidentId);
    const affected = ticket && vehicle(ticket.vehicleId);
    const actions = root.querySelector(".incident-actions");
    const timeline = root.querySelector(".timeline");
    if (timeline && ticket?.commitmentResponse) timeline.insertAdjacentHTML("beforeend", `<div class="timeline-item"><strong>Affected commitment response</strong>${esc(ticket.commitmentResponse)}</div>`);
    if (timeline && ticket?.repairEvidence) timeline.insertAdjacentHTML("beforeend", `<div class="timeline-item"><strong>Repair evidence</strong>${esc(ticket.repairEvidence)}</div>`);
    if (actions && affected && (affected.pendingReservations || affected.activeRental)) {
      const button = document.createElement("button");
      button.className = "button secondary";
      button.dataset.action = "resolve-commitments";
      button.textContent = "Record commitment response";
      actions.prepend(button);
      actions.querySelector('[data-action="resolve-incident"]').disabled = true;
    }
  }
  document.querySelectorAll("[data-screen]").forEach((item) => item.classList.toggle("active", item.dataset.screen === state.screen));
  document.querySelector("#breadcrumb-current").textContent = navNames[state.screen];
  document.querySelector("#sidebar-incident-count").textContent = openIncidents().length;
  document.querySelector("#top-alert-count").textContent = openIncidents().length;
  document.querySelector("#top-date").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

function setScreen(screen) { state.screen = screen; location.hash = screen; render(); }

function createOrder() {
  const result = validateTransfer();
  state.validation = result;
  if (!result.ok) { render(); toast("Transfer validation failed. Review the reasons shown."); return; }
  const nextNumber = Math.max(...state.data.orders.map((item) => Number(item.id.split("-")[1]))) + 1;
  const newOrder = { id: `RO-${nextNumber}`, sourceId: state.sourceId, destinationId: state.destinationId, vehicleIds: result.selected, arrivedIds: [], status: "Assigned", createdAt: new Date().toISOString(), riskReason: null };
  state.data.orders.push(newOrder);
  result.selected.forEach((id) => { vehicle(id).assignmentId = newOrder.id; vehicle(id).status = "Assigned"; });
  hub(state.sourceId).availableVehicles -= result.selected.length;
  state.selectedVehicleIds.clear();
  state.selectedOrderId = newOrder.id;
  state.validation = null;
  render();
  toast(`${newOrder.id} created. Vehicle locations and Hub occupancy are unchanged.`);
}

function confirmArrival() {
  const current = order(state.selectedOrderId);
  if (!current || current.status === "AtRisk") { toast("This order needs review before arrival can be recorded."); return; }
  const selected = [...state.arrivedIds].filter((id) => current.vehicleIds.includes(id) && !current.arrivedIds.includes(id));
  if (!selected.length) { toast("Select at least one newly arrived vehicle."); return; }
  const destination = hub(current.destinationId), source = hub(current.sourceId);
  if (selected.length > destination.capacity - destination.occupied || selected.some((id) => vehicle(id).hubId !== current.sourceId || vehicle(id).assignmentId !== current.id || vehicle(id).status !== "Assigned")) { toast("Arrival cannot be verified against current Hub capacity and vehicle location."); return; }
  selected.forEach((id) => { vehicle(id).hubId = destination.id; vehicle(id).assignmentId = null; vehicle(id).status = "Available"; current.arrivedIds.push(id); source.occupied -= 1; destination.occupied += 1; destination.availableVehicles += 1; });
  current.status = current.arrivedIds.length === current.vehicleIds.length ? "Completed" : "PartiallyCompleted";
  state.arrivedIds.clear();
  render();
  toast(`${selected.length} arrival(s) confirmed; only those vehicles changed Hub.`);
}

function simulateFault() {
  const affected = vehicle("EV-014");
  const existing = state.data.incidents.find((item) => item.vehicleId === affected.id && item.status !== "Closed");
  if (existing) { state.selectedIncidentId = existing.id; setScreen("incidents"); toast("Existing open incident reused; no duplicate ticket created."); return; }
  if (affected.status === "Available") hub(affected.hubId).availableVehicles -= 1;
  affected.status = "Faulted";
  const ticket = { id: `INC-${String(42 + state.data.incidents.length - 2).padStart(3, "0")}`, vehicleId: affected.id, hubId: affected.hubId, title: "Motor temperature warning", source: "Vehicle telemetry", severity: "High", status: "Reported", reportedAt: new Date().toISOString(), description: "Newer mock telemetry reported an unsafe motor temperature. Allocation is restricted automatically.", repairComplete: false, action: "Awaiting inspection" };
  state.data.incidents.unshift(ticket);
  const assigned = state.data.orders.find((item) => item.id === affected.assignmentId && !item.arrivedIds.includes(affected.id));
  if (assigned) { assigned.status = "AtRisk"; assigned.riskReason = `${affected.id} faulted before confirmed arrival`; }
  state.data.alerts.unshift({ id: "ALT-04", kind: "danger", title: "New vehicle failure", detail: `${affected.id} restricted · ${ticket.id}`, hubId: affected.hubId, requirement: "FR-NI-02 / FR-NI-07" });
  state.selectedIncidentId = ticket.id;
  render();
  toast(`${ticket.id} created; ${assigned?.id || "vehicle"} marked at risk.`);
}

function updateIncident(action) {
  const ticket = incident(state.selectedIncidentId);
  if (!ticket) return;
  if (["Resolved", "Closed"].includes(ticket.status) && action !== "close-incident") { toast("This ticket is already resolved."); return; }
  const note = document.querySelector("#repair-note")?.value.trim();
  if (action === "save-incident-note") {
    if (!note) { toast("Enter a corrective action or repair note first."); return; }
    ticket.action = note; ticket.status = ticket.status === "Reported" ? "Investigating" : "InRepair";
    toast("Repair progress recorded. Vehicle remains restricted.");
  } else if (action === "resolve-commitments") {
    const affected = vehicle(ticket.vehicleId);
    if (!note) { toast("Record how affected reservations or rentals were handled first."); return; }
    if (!affected.pendingReservations && !affected.activeRental) return;
    affected.pendingReservations = 0;
    affected.activeRental = false;
    ticket.commitmentResponse = note;
    ticket.action = `Affected commitments handled: ${note}`;
    ticket.status = "Investigating";
    toast("Commitment response recorded; vehicle remains restricted.");
  } else if (action === "complete-repair") {
    if (!note) { toast("Enter repair and safety inspection evidence first."); return; }
    ticket.action = note; ticket.repairEvidence = note; ticket.repairComplete = true; ticket.status = "InRepair";
    toast("Repair completion recorded. Restoration still needs confirmation.");
  } else if (action === "resolve-incident") {
    const affected = vehicle(ticket.vehicleId);
    if (!ticket.repairComplete || !ticket.repairEvidence || affected.activeRental || affected.pendingReservations) { toast("Resolve affected commitments and record completed repair first."); return; }
    affected.status = affected.assignmentId ? "Assigned" : "Available";
    ticket.status = "Resolved"; ticket.action = "Repair verified; eligibility restored";
    if (!affected.assignmentId) hub(affected.hubId).availableVehicles += 1;
    toast("Incident resolved and vehicle eligibility restored.");
  } else if (action === "close-incident" && ticket.status === "Resolved") {
    ticket.status = "Closed"; toast("Ticket closed.");
  }
  render();
}

document.querySelectorAll("[data-screen]").forEach((item) => item.addEventListener("click", () => setScreen(item.dataset.screen)));
root.addEventListener("click", (event) => {
  const screen = event.target.closest("[data-action]")?.dataset.action;
  const selectedOrder = event.target.closest("[data-order-id]")?.dataset.orderId;
  const selectedIncident = event.target.closest("[data-incident-id]")?.dataset.incidentId;
  const filter = event.target.closest("[data-filter]")?.dataset.filter;
  if (selectedOrder) { state.selectedOrderId = selectedOrder; state.arrivedIds.clear(); render(); return; }
  if (selectedIncident) { state.selectedIncidentId = selectedIncident; render(); return; }
  if (filter) { state.incidentFilter = filter; render(); return; }
  if (!screen) return;
  if (screen.startsWith("go-")) { setScreen(screen.slice(3)); return; }
  if (screen === "validate-transfer") { state.validation = validateTransfer(); render(); return; }
  if (screen === "create-order") { createOrder(); return; }
  if (screen === "confirm-arrival") { confirmArrival(); return; }
  if (screen === "simulate-fault") { simulateFault(); return; }
  if (["save-incident-note", "resolve-commitments", "complete-repair", "resolve-incident", "close-incident"].includes(screen)) updateIncident(screen);
});
root.addEventListener("change", (event) => {
  if (event.target.id === "source-hub") { state.sourceId = event.target.value; state.selectedVehicleIds.clear(); state.validation = null; render(); }
  if (event.target.id === "destination-hub") { state.destinationId = event.target.value; state.validation = null; render(); }
  if (event.target.dataset.vehicleId) { event.target.checked ? state.selectedVehicleIds.add(event.target.dataset.vehicleId) : state.selectedVehicleIds.delete(event.target.dataset.vehicleId); state.validation = null; render(); }
  if (event.target.dataset.arrivalId) { event.target.checked ? state.arrivedIds.add(event.target.dataset.arrivalId) : state.arrivedIds.delete(event.target.dataset.arrivalId); }
});
document.querySelector(".notification-button").addEventListener("click", () => setScreen("incidents"));
window.addEventListener("hashchange", () => { state.screen = location.hash.slice(1) || "overview"; render(); });
fetch("fixtures.json").then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then((data) => { state.data = data; state.screen = location.hash.slice(1) || "overview"; render(); }).catch((error) => { root.innerHTML = `<section class="card pad"><h1>Mock data unavailable</h1><p>Start a local HTTP server in this folder and reload the page.</p><code>${esc(error.message)}</code></section>`; });
