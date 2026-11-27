import { badge, pageHeader } from "../../shared/components.js";
import { actionForm, button, e, input, list, mountRecords, options, panel, select, timeLabel } from "../../shared/records.js";

function evaluate(data) {
  return new Promise((resolve,reject) => {
    const worker = new Worker(new URL("../../../modules/what-if/worker.js", import.meta.url), {type:"module"});
    const timeout = setTimeout(() => finish(reject,new Error("Simulation timed out.")), 15000);
    function finish(callback, value) { clearTimeout(timeout); worker.terminate(); callback(value); }
    worker.onmessage = ({data}) => data.ok ? finish(resolve,data) : finish(reject,new Error(data.message));
    worker.onerror = () => finish(reject,new Error("Simulation worker failed."));
    worker.postMessage(data);
  });
}

const labels = {
  availableVehicles:"Available shared vehicles", availableParking:"Free parking spaces", availableCharging:"Free charging points"
};

export function mount(root, context) {
  return mountRecords(root, context, ({ hubs, scenarios, runs }, _, memory) => {
    const completed = runs.filter(run=>run.status==="Completed");
    const scenarioName = id => scenarios.find(s=>s.scenarioId===id)?.name ?? id;
    const first = completed.find(run=>run.runId===memory.first);
    const other = completed.find(run=>run.runId===memory.second);
    const runOptions = completed.map(run=>`<option value="${e(run.runId)}">${e(scenarioName(run.scenarioId))} · ${e(timeLabel(run.finishedAt))}</option>`).join("");
    return `${pageHeader("Operator Portal", "What-if Simulation", "Estimate the effect of demand or outages on a copied snapshot.")}
      ${panel("Configure scenario", actionForm("simulation.configure",
        input("name","Scenario name",'required maxlength="90"')
        + select("hubId","Affected Hub",options(hubs,"id","name"))
        + select("kind","Condition",["Charging surge","Vehicle surge","Point fault","Hub outage"].map(kind=>`<option>${kind}</option>`).join(""))
        + input("magnitude","Magnitude (arrivals per hour or points)",'type="number" min="1" value="5" required')
        + input("horizonMinutes","Horizon (minutes)",'type="number" min="15" max="1440" value="60" required'),"Save scenario"))}
      ${panel("Saved scenarios", list(scenarios, scenario=>`<article><h3>${e(scenario.name)}</h3>
        <p>${e(scenario.kind)} · ${e(scenario.hubId)} · ${scenario.horizonMinutes} min</p>
        ${button("Run simulation","simulation.run",{scenarioId:scenario.scenarioId})}</article>`,"No saved scenarios."))}
      ${panel("Run results", list(runs, run=>`<article><h3>${e(scenarioName(run.scenarioId))} ${badge(run.status)}</h3>
        <p class="records-meta">Baseline ${timeLabel(run.capturedAt)} · revision ${run.sourceRevision}</p>
        ${run.metrics ? `<p>Estimated unserved arrivals: ${run.metrics.unserved}</p>
          <p>${Object.entries(labels).map(([key,label])=>`${label}: ${run.metrics.baseline[key]} → ${run.metrics.projected[key]}`).join(" · ")}</p>
          <p>${run.recommendations.length ? run.recommendations.map(e).join(" ") : "No intervention required."}</p>` : ""}
        ${run.error ? `<p role="alert">${e(run.error)}</p>` : ""}</article>`,"No simulation runs."))}
      ${completed.length ? panel("Compare results", actionForm("simulation.compare",
        select("first","Result",runOptions) + '<label class="field"><span>Compare with</span><select name="second"><option value="">Its baseline</option>' + runOptions + '</select></label>',
        "Compare")
        + (first ? "<p>" + Object.entries(labels).map(([key,label])=>`${label}: ${first.metrics.projected[key] - (other?.metrics.projected[key] ?? first.metrics.baseline[key])}`).join(" · ") + "</p>" : "")
        + (first && other && first.sourceRevision !== other.sourceRevision ? '<p class="records-meta">These runs use different baselines.</p>' : "")) : ""}`;
  }, {
    async "simulation.run"(input,{ api, store }) {
      const started = await api.command("simulation.start",input);
      if (!started.ok) return started;
      await store.refresh();
      const { runId, scenario, snapshot } = started.data;
      try {
        const { metrics,recommendations } = await evaluate({scenario,baseline:snapshot.baseline});
        return await api.command("simulation.complete",{runId,metrics,recommendations});
      } catch (error) {
        await api.command("simulation.fail",{runId,message:error.message});
        await store.refresh();
        return {ok:false,message:error.message};
      }
    },
    "simulation.compare"(input,{ memory }) {
      Object.assign(memory,input);
      return {ok:true,readOnly:true,message:"Comparison updated."};
    }
  });
}
