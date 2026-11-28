import { badge } from "../../shared/components.js";
import { actionForm, button, e, input, mountRecords, panel, select, timeLabel } from "../../shared/records.js";
import {
  compareRuns, conditionLabel, conditionSpecs, conditionsOf, defaultDraft,
  metricSpecs, metricValue, scenarioFromDraft
} from "../../../modules/what-if/model.js";

const workerTimeout = 15_000;
const number = new Intl.NumberFormat("en");
const statusTone = { Running: "info", Completed: "positive", Failed: "danger" };

function evaluate(scenario, baseline) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../../modules/what-if/worker.js", import.meta.url), { type: "module" });
    const finish = (callback, value) => {
      clearTimeout(timer);
      worker.terminate();
      callback(value);
    };
    const timer = setTimeout(() => finish(reject, new Error("Simulation timed out. Try a new run.")), workerTimeout);
    worker.onmessage = ({ data }) => data.ok
      ? finish(resolve, data) : finish(reject, new Error(data.message));
    worker.onerror = () => finish(reject, new Error("The simulation worker failed."));
    worker.postMessage({ scenario, baseline });
  });
}

async function completeRun({ runId, scenario, snapshot }, api, store) {
  try {
    const { metrics, recommendations } = await evaluate(scenario, snapshot.baseline);
    const saved = await api.command("simulation.complete", { runId, metrics, recommendations });
    if (!saved.ok) throw new Error(`Could not save the result. ${saved.message}`);
  } catch (error) {
    // A previous completion may already have committed after an interrupted response.
    // The failure command is only allowed while the run is still Running.
    await api.command("simulation.fail", { runId, message: error.message });
  } finally {
    await store.refresh();
  }
}

function option(value, label, selected) {
  return `<option value="${e(value)}"${value === selected ? " selected" : ""}>${e(label)}</option>`;
}

function formatMetric(value, unit) {
  return Number.isFinite(value) ? `${number.format(value)}${unit}` : "—";
}

