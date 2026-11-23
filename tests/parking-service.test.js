import test from "node:test";
import assert from "node:assert/strict";
import { createParkingService, parkingInput, validateDraft } from "../src/modules/parking/service.js";

test("an uncertain submission survives a page reload and reuses its receipt key", async () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const calls = [];
  const api = { command: async (...args) => {
    calls.push(args);
    return calls.length === 1 ? { ok: false, code: "CONNECTION_FAILED" } : { ok: true, data: { reservationId: "existing-booking" } };
  }};
  const input = { hubId: "ktx-a" };
  const firstPage = createParkingService(api, "student", storage);
  await firstPage.command("parking.reserve", input);
  const reloadedPage = createParkingService(api, "student", storage);
  assert.deepEqual(reloadedPage.pending(), firstPage.pending());
  const blocked = await reloadedPage.command("parking.reserve", { hubId: "ktx-b" });
  assert.equal(blocked.ok, false);
  assert.equal(calls.length, 1);
  await reloadedPage.command("parking.reserve", input);
  assert.equal(calls[0][2], calls[1][2]);
  assert.equal(reloadedPage.pending(), null);
  assert.equal(data.size, 0);
});

test("a definite rejection clears the submission key for a revised request", async () => {
  const ids = [];
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const api = { command: async (_operation, _input, id) => {
    ids.push(id); return { ok: false, code: "PARKING_FULL" };
  }};
  const service = createParkingService(api, "student", storage);
  assert.match((await service.command("parking.reserve", { hubId: "ktx-a" })).message, /slot is full/);
  assert.equal(service.pending(), null);
  await service.command("parking.reserve", { hubId: "ktx-b" });
  assert.notEqual(ids[0], ids[1]);
});

test("parking input validates the grid and converts ICT independently of the browser timezone", () => {
  const draft = { hubId: "ktx-a", vehicleId: "ev", arrivalTime: "2026-10-24T09:00", departureTime: "2026-10-24T10:00" };
  assert.deepEqual(validateDraft(draft), {});
  assert.equal(parkingInput(draft).arrivalTime, "2026-10-24T02:00:00.000Z");
  assert.ok(validateDraft({ ...draft, arrivalTime: "2026-10-24T09:07" }).arrivalTime);
  assert.ok(validateDraft({ ...draft, departureTime: draft.arrivalTime }).departureTime);
  assert.ok(validateDraft({ ...draft, departureTime: "2026-11-24T10:00" }).departureTime);
});
