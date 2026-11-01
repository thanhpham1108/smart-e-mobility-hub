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
  scenarios: [],
  savedScenarioId: null,
  runs: [
    { id: "SIM-1101-03", status: "Completed", baseline: "NET-20261101-0915", capacity: 89, unserved: 78 }
  ]
};
window.appState = state;

const labels = { configure: "Configure scenario", results: "Latest result", compare: "Compare scenarios" };
const views = [...document.querySelectorAll("[data-view]")];
const navButtons = [...document.querySelectorAll("[data-screen]")];
const conditionInputs = [...document.querySelectorAll(".condition input")];
const saveButtons = [...document.querySelectorAll('[data-action="save"]')];
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
  document.querySelector("#summary-condition-count").textContent = `${state.selectedConditions.size} selected`;
  state.savedScenarioId = null;
  document.querySelector("#scenario-id").textContent = "Not saved";
  const status = document.querySelector("#scenario-status");
  status.textContent = "Draft";
  status.classList.remove("green");
  status.classList.add("amber");
  document.querySelector("#readiness-title").textContent = "Ready to validate";
  document.querySelector("#readiness-meta").textContent = "No run started";
  saveButtons.forEach((button, index) => {
    button.disabled = state.selectedConditions.size === 0;
    button.textContent = index === 0 ? "Validate & save scenario" : "Validate & save as ReadyToRun";
  });
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function saveScenario() {
  if (!state.selectedConditions.size) return;
  const before = JSON.stringify(state.liveNetwork);
  const scenario = {
    id: "SCN-1101-04",
    status: "ReadyToRun",
    conditions: [...state.selectedConditions],
    primaryHub: "Metro Station Hub",
    secondaryHub: "KTX Khu A Hub",
    startsAt: "2026-11-01T17:00:00+07:00",
    horizonMinutes: 120
  };
  state.scenarios = state.scenarios.filter((item) => item.id !== scenario.id).concat(scenario);
  state.savedScenarioId = scenario.id;
  document.querySelector("#scenario-id").textContent = scenario.id;
  const status = document.querySelector("#scenario-status");
  status.textContent = "ReadyToRun";
  status.classList.remove("amber");
  status.classList.add("green");
  document.querySelector("#readiness-title").textContent = "Ready to run";
  document.querySelector("#readiness-meta").textContent = "Saved · no run started";
  saveButtons.forEach((button) => {
    button.disabled = true;
    button.textContent = "Saved · ReadyToRun";
  });
  if (JSON.stringify(state.liveNetwork) !== before) throw new Error("Saving a scenario modified live network state");
  notify("Scenario SCN-1101-04 saved as ReadyToRun");
}

function runSimulation() {
  const scenario = state.scenarios.find((item) => item.id === state.savedScenarioId && item.status === "ReadyToRun");
  if (!scenario) throw new Error("A ReadyToRun scenario is required before simulation");
  const before = JSON.stringify(state.liveNetwork);
  const isolatedState = JSON.parse(JSON.stringify(state.liveNetwork));
  isolatedState.simulatedConditions = [...scenario.conditions];
  isolatedState.serviceCapacity = 82;
  const run = { id: "SIM-1101-04", scenarioId: scenario.id, status: "Completed", baseline: state.liveNetwork.snapshotId, capacity: 82, unserved: 146, isolatedState };
  state.runs = state.runs.filter((item) => item.id !== run.id).concat(run);
  if (JSON.stringify(state.liveNetwork) !== before) throw new Error("Simulation modified live network state");
  notify("Simulation completed in isolated state");
  showScreen("results");
}

navButtons.forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screen)));
conditionInputs.forEach((input) => input.addEventListener("change", updateConditions));
saveButtons.forEach((button) => button.addEventListener("click", saveScenario));
document.querySelector('[data-action="reset"]').addEventListener("click", () => {
  conditionInputs.forEach((input) => { input.checked = ["metro", "offline", "charger"].includes(input.value); });
  updateConditions();
  notify("Scenario defaults restored");
});
window.appActions = { saveScenario, runSimulation, showScreen };
updateConditions();