function formatDelta(value, unit) {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${number.format(value)}${unit === "%" ? " pp" : ""}`;
}

function conditionList(scenario) {
  return `<ul class="what-if-conditions">${conditionsOf(scenario).map(condition =>
    `<li>${e(conditionLabel(condition))}</li>`).join("")}</ul>`;
}

function configurePanel(hubs, memory) {
  const draft = { ...defaultDraft, hubId: hubs.find(hub => hub.id === "ktx-a")?.id ?? hubs[0]?.id, ...memory.draft };
  if (memory.review) {
    const scenario = memory.review;
    const hub = hubs.find(item => item.id === scenario.hubId);
    return panel("Review scenario", `<div class="what-if-review">
      <h3>${e(scenario.name)}</h3>
      <p>${e(hub?.name ?? scenario.hubId)} · ${e(scenario.horizonMinutes)} min from snapshot capture</p>
      ${conditionList(scenario)}
      ${scenario.assumptions ? `<p class="records-meta">${e(scenario.assumptions)}</p>` : ""}
      <div class="what-if-actions">
        ${button("Edit", "what-if.edit")}
        ${actionForm("what-if.save", "", "Save as ready to run")}
      </div>
    </div>`);
  }
  const fields = conditionSpecs.filter(spec => !spec.toggle).map(({ key, label }) =>
    input(key, label, `type="number" min="0" max="500" step="1" value="${e(draft[key] ?? 0)}"`)).join("");
  const toggles = conditionSpecs.filter(spec => spec.toggle).map(({ key, label }) =>
    `<label class="what-if-toggle"><input type="checkbox" name="${key}"${draft[key] === "on" ? " checked" : ""}> ${e(label)}</label>`).join("");
  if (!hubs.length) return panel("Configure scenario", '<p class="records-meta">No Hub data is available.</p>');
  return panel("Configure scenario", actionForm("what-if.review", `
    <div class="what-if-form-grid">
      ${input("name", "Scenario name", `required maxlength="90" placeholder="e.g. Morning surge" value="${e(draft.name)}"`)}
      ${select("hubId", "Affected Hub", hubs.map(hub => option(hub.id, hub.name, draft.hubId)).join(""))}
      ${input("horizonMinutes", "Duration (minutes)", `type="number" required min="15" max="1440" value="${e(draft.horizonMinutes)}"`)}
    </div>
    <fieldset class="what-if-form-group">
      <legend>Hypothetical conditions</legend>
      <p class="records-meta">Combine conditions for this Hub. Use 0 to leave a quantity out.</p>
      <div class="what-if-form-grid">${fields}
        ${select("chargingType", "Charging vehicle type", option("MOTORCYCLE", "Motorcycle", draft.chargingType)
          + option("CAR", "Car", draft.chargingType))}
      </div>
      <div class="what-if-toggles">${toggles}</div>
    </fieldset>
    <label class="field what-if-notes"><span>Assumptions (optional)</span><textarea name="assumptions" rows="2"
      maxlength="500" placeholder="e.g. Extra demand after morning classes">${e(draft.assumptions)}</textarea></label>
    `, "Review scenario"));
}

function scenarioList(scenarios, hubName) {
  return panel("Saved scenarios", scenarios.length ? `<ul class="what-if-list">${scenarios.map(scenario =>
    `<li><div class="what-if-list-copy"><strong>${e(scenario.name)}</strong>
      <span class="records-meta">${e(hubName(scenario.hubId))} · ${e(scenario.horizonMinutes)} min</span>
      ${conditionList(scenario)}</div>
      ${button("Run", "what-if.run", { scenarioId: scenario.scenarioId })}
    </li>`).join("")}</ul>` : '<p class="what-if-empty">Review and save a scenario to run it.</p>');
}

function metricTable(rows, firstLabel, secondLabel) {
  return `<div class="what-if-table-scroll" role="region" aria-label="Simulation metrics" tabindex="0">
    <table class="what-if-table">
      <thead><tr><th scope="col">Measure</th><th scope="col">${e(firstLabel)}</th>
        <th scope="col">${e(secondLabel)}</th><th scope="col">Difference</th></tr></thead>
      <tbody>${rows.map(row => `<tr><th scope="row">${e(row.label)}</th>
        <td>${formatMetric(row.a, row.unit)}</td><td>${formatMetric(row.b, row.unit)}</td>
        <td class="what-if-delta">${formatDelta(row.delta, row.unit)}</td></tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function runContext(run, scenario, hubName) {
  return `<dl class="what-if-context">
    <div><dt>Hub</dt><dd>${e(run.baseline?.name ?? hubName(scenario?.hubId))}</dd></div>
    <div><dt>Snapshot (ICT)</dt><dd>${e(timeLabel(run.capturedAt).replace(" ICT", ""))} · r${e(run.sourceRevision ?? "—")}</dd></div>
    <div><dt>Freshness</dt><dd>${e(run.baseline?.freshness ?? "Unknown")}</dd></div>
    <div><dt>Duration</dt><dd>${scenario ? `${e(scenario.horizonMinutes)} min` : "—"}</dd></div>
  </dl>`;
}

function recommendations(run, liveHub) {
  const snapshot = run.baseline;
  const summaryFields = ["vehiclesFree", "parkingFree", "parkingAdmissionFree", "chargingFree", "freshness", "status"];
  const changed = liveHub && snapshot && summaryFields.some(field =>
    Object.hasOwn(snapshot, field) && liveHub[field] !== snapshot[field]);
  return panel("Recommendations", `
    ${changed ? '<p class="what-if-warning" role="status">Hub availability or status differs from this snapshot. Recheck the live Hub before acting.</p>' : ""}
    ${run.recommendations?.length ? `<ol class="what-if-recommendations">${run.recommendations.map(text =>
      `<li>${e(text)}</li>`).join("")}</ol>` : '<p class="what-if-empty">No intervention required by this model.</p>'}
    <p class="records-meta">These are suggestions for operator review.</p>`);
}

function resultsPanel(runs, scenarios, hubs, hubName, memory) {
  const run = runs.find(item => item.runId === memory.runId) ?? runs[0];
  const scenarioName = id => scenarios.find(scenario => scenario.scenarioId === id)?.name ?? id;
  const runHistory = panel("Run history", runs.length ? `<ul class="what-if-list">${runs.map(item => `<li>
      <div class="what-if-list-copy"><strong>${e(scenarioName(item.scenarioId))}</strong>
        <span class="records-meta">${e(timeLabel(item.capturedAt))}</span>
        ${badge(item.status, statusTone[item.status])}</div>
      ${button(item.runId === run?.runId ? "Selected" : "View", "what-if.select", { runId: item.runId })}
    </li>`).join("")}</ul>` : '<p class="what-if-empty">No runs yet.</p>');
  if (!run) return `<div class="what-if-layout">${panel("Simulation result", '<p class="what-if-empty">Run a saved scenario to see its projected impact.</p>')}${runHistory}</div>`;
  const scenario = scenarios.find(item => item.scenarioId === run.scenarioId);
  const completed = run.status === "Completed" && run.metrics;
  const comparison = completed ? compareRuns(run, null, scenario, null) : null;
  const headline = completed ? `<div class="what-if-result-metrics">${[
    ["unserved", "Unserved requests", ""], ["availableCharging", "Free charging points", ""],
    ["parkingUtilization", "Parking occupancy", "%"]
  ].map(([key, label, unit]) => `<div><span>${label}</span><strong>${formatMetric(metricValue(run, key, "projected"), unit)}</strong></div>`).join("")}</div>` : "";
  return `<div class="what-if-layout">
    <div class="what-if-stack">
      ${panel("Simulation result", `<div class="what-if-result-header">
        <div><h3>${e(scenarioName(run.scenarioId))}</h3><p class="records-meta">${e(run.runId)}</p></div>
        ${badge(run.status, statusTone[run.status])}
      </div>
      ${runContext(run, scenario, hubName)}
      ${scenario ? conditionList(scenario) : ""}
      ${scenario?.assumptions ? `<p class="records-meta">Assumptions: ${e(scenario.assumptions)}</p>` : ""}
      ${headline}
      ${comparison ? `${comparison.warnings.length ? `<p class="what-if-warning">${e(comparison.warnings[0])}</p>` : ""}
        ${metricTable(comparison.rows, "Simulated", "Baseline")}
        ${run.metrics.modelVersion === 2 ? '<p class="records-meta">Charging uses 60-minute new sessions and rejects full arrivals immediately. Existing commitments hold through the horizon unless interrupted.</p>' : ""}
        ` : `<p class="what-if-empty" role="status">${e(run.error ?? (run.status === "Running"
          ? "The worker is calculating this run." : "No completed result is available for this run."))}</p>`}`)}
    </div>
    <div class="what-if-stack">${runHistory}
      ${completed ? recommendations(run, hubs.find(hub => hub.id === run.baseline?.id)) : ""}
    </div>
  </div>`;
}

function comparisonPanel(completed, scenarios, hubName, memory) {
  if (!completed.length) return panel("Compare runs", '<p class="what-if-empty">Complete a simulation to compare it with its baseline or another run.</p>');
  const runsByScenario = new Map(scenarios.map(scenario => [scenario.scenarioId, scenario]));
  const runName = run => runsByScenario.get(run.scenarioId)?.name ?? run.scenarioId;
  const choices = current => completed.map(run => option(run.runId,
    `${runName(run)} · ${timeLabel(run.finishedAt)} · ${run.runId.slice(-6)}`, current)).join("");
  const first = completed.find(run => run.runId === memory.comparison?.first);
  const second = completed.find(run => run.runId === memory.comparison?.second);
  const referenceMissing = memory.comparison?.second && !second;
  const comparison = first && !referenceMissing ? compareRuns(first, second, runsByScenario.get(first.scenarioId),
    runsByScenario.get(second?.scenarioId)) : null;
  return panel("Compare runs", `
    ${actionForm("what-if.compare", select("first", "Selected run", choices(memory.comparison?.first))
      + select("second", "Compare with", option("baseline", "Its captured baseline", memory.comparison?.second ?? "baseline")
        + choices(memory.comparison?.second)), "Compare")}
    ${comparison ? `<div class="what-if-comparison">
      ${comparison.warnings.length ? `<ul class="what-if-warning">${comparison.warnings.map(warning => `<li>${e(warning)}</li>`).join("")}</ul>` : ""}
      <div class="what-if-comparison-context"><section><h3>${e(runName(first))}</h3>
        ${runContext(first, runsByScenario.get(first.scenarioId), hubName)}</section>
        ${second ? `<section><h3>${e(runName(second))}</h3>${runContext(second, runsByScenario.get(second.scenarioId), hubName)}</section>` : ""}
      </div>
      ${metricTable(comparison.rows, "Selected run", second ? "Compared run" : "Baseline")}
      ${second ? `<div class="what-if-comparison-context"><section><h3>Selected run recommendations</h3>
        <p>${e(first.recommendations?.join(" ") || "No intervention required.")}</p></section>
        <section><h3>Compared run recommendations</h3><p>${e(second.recommendations?.join(" ") || "No intervention required.")}</p></section></div>` : ""}
    </div>` : '<p class="what-if-empty">Choose a result and its reference to see the metric differences.</p>'}`);
}

const views = [["setup", "Scenario setup"], ["results", "Results"], ["compare", "Compare"]];
const readOnly = message => ({ ok: true, readOnly: true, message });

export function mount(root, context) {
  let draftData;
  const captureDraft = event => {
    const form = event.target.closest('form[data-operation="what-if.review"]');
    if (form) draftData = Object.fromEntries(new FormData(form));
  };
  root.addEventListener("input", captureDraft);
  root.addEventListener("change", captureDraft);
  const cleanup = mountRecords(root, context, ({ hubs, scenarios, runs }, _, memory) => {
    const view = memory.view ?? "setup";
    if (draftData) memory.draft = draftData;
    const hubName = id => hubs.find(hub => hub.id === id)?.name ?? id ?? "—";
    const completed = runs.filter(run => run.status === "Completed" && run.metrics);
    return `<div class="what-if-page">
      <header class="what-if-heading"><div><h1>What-if Simulation</h1>
        <p>Explore how demand or outages could affect a Hub using a saved snapshot.</p></div>
        ${badge("Simulation only", "info")}</header>
      <nav aria-label="What-if views" class="what-if-nav">${views.map(([id, label]) =>
        `<button type="button" data-operation="what-if.view" data-input='{"view":"${id}"}'
          aria-current="${view === id ? "page" : "false"}">${label}</button>`).join("")}</nav>
      ${view === "setup" ? `<div class="what-if-layout">${configurePanel(hubs, memory)}${scenarioList(scenarios, hubName)}</div>`
        : view === "results" ? resultsPanel(runs, scenarios, hubs, hubName, memory)
        : comparisonPanel(completed, scenarios, hubName, memory)}
    </div>`;
  }, {
    "what-if.view"({ view }, { memory }) {
      if (views.some(([id]) => id === view)) memory.view = view;
      return readOnly("");
    },
    "what-if.review"(draft, { memory, store }) {
      draftData = draft;
      memory.draft = draft;
      try {
        memory.review = scenarioFromDraft(draft, store.readSnapshot().hubs);
        return readOnly("Scenario ready for review.");
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
    "what-if.edit"(_, { memory }) {
      memory.review = null;
      return readOnly("");
    },
    async "what-if.save"(_, { memory, api }) {
      if (!memory.review) return { ok: false, message: "Review the scenario first." };
      const result = await api.command("simulation.configure", memory.review);
      if (result.ok) {
        memory.review = null;
        memory.draft = { ...defaultDraft, hubId: memory.draft.hubId };
        draftData = null;
      }
      return { ...result, message: result.ok ? "Scenario saved and ready to run." : result.message };
    },
    async "what-if.run"(input, { api, store, memory }) {
      const started = await api.command("simulation.start", input);
      if (!started.ok) return started;
      memory.view = "results";
      memory.runId = started.data.runId;
      void completeRun(started.data, api, store);
      return { ok: true, message: "Simulation started." };
    },
    "what-if.select"({ runId }, { memory }) {
      memory.runId = runId;
      return readOnly("");
    },
    "what-if.compare"({ first, second }, { memory, store }) {
      const available = store.readSnapshot().runs.filter(run => run.status === "Completed" && run.metrics);
      if (!available.some(run => run.runId === first) || (second !== "baseline" && !available.some(run => run.runId === second))) {
        return { ok: false, message: "Choose completed results to compare." };
      }
      if (first === second) return { ok: false, message: "Choose a different run or compare with its baseline." };
      memory.comparison = { first, second: second === "baseline" ? null : second };
      return readOnly("Comparison updated.");
    }
  });
  return () => {
    root.removeEventListener("input", captureDraft);
    root.removeEventListener("change", captureDraft);
    cleanup();
  };
}
