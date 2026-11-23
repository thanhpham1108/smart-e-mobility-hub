import { badge, escapeHtml } from "../../shared/components.js";
import { chargingCommand, studentChargingRows } from "../../../modules/smart-charging/service.js";

const stateTone = status => ({ Waiting: "warning", Scheduled: "info", Charging: "positive", Suspended: "warning", Completed: "positive", Cancelled: "neutral", Expired: "neutral" }[status] || "neutral");
const showTime = value => value ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" }).format(Date.parse(value)) : "—";
const toICTInput = value => new Date(Date.parse(value) + 7 * 60 * 60_000).toISOString().slice(0, 16);
const fromICTInput = value => new Date(`${value}:00+07:00`).toISOString();

// Parking can mount this component in its booking view after a charging request is submitted.
export function mountStudentChargingStatus(root, { store, api, actorId }) {
  let feedback = "";
  let active = true;
  let busy = false;
  const drafts = new Map();
  function render() {
    if (!active || busy) return;
    const state = store.readSnapshot();
    const requests = studentChargingRows(store, actorId);
    const bookings = state.parkingReservations.filter(booking => booking.studentId === actorId
      && ["Confirmed", "Checked In"].includes(booking.status) && Date.parse(booking.departureTime) > Date.parse(state.demoTime)
      && (booking.status !== "Confirmed" || Date.parse(booking.expiresAt) > Date.parse(state.demoTime)))
      .map(booking => {
        const vehicle = state.privateVehicles.find(item => item.vehicleId === booking.vehicleId) || (state.vehicles ?? []).find(item => item.vehicleId === booking.vehicleId);
        const currentBatteryPercent = vehicle?.batteryLevel ?? vehicle?.batteryPercent;
        const openRequest = state.chargingRequests.some(item => item.parkingReservationId === booking.reservationId && !["Completed", "Cancelled", "Expired"].includes(item.status));
        return { ...booking, currentBatteryPercent, openRequest };
      }).filter(booking => Number.isFinite(booking.currentBatteryPercent) && booking.currentBatteryPercent < 100 && !booking.openRequest);
    root.innerHTML = `<section class="student-charging"><div class="student-charging__heading"><div><p class="eyebrow">Smart Charging</p><h2>Charging requests</h2></div><span class="student-charging__note">Estimated times are informational</span></div>
      ${feedback ? `<p class="student-charging__feedback" role="status">${escapeHtml(feedback)}</p>` : ""}
      ${bookings.length ? `<div class="student-charging__booking-list">${bookings.map(booking => {
        const saved = drafts.get(booking.reservationId) ?? {};
        const requestedStart = saved.requestedStart ?? toICTInput(Date.parse(booking.arrivalTime) > Date.parse(state.demoTime) ? booking.arrivalTime : state.demoTime);
        const requestedEnd = saved.requestedEnd ?? toICTInput(booking.departureTime);
        return `<form class="student-charging__request-form" data-submit-charging="${escapeHtml(booking.reservationId)}"><div class="student-charging__booking-heading"><div><strong>Request charging for ${escapeHtml(booking.vehicleId)}</strong><small>${escapeHtml(booking.hubId)} · Parking booking ${escapeHtml(booking.reservationId)} · Current battery ${booking.currentBatteryPercent}%</small></div><span class="badge badge--info">${escapeHtml(booking.status)}</span></div>
          <input type="hidden" name="hubId" value="${escapeHtml(booking.hubId)}"><input type="hidden" name="vehicleId" value="${escapeHtml(booking.vehicleId)}"><input type="hidden" name="currentBatteryPercent" value="${booking.currentBatteryPercent}">
          <div class="student-charging__fields"><div class="field"><label for="target-${escapeHtml(booking.reservationId)}">Target battery (%)</label><input id="target-${escapeHtml(booking.reservationId)}" name="targetBatteryPercent" type="number" min="${booking.currentBatteryPercent + 1}" max="100" value="${escapeHtml(saved.targetBatteryPercent ?? Math.min(100, booking.currentBatteryPercent + 20))}" required></div><div class="field"><label for="start-${escapeHtml(booking.reservationId)}">Requested start</label><input id="start-${escapeHtml(booking.reservationId)}" name="requestedStart" type="datetime-local" step="60" min="${toICTInput(booking.arrivalTime)}" max="${toICTInput(booking.departureTime)}" value="${escapeHtml(requestedStart)}" required></div><div class="field"><label for="end-${escapeHtml(booking.reservationId)}">Requested end</label><input id="end-${escapeHtml(booking.reservationId)}" name="requestedEnd" type="datetime-local" step="60" min="${escapeHtml(requestedStart)}" max="${toICTInput(booking.departureTime)}" value="${escapeHtml(requestedEnd)}" required></div><button class="button button--primary" type="submit">Submit request</button></div><small class="student-charging__note">A future request waits without reserving a point. If all points are in use, you join the waitlist.</small></form>`;
      }).join("")}</div>` : ""}
      ${requests.length ? `<div class="student-charging__list">${requests.map(request => `<article class="student-charging__item"><div class="student-charging__top"><div><strong>${escapeHtml(request.vehicleId)}</strong><small>${escapeHtml(request.hubId)} · ${escapeHtml(request.requestId)}</small></div>${badge(request.status, stateTone(request.status))}</div>
        <p class="student-charging__window">Requested ${escapeHtml(showTime(request.requestedStart))} to ${escapeHtml(showTime(request.requestedEnd))}</p>
        <div class="student-charging__detail">${request.status === "Waiting" ? `<strong>${request.full ? `No compatible charging point is available. You are #${request.queuePosition} on the waitlist.` : `You are #${request.queuePosition} in the queue. No point is reserved before your requested start.`}</strong>` : ""}${request.point ? `<span>Point ${escapeHtml(request.point.pointId)}</span>` : ""}${Number.isFinite(request.estimatedDurationMinutes) ? `<span>Estimated charging time: ${request.estimatedDurationMinutes} min</span>` : ""}${request.status === "Charging" || request.status === "Suspended" ? `<span>Your point remains occupied until the session is verified as stopped.</span>` : ""}</div>
        ${["Waiting", "Scheduled"].includes(request.status) ? `<button class="button button--secondary" type="button" data-cancel="${escapeHtml(request.requestId)}">Cancel request</button>` : ""}
        ${["Charging", "Suspended"].includes(request.status) ? `<div class="student-charging__actions"><button class="button button--secondary" type="button" data-stop="COMPLETE" data-request="${escapeHtml(request.requestId)}">Complete charging</button><button class="button button--danger" type="button" data-stop="CANCEL" data-request="${escapeHtml(request.requestId)}">Stop and cancel</button></div>` : ""}</article>`).join("")}</div>` : '<div class="student-charging__empty"><strong>No charging requests yet</strong><p>Submit a request from an eligible parking booking.</p></div>'}</section>`;
  }
  async function onClick(event) {
    const button = event.target.closest("[data-cancel], [data-stop]");
    if (!button || button.disabled || busy) return;
    busy = true;
    button.disabled = true;
    const result = button.dataset.cancel
      ? await chargingCommand(api, store, "charging.cancel", { requestId: button.dataset.cancel })
      : await chargingCommand(api, store, "charging.stop", {
        requestId: button.dataset.request, choice: button.dataset.stop
      });
    busy = false;
    feedback = !result.ok ? result.message
      : result.data?.status === "RECONCILIATION_REQUIRED" ? result.data.message
        : button.dataset.stop === "COMPLETE" ? "Charging marked completed. The point is released."
          : button.dataset.stop === "CANCEL" ? "Charging stopped and cancelled. The point is released."
            : "Charging request cancelled. Any held point was released.";
    render();
  }
  async function onSubmit(event) {
    const form = event.target.closest("[data-submit-charging]");
    if (!form) return;
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(form);
    const draft = {
      parkingReservationId: form.dataset.submitCharging,
      hubId: fields.get("hubId"), vehicleId: fields.get("vehicleId"),
      targetBatteryPercent: Number(fields.get("targetBatteryPercent")),
      requestedStart: fromICTInput(fields.get("requestedStart")),
      requestedEnd: fromICTInput(fields.get("requestedEnd"))
    };
    busy = true;
    form.querySelector("button").disabled = true;
    const result = await chargingCommand(api, store, "charging.submit", draft);
    busy = false;
    if (result.ok) drafts.delete(form.dataset.submitCharging);
    feedback = result.ok
      ? result.data.status === "Waiting" && result.data.reason === "Full" ? `No compatible charging point is available. Your request ${result.data.requestId} is #${result.data.queuePosition} on the waitlist.`
        : result.data.status === "Waiting" ? `Your future request ${result.data.requestId} is saved. No point is reserved yet.`
          : `Request ${result.data.requestId} is scheduled. Check the assigned point below.`
      : result.message;
    render();
  }
  render();
  function saveDraft(event) {
    const form = event.target.closest("[data-submit-charging]");
    if (form) drafts.set(form.dataset.submitCharging, Object.fromEntries(new FormData(form)));
  }
  const unsubscribe = store.subscribe(() => {
    if (!busy) feedback = "";
    if (!root.contains(document.activeElement) || !document.activeElement.matches("input")) render();
  });
  root.addEventListener("input", saveDraft);
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  return () => { active = false; unsubscribe(); root.removeEventListener("input", saveDraft); root.removeEventListener("click", onClick); root.removeEventListener("submit", onSubmit); };
}
