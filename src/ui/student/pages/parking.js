import { badge, pageHeader, escapeHtml as e } from "../../shared/components.js";
import { timeLabel } from "../../shared/records.js";
import { vehiclePhoto, vehiclePhotoCredits } from "../../shared/vehicle-photo.js";
import { findAlternativeHubs, getHubStatus } from "../../../modules/hub-identity/hub-service.js";
import { createParkingService, defaultDraft, parkingInput, validateDraft } from "../../../modules/parking/service.js";
import { mountStudentChargingStatus } from "../components/charging-status.js";

const tone = status => ({ Confirmed: "info", "Checked In": "info", Completed: "positive", Expired: "warning", Cancelled: "neutral" })[status] ?? "neutral";
const shortTime = value => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const detailRows = rows => `<dl class="parking-details">${rows.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl>`;
const action = (name, label, primary = false, extra = "") => `<button type="button" class="button button--${primary ? "primary" : "secondary"}" data-action="${name}" ${extra}>${e(label)}</button>`;
const capacityErrors = new Set(["PARKING_FULL", "HUB_UNAVAILABLE", "PARKING_RECONCILIATION_REQUIRED"]);

export function mount(root, { store, api, viewer, query }) {
  const service = createParkingService(api, viewer.userId);
  const draftKey = "smarthub-parking-draft-" + viewer.userId;
  let draft = defaultDraft(store.readSnapshot());
  try { draft = { ...draft, ...JSON.parse(sessionStorage.getItem(draftKey) ?? "{}") }; } catch { /* Use the default visit. */ }
  const linkedHub = getHubStatus(store.readSnapshot().hubs, query?.get("hub"));
  if (linkedHub?.status === "Operational") draft.hubId = linkedHub.id;
  let tab = "reserve";
  let review = null;
  let canSuggest = false;
  let alternatives = null;
  let selectedId = null;
  let details = null;
  let intent = null;
  let filter = "All";
  let errors = {};
  let message = "";
  let failed = false;
  let busy = false;
  let active = true;
  let detailGeneration = 0;

  root.innerHTML = '<div class="parking-page" data-parking></div><div data-charging-status></div>';
  const page = root.querySelector("[data-parking]");
  const chargingRoot = root.querySelector("[data-charging-status]");
  function feedback(text, error = false) { message = text; failed = error; }
  function saveDraft() {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* Keep the draft in memory. */ }
  }
  function clearReview() {
    review = null;
    canSuggest = false;
    alternatives = null;
  }
  function hubName(state, id) { return state.hubs.find(hub => hub.id === id)?.name ?? id; }
  function vehicleName(state, id) { return state.privateVehicles.find(vehicle => vehicle.vehicleId === id)?.name ?? id; }
  function field(name, label, control) {
    return `<label class="field"><span>${e(label)}</span>${control}<small class="parking-field-error" id="parking-error-${name}">${e(errors[name] ?? "")}</small></label>`;
  }
  function timeField(name, label) {
    return field(name, label, `<input name="${name}" type="datetime-local" step="900" value="${e(draft[name])}" required aria-invalid="${Boolean(errors[name])}" aria-describedby="parking-error-${name}">`);
  }
  function reserveContent(state) {
    const hub = state.hubs.find(item => item.id === draft.hubId);
    const selectedVehicle = state.privateVehicles.find(vehicle => vehicle.vehicleId === draft.vehicleId);
    const photo = vehiclePhoto(selectedVehicle, "parking-vehicle-photo");
    const summary = review;
    return `<div class="parking-layout">
      <form class="card parking-form" data-form="review" novalidate>
        <h2>Choose your Hub</h2>
        <div class="hub-picker">${state.hubs.map(item => `<button type="button" class="hub-choice ${draft.hubId === item.id ? "is-selected" : ""}" data-action="hub" data-id="${e(item.id)}" aria-pressed="${draft.hubId === item.id}" ${item.status !== "Operational" ? "disabled" : ""}><strong>${e(item.name)}</strong><small>${e(item.area)}</small><span>${item.status === "Operational" ? e(item.parkingFree) + " physical spaces free now" : e(item.status)}</span></button>`).join("")}</div>
        <p class="parking-field-error">${e(errors.hubId ?? "")}</p>
        <h2>Plan your visit</h2>
        <p class="records-meta">Choose times in 15-minute steps. Availability is checked across your entire visit.</p>
        <div class="parking-visit-fields">${timeField("arrivalTime", "Arrival (ICT)")}${timeField("departureTime", "Departure (ICT)")}</div>
        <hr class="section-divider">
        <h2>Your vehicle</h2>
        <div class="parking-vehicle-field">
          ${photo}
          ${field("vehicleId", "Private electric vehicle", `<select name="vehicleId" required aria-describedby="parking-error-vehicleId">${state.privateVehicles.map(vehicle => `<option value="${e(vehicle.vehicleId)}" ${draft.vehicleId === vehicle.vehicleId ? "selected" : ""}>${e(vehicle.name)} · ${vehicle.batteryLevel}% battery</option>`).join("")}</select>`)}
        </div>
        ${photo ? vehiclePhotoCredits() : ""}
        <div class="parking-actions"><button class="button button--primary" ${busy ? "disabled" : ""} type="submit">${busy ? "Checking…" : "Review availability"}</button></div>
      </form>
      <aside class="card parking-summary" aria-label="Reservation summary">
        <div class="parking-summary__head"><p class="eyebrow">Your visit</p><h2>Reservation summary</h2></div>
        <div class="parking-summary__body">
          <h3>${e(hub?.name ?? "Choose a Hub")}</h3>
          ${detailRows([["Vehicle", vehicleName(state, draft.vehicleId)], ["Arrival", draft.arrivalTime.replace("T", " ") + " ICT"], ["Departure", draft.departureTime.replace("T", " ") + " ICT"]])}
          ${summary ? `<div class="parking-notice ${summary.available ? "" : "parking-notice--warning"}">${summary.available ? "Available across all " + summary.slots.length + " slots." : "Full at " + e(timeLabel(summary.blockedSlot)) + ". Choose another Hub or interval."}</div>
            <p class="parking-deadline">Check in before <strong>${e(timeLabel(summary.expiresAt))}</strong></p>
            ${summary.available ? action("confirm", "Confirm booking", true, busy || service.pending() ? "disabled" : "") : ""}
          ` : '<p class="records-meta">Review to see whole-interval availability and your exact check-in deadline.</p>'}
          ${canSuggest ? action("find-alternatives", "Find another Hub") : ""}
          ${alternatives ? `<section class="parking-alternatives" aria-label="Alternative Hubs">
            <h3>Alternative Hubs for this visit</h3>
            ${alternatives.hubs.length ? `<ul>${alternatives.hubs.map(other =>
              `<li><span><strong>${e(other.name)}</strong><small>${e(other.area)}</small></span>
                ${action("review-alternative", "Review Hub", false, `data-id="${e(other.id)}" aria-label="Review ${e(other.name)}"`)}</li>`).join("")}</ul>`
              : '<p>No alternative Hub is confirmed available for this interval.</p>'}
            ${alternatives.incomplete ? '<p class="records-meta">Some Hubs could not be checked. Try again for current results.</p>' : ""}
          </section>` : ""}
          <p class="parking-summary__caption">Your space is held after confirmation. Charging is requested separately.</p>
        </div>
      </aside>
      ${summary ? `<section class="card parking-slots"><h2>Reviewed parking slots</h2><div class="parking-slot-list" aria-label="Capacity for each 15-minute slot">${summary.slots.map(slot => `<div class="parking-slot ${slot.free ? "" : "parking-slot--full"}"><strong>${e(shortTime(slot.start))}</strong><span>${slot.free ? e(slot.free) + " free" : "Full"}</span></div>`).join("")}</div></section>` : ""}
    </div>`;
  }
  function bookingList(state) {
    const bookings = state.parkingReservations.filter(booking => filter === "All" || booking.status === filter);
    return `<section class="card parking-form"><div class="parking-section-heading"><h2>My bookings</h2><label class="field"><span>Status</span><select name="filter">${["All", "Confirmed", "Checked In", "Completed", "Cancelled", "Expired"].map(status => `<option ${filter === status ? "selected" : ""}>${status}</option>`).join("")}</select></label></div>
      ${bookings.length ? `<div class="parking-booking-list">${bookings.map(booking => `<article class="parking-booking"><div><h3>${e(hubName(state, booking.hubId))}</h3><p>${e(vehicleName(state, booking.vehicleId))}</p><p class="records-meta">${e(timeLabel(booking.arrivalTime))} → ${e(timeLabel(booking.departureTime))}</p><small class="parking-reference">${e(booking.reservationId)}</small></div><div class="parking-booking-actions">${badge(booking.status, tone(booking.status))}${action("open", "View ticket", false, `data-id="${e(booking.reservationId)}"`)}</div></article>`).join("")}</div>` : '<div class="parking-empty"><h3>No matching bookings</h3><p>Choose another filter or reserve your next visit.</p></div>'}
    </section>`;
  }
  function ticketContent(state) {
    const lookup = `<form class="parking-lookup" data-form="lookup"><label class="field"><span>Parking ticket reference</span><input name="reference" value="${e(selectedId ?? "")}" placeholder="Paste your booking reference" required></label><button class="button button--secondary">Open ticket</button></form>`;
    if (!details) return `<section class="card parking-form"><h2>My parking ticket</h2>${lookup}<p class="records-meta">${busy ? "Loading current booking…" : "Open a booking or enter your ticket reference."}</p></section>`;
    const booking = details;
    const visit = booking.session;
    const requests = state.chargingRequests.filter(request => request.parkingReservationId === selectedId);
    const unused = requests.filter(request => ["Waiting", "Scheduled"].includes(request.status));
    const charging = requests.some(request => ["Charging", "Suspended"].includes(request.status));
    const now = Date.parse(state.demoTime);
    const inWindow = now >= Date.parse(booking.arrivalTime) && now < Date.parse(booking.expiresAt);
    const confirmed = booking.status === "Confirmed";
    const parked = booking.status === "Checked In";
    const canCancel = confirmed && now < Date.parse(booking.expiresAt) && visit?.status !== "Active" && !charging;
    const canCheckIn = confirmed && inWindow && !visit && !charging;
    return `<section class="card parking-form">
      <div class="parking-section-heading"><div><p class="eyebrow">Parking ticket</p><h2>${e(hubName(state, booking.hubId))}</h2></div>${badge(booking.status, tone(booking.status))}</div>
      <p class="parking-reference">${e(booking.reservationId)}</p>
      ${detailRows([["Vehicle", vehicleName(state, booking.vehicleId)], ["Arrival", timeLabel(booking.arrivalTime)], ["Departure", timeLabel(booking.departureTime)], ["Check-in deadline", timeLabel(booking.expiresAt)],
        ...(visit ? [["Parking space", visit.parkingSpaceId], ["Actual arrival", timeLabel(visit.actualArrival)], ["Actual departure", timeLabel(visit.actualDeparture)]] : []),
        ...(booking.expiredAt ? [["Expired at", timeLabel(booking.expiredAt)], ["Reason", booking.expiryReason]] : [])])}
      ${confirmed ? `<p class="parking-notice">Check-in opens at ${e(timeLabel(booking.arrivalTime))} and closes at ${e(timeLabel(booking.expiresAt))}.</p>` : ""}
      ${parked && now >= Date.parse(booking.departureTime) ? '<p class="parking-notice parking-notice--warning">Your booked departure has passed. The visit and occupied space remain active until checkout.</p>' : ""}
      ${booking.reconciliationRequired ? '<p class="parking-notice parking-notice--warning">The check-in deadline has passed. Cleanup needs Operator verification. Admission is unavailable.</p>' : ""}
      <h3>Linked charging</h3>
      ${requests.length ? requests.map(request => `<p class="parking-charge-link"><span class="parking-reference">${e(request.requestId)}</span> ${badge(request.status, ["Waiting", "Suspended"].includes(request.status) ? "warning" : "info")}${request.status === "Waiting" ? `<span>Queue #${e(request.queuePosition)} · ${request.full ? "Full" : "Future start"}</span>` : ""}</p>`).join("") : '<p class="records-meta">No charging request linked to this visit.</p>'}
      ${intent ? `<div class="parking-confirmation" role="region" aria-label="Confirm parking action"><h3>${intent === "checkIn" ? "Confirm your arrival" : intent === "cancel" ? "Confirm cancellation" : "Confirm departure"}</h3>
        <p>${intent === "checkIn" ? "Confirm that you are arriving with the vehicle at the Hub shown on this ticket." : `This will release the remaining parking allocation and cancel ${unused.length} unused charging request(s).`}</p>
        ${intent === "checkOut" && charging ? '<p class="parking-notice parking-notice--warning">Complete or stop charging below. After the stop is confirmed, review checkout again.</p>' :
          action("commit-" + intent, intent === "checkIn" ? "Confirm check-in" : intent === "cancel" ? "Confirm cancellation" : "Confirm checkout", true, busy || service.pending() ? "disabled" : "")}
        ${action("dismiss", "Back", false, busy ? "disabled" : "")}</div>` : `<div class="parking-actions">
        ${confirmed ? action("prepare-checkIn", "Check in", true, !canCheckIn ? "disabled" : "") + action("prepare-cancel", "Cancel booking", false, !canCancel ? "disabled" : "") : ""}
        ${parked ? action("prepare-checkOut", "Check out", true) : ""}${action("refresh", "Refresh details")}</div>`}
      <details class="parking-ticket-lookup"><summary>Open another ticket</summary>${lookup}</details>
    </section>`;
  }
  function render() {
    if (!active) return;
    const state = store.readSnapshot();
    page.innerHTML = `${pageHeader("Parking & Private EV", "Your space. Your schedule.", "Choose a campus Hub and reserve parking for your whole visit.",
      `<span class="parking-clock">Demo · ${e(timeLabel(state.demoTime))}</span>`)}
      <nav class="parking-tabs" aria-label="Parking views">${[["reserve", "Reserve parking"], ["ticket", "My parking ticket"], ["bookings", "My bookings"]].map(([name, label]) => `<button type="button" data-action="tab" data-tab="${name}" ${tab === name ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</nav>
      <p class="parking-feedback ${failed ? "parking-feedback--error" : ""}" role="${failed ? "alert" : "status"}">${e(message)}</p>
      ${service.pending() ? `<div class="parking-notice parking-notice--warning"><p>A submission still needs confirmation from the database.</p>${action("resolve", "Resolve previous submission", false, busy ? "disabled" : "")}</div>` : ""}
      ${tab === "reserve" ? reserveContent(state) : tab === "bookings" ? bookingList(state) : ticketContent(state)}`;
    if (busy) page.querySelectorAll("button, [data-form=review] input, [data-form=review] select")
      .forEach(control => { control.disabled = true; });
    chargingRoot.hidden = tab !== "ticket" && tab !== "bookings";
  }
  async function loadDetails(id) {
    const generation = ++detailGeneration;
    const result = await service.read("parking.detail", { reservationId: id });
    if (!active || generation !== detailGeneration) return;
    if (result.ok) {
      if (details && details.summaryVersion !== result.data.summaryVersion && intent) {
        intent = null;
        feedback("Booking details changed. Review the latest state before confirming.");
      }
      details = result.data;
    } else { details = null; intent = null; feedback(result.message, true); }
  }
  async function write(operation, input) {
    const result = await service.command(operation, input);
    if (!active) return;
    if (!result.ok) {
      feedback(result.message, true);
      if (operation === "parking.reserve") {
        clearReview();
        canSuggest = capacityErrors.has(result.code);
      }
      if (["PARKING_SUMMARY_CHANGED", "CHECK_IN_WINDOW_CLOSED", "INVALID_BOOKING_TRANSITION"].includes(result.code)) intent = null;
      await store.refresh();
      if (selectedId) await loadDetails(selectedId);
      return;
    }
    feedback(operation === "parking.reserve" ? "Parking confirmed. Your ticket is ready." :
      operation === "parking.checkIn" ? "Check-in confirmed. Your visit is active." :
      operation === "parking.cancel" ? "Booking and unused charging requests cancelled." : "Checkout completed. Your parking space is released.");
    intent = null;
    selectedId = result.data.reservationId ?? selectedId;
    clearReview();
    tab = "ticket";
    const refreshed = await store.refresh();
    if (!refreshed) feedback("The action succeeded. Current booking data is unavailable. Refresh to reload.", true);
    if (selectedId) await loadDetails(selectedId);
  }
  async function run(work) {
    if (busy) return;
    busy = true;
    render();
    try { await work(); }
    catch { feedback("Unable to complete this action. Check your connection and retry.", true); }
    finally { busy = false; render(); }
  }
  async function reviewVisit() {
    clearReview();
    const result = await service.read("parking.review", parkingInput(draft));
    if (result.ok) {
      review = result.data;
      canSuggest = !review.available;
      feedback(review.available ? "Availability reviewed. Confirm the summary to reserve your visit."
        : "The whole interval is unavailable.", !review.available);
    } else {
      canSuggest = capacityErrors.has(result.code);
      feedback(result.message, true);
    }
  }
  async function checkAlternativeHubs() {
    const input = parkingInput(draft);
    const candidates = findAlternativeHubs(store.readSnapshot().hubs, draft.hubId, () => true);
    const results = await Promise.all(candidates.map(async hub => ({
      hub, review: await service.read("parking.review", { ...input, hubId: hub.id })
    })));
    alternatives = {
      hubs: results.filter(item => item.review.ok && item.review.data.available).map(item => item.hub),
      incomplete: results.some(item => !item.review.ok && !capacityErrors.has(item.review.code))
    };
  }
  function change(event) {
    const { name, value } = event.target;
    if (Object.hasOwn(draft, name)) {
      draft[name] = value;
      clearReview();
      errors = {};
      saveDraft();
      // Leave the field mounted while typing. Its summary refreshes on change.
      if (event.type === "change") render();
      else page.querySelectorAll('[data-action="confirm"], [data-action="find-alternatives"], [data-action="review-alternative"]')
        .forEach(control => { control.disabled = true; });
    } else if (name === "filter") { filter = value; render(); }
  }
  function onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled || busy) return;
    const name = button.dataset.action;
    if (name === "tab") { tab = button.dataset.tab; intent = null; render(); return; }
    if (name === "hub") {
      draft.hubId = button.dataset.id;
      clearReview();
      saveDraft();
      render(); return;
    }
    if (name === "dismiss") { intent = null; render(); return; }
    run(async () => {
      if (name === "confirm") {
        if (!review?.available) return;
        await write("parking.reserve", { ...parkingInput(draft), expectedExpiresAt: review.expiresAt });
      } else if (name === "find-alternatives" && canSuggest) {
        await checkAlternativeHubs();
      } else if (name === "review-alternative" && alternatives?.hubs.some(hub => hub.id === button.dataset.id)) {
        draft.hubId = button.dataset.id;
        saveDraft();
        await reviewVisit();
      } else if (name === "resolve") {
        const pending = service.pending();
        if (pending) await write(pending.operation, pending.input);
      } else if (name === "open" || name === "refresh") {
        if (name === "open") { selectedId = button.dataset.id; details = null; intent = null; }
        tab = "ticket";
        await loadDetails(selectedId);
      } else if (name.startsWith("prepare-")) {
        await loadDetails(selectedId);
        if (details) intent = name.slice(8);
      } else if (name.startsWith("commit-") && details && intent === name.slice(7)) {
        const operation = name.slice(7);
        await write("parking." + operation, { reservationId: selectedId, hubId: details.hubId, vehicleId: details.vehicleId,
          ...(operation === "checkIn" ? {} : { expectedSummary: details.summaryVersion }) });
      }
    });
  }
  function onSubmit(event) {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (form.dataset.form === "lookup") {
      run(async () => { selectedId = data.reference.trim(); details = null; intent = null; await loadDetails(selectedId); });
      return;
    }
    draft = { ...draft, ...data };
    errors = validateDraft(draft);
    if (Object.keys(errors).length) { clearReview(); feedback("Correct the highlighted fields.", true); render(); return; }
    run(reviewVisit);
  }
  const unsubscribe = store.subscribe(async () => {
    if (selectedId) await loadDetails(selectedId);
    const editing = page.contains(document.activeElement) && document.activeElement.matches("input, select");
    if (active && !busy && !editing) render();
  });
  page.addEventListener("click", onClick);
  page.addEventListener("submit", onSubmit);
  page.addEventListener("input", change);
  page.addEventListener("change", change);
  const unmountCharging = mountStudentChargingStatus(chargingRoot, { store, api, actorId: viewer.userId });
  render();
  return () => {
    active = false;
    ++detailGeneration;
    unsubscribe();
    unmountCharging();
    page.removeEventListener("click", onClick);
    page.removeEventListener("submit", onSubmit);
    page.removeEventListener("input", change);
    page.removeEventListener("change", change);
  };
}
