const initialLiveNetwork = Object.freeze({
  version: 1842,
  snapshotId: "NET-20261101-0930",
  hubs: 6,
  vehicles: 218,
  chargingPointsOnline: 31,
  reservations: 87
});

const state = {
  liveNetwork: { ...initialLiveNetwork },
  selectedConditions: new Set(["metro", "offline", "charger"]),
  runs: [
    { id: "SIM-1101-03", status: "Completed", baseline: "NET-20261101-0915", capacity: 89, unserved: 78 },
    { id: "SIM-1101-04", status: "Completed", baseline: "NET-20261101-0930", capacity: 82, unserved: 146 }
  ]
};
window.appState = state;

const labels = { configure: "Configure scenario", results: "Latest result", compare: "Compare scenarios" };
const views = [...document.querySelectorAll("[data-view]")];
const navButtons = [...document.querySelectorAll("[data-screen]")];
const conditionInputs = [...document.querySelectorAll(".condition input")];
const runButtons = [...document.querySelectorAll('[data-action="run"]')];
const toast = document.querySelector(".toast");

function showScreen(name) {
  views.forEach((view) => view.classList.toggle("active", view.dataset.view === name));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === name));
  document.querySelector("#crumb-title").textContent = labels[name];
}

function updateConditions() {
  state.selectedConditions = new Set(conditionInputs.filter((input) => input.checked).map((input) => input.value));
  conditionInputs.forEach((input) => input.closest(".condition").classList.toggle("selected", input.checked));
  document.querySelector("#condition-count").textContent = `${state.selectedConditions.size} selected`;
  runButtons.forEach((button) => { button.disabled = state.selectedConditions.size === 0; });
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function runSimulation() {
  if (!state.selectedConditions.size) return;
  const before = JSON.stringify(state.liveNetwork);
  const isolatedState = JSON.parse(JSON.stringify(state.liveNetwork));
  isolatedState.simulatedConditions = [...state.selectedConditions];
  isolatedState.serviceCapacity = 82;
  const run = { id: "SIM-1101-04", status: "Completed", baseline: state.liveNetwork.snapshotId, capacity: 82, unserved: 146, isolatedState };
  state.runs = state.runs.filter((item) => item.id !== run.id).concat(run);
  if (JSON.stringify(state.liveNetwork) !== before) throw new Error("Simulation modified live network state");
  notify("Simulation completed in isolated state");
  showScreen("results");
}

navButtons.forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screen)));
conditionInputs.forEach((input) => input.addEventListener("change", updateConditions));
runButtons.forEach((button) => button.addEventListener("click", runSimulation));
document.querySelector('[data-action="reset"]').addEventListener("click", () => {
  conditionInputs.forEach((input) => { input.checked = ["metro", "offline", "charger"].includes(input.value); });
  updateConditions();
  notify("Scenario defaults restored");
});
updateConditions();
