import { escapeHtml, pageHeader } from "../../shared/components.js";

const times = ["08:00", "08:15", "08:30", "08:45", "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00"];

export function mount(root, { store }) {
  const state = { hubId: "ktx-a", date: "2026-10-24", arrival: "09:00", departure: "11:00" };
  let unsubscribe = () => {};

  function render() {
    const hubs = store.readSnapshot().hubs;
    const selected = hubs.find(hub => hub.id === state.hubId) || hubs[0];
    root.innerHTML = `${pageHeader("Parking & Private EV", "Your space. Your schedule.", "Choose a campus Hub and preview parking for your whole visit.", '<span class="badge badge--info">Foundation demo</span>')}
      <div class="parking-layout"><section class="card parking-form" aria-label="Parking preview">
        <h2>1 &nbsp; Choose your Hub</h2><div class="hub-picker">${hubs.slice(0, 3).map(hub => `<button type="button" class="hub-choice ${state.hubId === hub.id ? "is-selected" : ""}" data-hub="${escapeHtml(hub.id)}" aria-pressed="${state.hubId === hub.id}"><strong>${escapeHtml(hub.name)}</strong><small>${escapeHtml(hub.area)}</small><span>${hub.parkingFree} spaces free in seed data</span></button>`).join("")}</div>
        <hr class="section-divider"><h2>2 &nbsp; Plan your visit</h2><div class="parking-fields"><div class="field"><label for="parking-date">Parking date</label><input id="parking-date" type="date" value="${state.date}"></div><div class="field"><label for="parking-arrival">Arrival</label><select id="parking-arrival">${times.map(time => `<option ${time === state.arrival ? "selected" : ""}>${time}</option>`).join("")}</select></div><div class="field"><label for="parking-departure">Departure</label><select id="parking-departure">${times.map(time => `<option ${time === state.departure ? "selected" : ""}>${time}</option>`).join("")}</select></div></div>
        <p class="parking-note" id="parking-feedback" role="status">Choose a Hub and visit time to preview the shared layout.</p>
        <hr class="section-divider"><h2>3 &nbsp; Your vehicle</h2><p style="margin-bottom:0;color:var(--color-muted);font-size:14px">Vehicle selection and reservation rules will be added by the Parking feature owner.</p>
      </section><aside class="card parking-summary" aria-label="Visit summary"><div class="parking-summary__head"><p class="eyebrow">Your visit at a glance</p><h2>Reservation summary</h2></div><div class="parking-summary__body"><div class="parking-map" aria-hidden="true">Campus access · ${escapeHtml(selected.name)}</div><strong>${escapeHtml(selected.name)}</strong><p style="color:var(--color-muted);font-size:13px">${escapeHtml(selected.area)}</p><div class="summary-row"><span>Date</span><strong id="summary-date">${escapeHtml(state.date)}</strong></div><div class="summary-row"><span>Arrival</span><strong id="summary-arrival">${escapeHtml(state.arrival)}</strong></div><div class="summary-row"><span>Departure</span><strong id="summary-departure">${escapeHtml(state.departure)}</strong></div><button type="button" class="button button--primary" disabled title="Reservation service is not implemented yet">Review reservation</button><p class="parking-summary__caption">Preview only; no space has been reserved.</p></div></aside></div>`;
  }

  function onClick(event) {
    const choice = event.target.closest("[data-hub]");
    if (!choice || !root.contains(choice)) return;
    state.hubId = choice.dataset.hub;
    render();
  }
  function onChange(event) {
    if (!root.contains(event.target)) return;
    if (event.target.id === "parking-date") state.date = event.target.value;
    if (event.target.id === "parking-arrival") state.arrival = event.target.value;
    if (event.target.id === "parking-departure") state.departure = event.target.value;
    if (!["parking-date", "parking-arrival", "parking-departure"].includes(event.target.id)) return;
    const valid = state.arrival < state.departure;
    root.querySelector("#parking-feedback").textContent = valid ? "Preview updated. No reservation has been created." : "Departure must be later than arrival.";
    root.querySelector("#summary-date").textContent = state.date;
    root.querySelector("#summary-arrival").textContent = state.arrival;
    root.querySelector("#summary-departure").textContent = state.departure;
  }

  render();
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  unsubscribe = store.subscribe(render);
  return () => { unsubscribe(); root.removeEventListener("click", onClick); root.removeEventListener("change", onChange); };
}
