import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { compareRuns, evaluateScenario, scenarioFromDraft } from "../src/modules/what-if/model.js";

const sample = {
  id: "a", status: "Operational", freshness: "Live",
  vehiclesFree: 2, parkingFree: 2, parkingTotal: 3, chargingTotal: 3,
  chargingPoints: [
    { pointId: "m1", vehicleType: "MOTORCYCLE", operational: true, available: true },
    { pointId: "m2", vehicleType: "MOTORCYCLE", operational: true, available: false, commitment: "Charging" },
    { pointId: "c1", vehicleType: "CAR", operational: true, available: true }
  ]
};
const scenario = { hubId: "a", horizonMinutes: 60, conditions: [{ kind: "Charging surge", magnitude: 6 }] };
const inputBefore = structuredClone(sample);
const projected = evaluateScenario(scenario, sample).metrics.projected;
assert.deepEqual(sample, inputBefore, "Simulation mutated its input snapshot.");
assert.equal(projected.chargingRejected, 5, "Cars must not satisfy motorcycle charging demand.");
assert.equal(projected.chargingCompleted, 1);
assert.equal(projected.chargingUtilization, 67);
assert.equal(evaluateScenario({ ...scenario, conditions: [{ kind: "Hub outage", magnitude: 1 }] }, sample)
  .metrics.projected.chargingPaused, 1);
assert.throws(() => evaluateScenario(scenario, { ...sample, chargingPoints: [] }), /incomplete/);
assert.throws(() => scenarioFromDraft({ name: "Empty", hubId: "a", horizonMinutes: "60" }, [sample]), /at least one/);
const first = { ...evaluateScenario(scenario, sample), baseline: sample, capturedAt: "2026-10-24T02:00:00Z" };
const second = { ...first, capturedAt: "2026-10-24T02:15:00Z" };
const comparison = compareRuns(first, second, scenario, { ...scenario, assumptions: "After class", horizonMinutes: 120 });
assert.equal(comparison.warnings.length, 3);
assert.equal(compareRuns(first, { ...second, metrics: { ...second.metrics, modelVersion: 1 } }, scenario, scenario)
  .rows.every(row => row.delta === null), true);

const db = await PGlite.create();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  for (const file of (await readdir("supabase/migrations")).sort().filter(name => name.endsWith(".sql"))) {
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  }
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.exec(`set request.jwt.claim.sub='00000000-0000-4000-8000-000000000022';
     set request.jwt.claims='{"is_anonymous":true}';
     update app.demo_state set demo_time=demo_time+interval '20 minutes';`);
  const rpc = async (op, data, role = "operator", key = randomUUID()) =>
    (await db.query("select public.demo_command($1,$2,$3::jsonb,$4::uuid) as result",
      [role, op, JSON.stringify(data), key])).rows[0].result;
  const scenarioInput = {
    name: "Charging surge after class", hubId: "ktx-a", horizonMinutes: 120, assumptions: "Motorcycles arrive steadily.",
    conditions: [{ kind: "Charging surge", magnitude: 18, vehicleType: "MOTORCYCLE" }, { kind: "Point fault", magnitude: 1 }]
  };
  const liveState = async () => (await db.query(`select jsonb_build_object(
    'hubs',(select jsonb_agg(to_jsonb(v) order by id) from app.hubs v),
    'vehicles',(select jsonb_agg(to_jsonb(v) order by vehicle_id) from app.vehicles v),
    'parking',(select jsonb_agg(to_jsonb(v) order by reservation_id) from app.parking_reservations v),
    'requests',(select jsonb_agg(to_jsonb(v) order by request_id) from app.charging_requests v),
    'allocations',(select jsonb_agg(to_jsonb(v) order by allocation_id) from app.charging_allocations v),
    'incidents',(select jsonb_agg(to_jsonb(v) order by incident_id) from app.incident_tickets v),
    'orders',(select jsonb_agg(to_jsonb(v) order by order_id) from app.redistribution_orders v)
  ) as state`)).rows[0].state;
  const before = await liveState();

  assert.equal((await rpc("simulation.configure", scenarioInput, "student")).code, "FORBIDDEN");
  assert.equal((await rpc("simulation.configure", { ...scenarioInput, conditions: [] })).code,
    "INVALID_SIMULATION_CONDITIONS");
  const key = randomUUID();
  const saved = await rpc("simulation.configure", scenarioInput, "operator", key);
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.deepEqual(await rpc("simulation.configure", scenarioInput, "operator", key), saved);
  const runInput = { scenarioId: saved.data.scenario_id };
  const started = await rpc("simulation.start", runInput);
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.equal((await rpc("simulation.complete", { runId: started.data.runId, metrics: {}, recommendations: [] })).code,
    "INVALID_SIMULATION_RESULT");

  // The normal browser adapter maps SQL columns to camelCase.
  const baseline = started.data.snapshot.baseline;
  const result = evaluateScenario(scenarioInput, {
    ...baseline, vehiclesFree: baseline.vehicles_free, parkingFree: baseline.parking_free,
    parkingTotal: baseline.parking_total, chargingTotal: baseline.charging_total
  });
  assert.ok(result.metrics.projected.chargingRejected > 0);
  const completion = await rpc("simulation.complete", { runId: started.data.runId, ...result });
  assert.equal(completion.data?.status, "Completed", JSON.stringify(completion));
  const view = (await db.query("select public.demo_view('operator','simulation') as result")).rows[0].result;
  assert.equal(view.data.runs[0].baseline.modelVersion, 2);
  assert.ok(view.data.runs[0].recommendations.length);

  const retry = await rpc("simulation.start", runInput);
  assert.notEqual(retry.data.runId, started.data.runId);
  assert.equal((await rpc("simulation.fail", { runId: retry.data.runId, message: "Worker timed out." })).data?.status, "Failed");
  assert.deepEqual(await liveState(), before, "The simulation path changed live operational records.");
  console.log("Passed: What-if validation, immutable snapshot, charging metrics, comparison, failure and live-state isolation.");
} finally {
  await db.close();
}
