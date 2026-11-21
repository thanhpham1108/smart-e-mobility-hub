import test from "node:test";
import assert from "node:assert/strict";
import { operationalAlerts, vehicleEligible, fleetService } from "../src/modules/fleet-incident/service.js";

test("stale observations suppress capacity/shortage recommendations but retain safety discrepancies", () => {
  const data = { hubs: [{ id: "h", freshness: "Stale", vehiclesFree: 0, parkingTotal: 10, parkingFree: 0, parkingDiscrepancy: "Mismatch" }], vehicles: [], points: [] };
  assert.deepEqual(operationalAlerts(data).map(a => a.title), ["Occupancy needs verification", "Stale observations"]);
});
test("live alert thresholds are derived from policy and resource counts", () => {
  const data = { policy: { lowVehicleThreshold: 2, capacityWarningPercent: 85 }, hubs: [{ id: "h", freshness: "Live", vehiclesFree: 1, parkingTotal: 10, parkingFree: 1 }], vehicles: [], points: [] };
  assert.deepEqual(operationalAlerts(data).map(a => a.title), ["Vehicle shortage", "Parking near capacity"]);
});
test("a charging commitment excludes an otherwise available vehicle", () => {
  assert.equal(vehicleEligible({ status: "AVAILABLE", condition: "OPERATIONAL", chargingCommitted: true }), false);
  assert.equal(vehicleEligible({ status: "AVAILABLE", condition: "OPERATIONAL", chargingCommitted: false }), true);
});
test("command conflicts refresh the view and are never automatically repeated by the feature service", async () => {
  let calls = 0; let refreshes = 0;
  const service = fleetService({ async command() { calls++; return { ok: false, code: "STALE_ORDER" }; } }, { async refresh() { refreshes++; } });
  const result = await service.command("fleet.arrive", {});
  assert.equal(calls, 1); assert.equal(refreshes, 1);
  assert.match(result.message, /updated elsewhere/);
});
