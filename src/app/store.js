const KEY = "smart-hub-demo-v1";

const seed = {
  version: 1,
  role: "student",
  hubs: [
    { id: "ktx-a", name: "KTX Khu A", area: "Student residences", parkingFree: 24, parkingTotal: 80, vehiclesFree: 6, chargingActive: 4, chargingTotal: 6, freshness: "Live" },
    { id: "ktx-b", name: "KTX Khu B", area: "Residential", parkingFree: 18, parkingTotal: 90, vehiclesFree: 3, chargingActive: 3, chargingTotal: 4, freshness: "Live" },
    { id: "metro", name: "Ga Metro ĐHQG", area: "Transit gateway", parkingFree: 3, parkingTotal: 40, vehiclesFree: 22, chargingActive: 2, chargingTotal: 4, freshness: "Near full" },
    { id: "hcmut", name: "Trường ĐH Bách khoa", area: "University", parkingFree: 10, parkingTotal: 50, vehiclesFree: 9, chargingActive: 3, chargingTotal: 6, freshness: "Stale" }
  ]
};

function clone(value) { return structuredClone(value); }
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version === 1 && Array.isArray(saved.hubs)) return saved;
  } catch { /* Private browsing or invalid old data: use the seed. */ }
  return clone(seed);
}

let state = load();
const listeners = new Set();

export const store = {
  readSnapshot: () => clone(state),
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  setRole(role) {
    if (role !== "student" && role !== "operator") return;
    state = { ...state, role };
    persist();
  },
  resetDemo() { state = clone(seed); persist(); }
};

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Continue in memory. */ }
  for (const listener of listeners) listener(store.readSnapshot());
}
