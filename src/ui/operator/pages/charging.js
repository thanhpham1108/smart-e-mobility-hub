import { badge, escapeHtml } from "../../shared/components.js";
import {
  chargingCommand, chargingVehicleType, getChargingOverview
} from "../../../modules/smart-charging/service.js";

const minute = 60_000;
const slot = 30 * minute;
const slotCount = 6;
const day = 24 * 60 * minute;
const commitmentStates = new Set(["Scheduled", "Charging", "Suspended"]);
const statusTones = { Scheduled: "info", Charging: "positive", Suspended: "warning" };
const pointGroups = [
  { type: "MOTORCYCLE", label: "Motorcycles", pointLabel: "Motorcycle points" },
  { type: "CAR", label: "Cars", pointLabel: "Car points" }
];
const pointStatusLabels = { Faulty: "Fault" };
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit"
});
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "short", year: "numeric"
});
const dateInputFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"
});

function dateKey(value) {
  const fields = Object.fromEntries(dateInputFormat.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function dayStart(date) {
  return Date.parse(`${date}T00:00:00+07:00`);
}

function time(value, now = value) {
  if (!Number.isFinite(new Date(value).getTime()) || value == null) return "—";
  const sameDay = dateFormat.format(new Date(value)) === dateFormat.format(new Date(now));
  const hours = timeFormat.format(new Date(value));
  return sameDay ? hours : `${dateFormat.format(new Date(value))}, ${hours}`;
}

function condition(point) {
  if (point.reconciliationHold) return "Reconciliation hold";
  if (["Maintenance", "Faulty"].includes(point.status)) return point.status;
  if (point.activeRestrictionIds?.length) return "Restricted";
  return point.status;
}

function pointRows(overview, sessions) {
  const requests = new Map(overview.requests.map(request => [request.requestId, request]));
  const commitments = new Map();
  for (const allocation of overview.allocations) {
    const request = requests.get(allocation.requestId);
    if (request && commitmentStates.has(request.status)) {
      commitments.set(allocation.pointId, { allocation, request });
    }
  }
  return overview.points.map(point => {
    const commitment = commitments.get(point.pointId);
    const pointSessions = sessions.filter(item => item.pointId === point.pointId);
    const session = commitment && pointSessions.find(item => item.sessionId === commitment.request.activeSessionId);
    const history = pointSessions.map(item => ({ ...item, requestStatus: requests.get(item.requestId)?.status }));
    return { point, condition: condition(point), ...commitment, session, history };
  });
}

function header(hubs, hubId, pointCount) {
  return `<header class="charging-heading">
    <div>
      <h1>Charging Schedule</h1>
      <p>Monitor charging points and the FCFS waitlist.</p>
    </div>
    <div class="charging-scope">
      <label for="charging-hub">Mobility Hub</label>
      <div class="charging-picker">
        <select id="charging-hub" data-focus="hub">
          ${hubs.map(hub => `<option value="${escapeHtml(hub.id)}" ${hub.id === hubId ? "selected" : ""}>${escapeHtml(hub.name)}</option>`).join("")}
        </select>
      </div>
      <span class="charging-point-count">${pointCount} ${pointCount === 1 ? "point" : "points"}</span>
    </div>
  </header>`;
}

function metrics(rows, waiting, today, now) {
  const operational = rows.filter(row => row.condition === "Operational");
  const cutoff = Date.parse(now);
  const start = dayStart(today);
  const sessionsToday = rows.flatMap(row => row.history)
    .filter(session => Date.parse(session.startedAt) >= start && Date.parse(session.startedAt) <= cutoff).length;
  const metrics = [
    ["Operational points", `${operational.length} / ${rows.length}`],
    ["Available now", operational.filter(row => !row.allocation).length],
    ["Assigned requests", rows.filter(row => row.allocation).length],
    ["Waiting requests", waiting.length],
    ["Charging sessions today", sessionsToday]
  ];
  return `<dl class="charging-metrics" aria-label="Hub charging summary">
    ${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
  </dl>`;
}

function timelineBar(row, scale, now, selectedId) {
  const { request, allocation, session } = row;
  const active = request.status !== "Scheduled";
  const actualStart = session?.startedAt ?? request.startedAt ?? allocation.startTime;
  const start = scale(active ? actualStart : allocation.startTime);
  const plannedEnd = scale(allocation.endTime);
  const current = scale(now);
  const end = Math.max(current, plannedEnd);
  const markerWidth = Math.min(4, 100 - start);
  const width = Math.max(end - start, markerWidth);
  const actual = active ? (current - start) / width * 100 : 0;
  const overdue = active && Date.parse(allocation.endTime) <= Date.parse(now);
  const label = `${request.vehicleId} · ${request.status}${overdue ? " · past planned end" : ""}`;
  const title = `${row.point.pointId} · ${label} · Planned end ${time(allocation.endTime, now)} ICT`;

  return `<button class="charging-bar charging-bar--${request.status.toLowerCase()}" type="button"
    style="--start:${start}%;--length:${width}%;--actual:${Math.max(0, actual)}%"
    data-allocation="${escapeHtml(allocation.allocationId)}" data-focus="allocation-${escapeHtml(allocation.allocationId)}"
    aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}" aria-controls="charging-session"
    aria-pressed="${allocation.allocationId === selectedId}"><span>${escapeHtml(label)}</span></button>`;
}

function historicalBar(session, scale, range, now) {
  const started = Date.parse(session.startedAt);
  const ended = session.endedAt ? Date.parse(session.endedAt) : Date.parse(now);
  if (started >= range.end || ended <= range.start || ended < started) return "";
  const start = scale(started);
  const length = scale(ended) - start;
  const label = session.endedAt ? session.requestStatus ?? "Ended" : "Charging session";
  const title = `${session.vehicleId} · ${label} · Started ${time(started, range.start)}${session.endedAt ? ` · Ended ${time(ended, range.start)}` : ""} ICT`;
  return `<span class="charging-bar charging-bar--history" style="--start:${start}%;--length:${length}%"
    role="img" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}"><span>${escapeHtml(session.vehicleId)} · ${escapeHtml(label)}</span></span>`;
}

function pointLane(row, { scale, start, end, now, live, selectedId, divisions }) {
  const operational = row.condition === "Operational";
  const state = operational ? row.request?.status ?? "Available" : row.condition;
  const status = pointStatusLabels[state] ?? state;
  const liveBar = live && row.allocation ? timelineBar(row, scale, now, selectedId) : "";
  const history = row.history.filter(session => !live || session.endedAt)
    .map(session => historicalBar(session, scale, { start, end }, now)).join("");
  const statusClass = operational ? state.toLowerCase() : "fault";
  const trackClass = live && !operational ? " charging-track--fault" : "";
  const showEmpty = !history && !liveBar && (!live || !operational);
  return `<div class="charging-lane">
    <div class="charging-lane-label">
      <strong>${escapeHtml(row.point.pointId)}</strong>
      <span>${live ? `<i class="charging-dot charging-dot--${statusClass}" aria-hidden="true"></i>${escapeHtml(status)} · ` : ""}${escapeHtml(row.point.ratedPowerKw)}&nbsp;kW</span>
    </div>
    <div class="charging-track${trackClass}">
      <div class="charging-track-grid" aria-hidden="true">${divisions}</div>
      ${history}${liveBar}
      ${showEmpty ? `<span class="charging-track-state">${live ? escapeHtml(status) : "No recorded session"}</span>` : ""}
    </div>
  </div>`;
}

function timeline(rows, now, selectedDate, today, selectedId, pointFilter) {
  const nowMs = Date.parse(now);
  const live = selectedDate === today;
  const midnight = dayStart(selectedDate);
  const start = live ? Math.max(midnight, Math.floor(nowMs / slot) * slot - 2 * slot) : midnight;
  const step = live ? slot : day / slotCount;
  const end = live ? Math.min(midnight + day, start + slotCount * slot) : midnight + day;
  const columns = Math.ceil((end - start) / step);
  const scale = value => Math.min(100, Math.max(0, (new Date(value).getTime() - start) / (end - start) * 100));
  const divisions = "<span></span>".repeat(columns);
  const legend = live
    ? [["Charging", "charging"], ["Scheduled", "scheduled"], ["Suspended", "suspended"], ["Planned", "planned"], ["Completed / ended", "history"], ["Maintenance / Fault", "fault"]]
    : [["Recorded session", "history"]];
  const groups = pointGroups.map(group => ({
    ...group, rows: rows.filter(row => chargingVehicleType(row.point) === group.type)
  }));
  const filters = [{ type: "all", label: "All points", rows }, ...groups];
  return `<section class="charging-panel" aria-labelledby="charging-timeline-heading">
    <div class="charging-panel-head">
      <div><h2 id="charging-timeline-heading">Point timeline</h2><p>${live ? "Live schedule" : "Session history"} · ICT</p></div>
      <div class="charging-date-controls">
        <label for="charging-date">Date</label>
        <input id="charging-date" type="date" value="${selectedDate}" max="${today}" data-focus="date">
        ${live ? "" : '<button class="button button--secondary" type="button" data-today>Today</button>'}
      </div>
    </div>
    <div class="charging-legend-row">
      <div class="charging-point-filters" role="group" aria-label="Filter points by vehicle type">
        ${filters.map(filter => `<button type="button" data-point-filter="${filter.type}"
          data-focus="point-filter-${filter.type}" aria-pressed="${pointFilter === filter.type}">
          ${filter.label} <small>${filter.rows.length}</small>
        </button>`).join("")}
      </div>
      <ul class="charging-legend" aria-label="Timeline legend">
        ${legend.map(([label, kind]) => `<li><i class="charging-key charging-key--${kind}" aria-hidden="true"></i>${label}</li>`).join("")}
      </ul>
    </div>
    <div class="charging-timeline-scroll" tabindex="0" role="region" aria-label="Charging point timeline" data-focus="timeline">
      <div class="charging-timeline${live ? " is-live" : ""}" style="--now:${scale(now)}%;--slots:${columns}">
        <div class="charging-axis">
          <strong class="charging-lane-label">Charging point</strong>
          <div class="charging-axis-track">
            ${Array.from({ length: columns }, (_, index) => {
              const tick = new Date(start + index * step);
              return `<time datetime="${tick.toISOString()}">${timeFormat.format(tick)}</time>`;
            }).join("")}
            ${live ? `<span class="charging-now">Now ${time(now)}</span>` : ""}
          </div>
        </div>
        ${groups.filter(group => pointFilter === "all" || group.type === pointFilter).map(group => `
          <div class="charging-point-group"><span>${group.pointLabel} · ${group.rows.length}</span></div>
          ${group.rows.length ? group.rows.map(row => pointLane(row, { scale, start, end, now, live, selectedId, divisions })).join("")
            : '<p class="charging-empty">No charging points for this vehicle type.</p>'}
        `).join("")}
      </div>
    </div>
  </section>`;
}

function eventButton(label, kind, choice, primary = false) {
  return `<button type="button" class="button button--${primary ? "primary" : "secondary"}"
    data-event="${kind}" data-focus="event-${kind}-${choice ?? ""}"
    ${choice ? `data-choice="${choice}"` : ""}>${label}</button>`;
}

function sessionActions(row) {
  const { request } = row;
  if (request.status === "Scheduled") {
    return row.condition === "Operational" ? eventButton("Confirm plug-in", "START", null, true) : "";
  }
  const stateAction = request.status === "Charging"
    ? eventButton("Suspend", "SUSPEND")
    : eventButton("Resume", "RESUME");
  const targetAction = request.status === "Charging"
    ? eventButton("Simulate target reached", "TARGET_REACHED", null, true) : "";
  return `${targetAction}${stateAction}${eventButton("Complete", "STOP", "COMPLETE")}${eventButton("Cancel", "STOP", "CANCEL")}`;
}

function sessionDetails(selected, rows, schedule, now) {
  if (!selected) return "";
  const { point, allocation, request, session } = selected;
  const alternatives = rows.filter(row => row.condition === "Operational" && !row.allocation
    && chargingVehicleType(row.point) === chargingVehicleType(request));
  const estimated = Number.isFinite(request.estimatedDurationMinutes) ? ` · Est. ${request.estimatedDurationMinutes} min` : "";
  const end = time(allocation.endTime, now);
  const timing = request.status === "Scheduled"
    ? `Start by ${time(Date.parse(allocation.startTime) + 15 * minute, now)} · Planned end ${end}`
    : `Started ${time(session?.startedAt ?? request.startedAt ?? allocation.startTime, now)} · Planned end ${end}`;
  const overdue = request.status !== "Scheduled" && Date.parse(allocation.endTime) <= Date.parse(now);
  const moveForm = request.status === "Scheduled" && alternatives.length && schedule
    ? `<form class="charging-adjust" data-adjust data-version="${schedule.version}">
        <label for="charging-move">Move to another point</label>
        <select id="charging-move" name="point" data-focus="move" required>
          <option value="">Select available point</option>
          ${alternatives.map(row => `<option value="${escapeHtml(row.point.pointId)}">${escapeHtml(row.point.pointId)}</option>`).join("")}
        </select>
        <button class="button button--secondary" type="submit" data-focus="move-submit">Save</button>
      </form>` : "";

  return `<section class="charging-panel charging-session" aria-labelledby="charging-session-heading" id="charging-session">
    <div class="charging-session-summary">
      <div>
        <div class="charging-session-title"><h2 id="charging-session-heading" tabindex="-1">${escapeHtml(request.vehicleId)}</h2>
          ${badge(request.status, statusTones[request.status])}
          ${overdue ? badge("Past planned end", "warning") : ""}</div>
        <p>${escapeHtml(point.pointId)} · Battery ${escapeHtml(request.currentBatteryPercent)}% → ${escapeHtml(request.targetBatteryPercent)}%${estimated}</p>
        <p>${timing} ICT</p>
      </div>
      <div class="charging-actions">${sessionActions(selected)}</div>
    </div>
    ${moveForm}
  </section>`;
}

function waitlist(waiting, now) {
  return `<section class="charging-panel" aria-labelledby="charging-waitlist-heading">
    <div class="charging-panel-head">
      <div><h2 id="charging-waitlist-heading">FCFS waitlist</h2><p>By submission time. Ties go to the lower battery.</p></div>
      <span class="charging-count">${waiting.length} waiting</span>
    </div>
    ${waiting.length ? `<table class="charging-queue">
      <thead><tr><th scope="col">Queue</th><th scope="col">Vehicle / request</th><th scope="col">Battery</th><th scope="col">Submitted</th><th scope="col">Requested window</th><th scope="col">Reason</th></tr></thead>
      <tbody>${waiting.map(request => `<tr>
        <td data-label="Queue">#${request.queuePosition}</td>
        <td data-label="Vehicle"><strong>${escapeHtml(request.vehicleId)}</strong><small title="${escapeHtml(request.requestId)}">${chargingVehicleType(request) === "CAR" ? "Car" : "Motorcycle"} · ${escapeHtml(request.requestId)}</small></td>
        <td data-label="Battery">${escapeHtml(request.currentBatteryPercent)}% → ${escapeHtml(request.targetBatteryPercent)}%</td>
        <td data-label="Submitted">${time(request.submittedAt, now)}</td>
        <td data-label="Requested">${time(request.requestedStart, now)} – ${time(request.requestedEnd, now)}</td>
        <td data-label="Reason">${request.full ? badge("Full", "warning") : badge("Future start", "info")}</td>
      </tr>`).join("")}</tbody>
    </table>` : '<p class="charging-empty">No vehicles are waiting for a charging point at this Hub.</p>'}
  </section>`;
}

export function mount(root, { store, api }) {
  const view = {
    hubId: store.readSnapshot().hubs[0]?.id,
    date: null,
    pointFilter: "all",
    selectedId: null,
    feedback: null
  };
  let selected;

  function render() {
    const focus = root.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
    const timelineScroll = root.querySelector(".charging-timeline-scroll");
    const { scrollLeft = 0, scrollTop = 0 } = timelineScroll ?? {};
    const state = store.readSnapshot();
    const overview = getChargingOverview(store, view.hubId);
    const pointCount = state.chargingPoints.filter(point => point.hubId === view.hubId).length;
    const title = header(state.hubs, view.hubId, pointCount);
    if (!overview.ok) {
      selected = null;
      const message = overview.code === "CHARGING_DATA_UNAVAILABLE" && !pointCount
        ? "No charging points are configured at this Hub." : overview.message;
      root.innerHTML = `<div class="charging-page">${title}<section class="charging-panel">
        <div class="charging-panel-head"><h2>Point timeline</h2></div>
        <p class="charging-empty" role="status">${escapeHtml(message)}</p>
      </section></div>`;
    } else {
      const { waiting, schedule, currentTime } = overview.data;
      const today = dateKey(currentTime);
      const selectedDate = view.date ?? today;
      const live = selectedDate === today;
      const rows = pointRows(overview.data, state.chargingSessions);
      const visibleRows = rows.filter(row => view.pointFilter === "all" || chargingVehicleType(row.point) === view.pointFilter);
      selected = visibleRows.find(row => row.allocation && row.allocation.allocationId === view.selectedId)
        ?? visibleRows.find(row => row.allocation) ?? null;
      view.selectedId = selected?.allocation.allocationId ?? null;
      root.innerHTML = `<div class="charging-page">${title}
        ${view.feedback ? `<div class="charging-feedback ${view.feedback.error ? "is-error" : ""}" role="status">${escapeHtml(view.feedback.message)}</div>` : ""}
        ${metrics(rows, waiting, today, currentTime)}
        ${timeline(rows, currentTime, selectedDate, today, view.selectedId, view.pointFilter)}
        ${live ? sessionDetails(selected, rows, schedule, currentTime) : ""}
        ${waitlist(waiting, currentTime)}
      </div>`;
      root.querySelector(".charging-timeline-scroll").scrollTo(scrollLeft, scrollTop);
    }
    if (focus) {
      const replacement = [...root.querySelectorAll("[data-focus]")].find(element => element.dataset.focus === focus);
      (replacement ?? root.querySelector("#charging-session-heading") ?? root.querySelector("#charging-hub"))?.focus({ preventScroll: true });
    }
  }

  function onChange(event) {
    if (event.target.id === "charging-date") {
      const { value, max } = event.target;
      if (value && event.target.validity.valid) view.date = value === max ? null : value;
      render();
      return;
    }
    if (event.target.id !== "charging-hub") return;
    view.hubId = event.target.value;
    view.selectedId = null;
    view.feedback = null;
    render();
  }

  async function onClick(event) {
    const filter = event.target.closest("[data-point-filter]");
    if (filter) {
      if (filter.dataset.pointFilter === view.pointFilter) return;
      view.pointFilter = filter.dataset.pointFilter;
      root.querySelector(".charging-timeline-scroll").scrollTop = 0;
      render();
      return;
    }
    if (event.target.closest("[data-today]")) {
      view.date = null;
      render();
      root.querySelector("#charging-date")?.focus();
      return;
    }
    const bar = event.target.closest("[data-allocation]");
    if (bar) {
      view.selectedId = bar.dataset.allocation;
      view.feedback = null;
      render();
      return;
    }
    const button = event.target.closest("[data-event]");
    if (!button || !selected) return;

    const { request, allocation } = selected;
    const { event: kind, choice } = button.dataset;
    button.disabled = true;
    const result = await chargingCommand(api, store, "charging.event", {
      eventId: crypto.randomUUID(),
      kind,
      requestId: request.requestId,
      vehicleId: request.vehicleId,
      pointId: allocation.pointId,
      observedAt: store.readSnapshot().demoTime,
      ...(request.activeSessionId ? { sessionId: request.activeSessionId } : {}),
      ...(choice ? { stopChoice: choice } : {}),
      ...(kind === "TARGET_REACHED" ? { batteryPercent: request.targetBatteryPercent } : {})
    });
    const needsReview = result.ok && result.data?.status === "RECONCILIATION_REQUIRED";
    view.feedback = {
      error: !result.ok || needsReview,
      message: !result.ok ? result.message : needsReview ? result.data.message
        : `${request.vehicleId} · ${result.data.status}`
    };
    render();
  }

  async function onSubmit(event) {
    const form = event.target.closest("[data-adjust]");
    if (!form || !selected) return;
    event.preventDefault();
    const pointId = new FormData(form).get("point");
    form.querySelector("button").disabled = true;
    const result = await chargingCommand(api, store, "charging.adjust", {
      allocationId: selected.allocation.allocationId, pointId, expectedVersion: Number(form.dataset.version)
    });
    view.feedback = { error: !result.ok, message: result.ok ? `Allocation moved to ${pointId}.` : result.message };
    render();
  }

  render();
  const unsubscribe = store.subscribe(render);
  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  return () => {
    unsubscribe();
    root.removeEventListener("change", onChange);
    root.removeEventListener("click", onClick);
    root.removeEventListener("submit", onSubmit);
  };
}
