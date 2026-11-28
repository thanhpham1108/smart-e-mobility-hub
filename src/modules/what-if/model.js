export const conditionSpecs = [
  { key: "charging", kind: "Charging surge", label: "Charging requests / hour", unit: "requests/h" },
  { key: "rental", kind: "Vehicle surge", label: "Rental requests / hour", unit: "requests/h" },
  { key: "parking", kind: "Parking surge", label: "Parking arrivals / hour", unit: "arrivals/h" },
  { key: "fault", kind: "Point fault", label: "Charging points to take offline", unit: "points" },
  { key: "concentration", kind: "Vehicle concentration", label: "Extra vehicles at this Hub", unit: "vehicles" },
  { key: "full", kind: "Parking full", label: "Parking reaches full capacity", toggle: true },
  { key: "outage", kind: "Hub outage", label: "Hub goes offline", toggle: true }
];

export const metricSpecs = [
  ["availableVehicles", "Available shared vehicles", ""],
  ["availableParking", "Free parking spaces", ""],
  ["parkingUtilization", "Parking occupancy", "%"],
  ["availableCharging", "Free charging points", ""],
  ["chargingUtilization", "Charging utilization", "%"],
  ["chargingRejected", "New charging requests rejected", ""],
  ["chargingCompleted", "New charging sessions completed", ""],
  ["chargingPaused", "Existing charging sessions paused", ""],
  ["unserved", "Unserved new requests", ""]
];

export const defaultDraft = {
  name: "", hubId: "", horizonMinutes: "60", assumptions: "", chargingType: "MOTORCYCLE", charging: "15"
};

export function conditionsOf(scenario) {
  return scenario?.conditions ?? (scenario?.kind ? [{ kind: scenario.kind, magnitude: scenario.magnitude }] : []);
}

export function conditionLabel({ kind, magnitude, vehicleType }) {
  const spec = conditionSpecs.find(item => item.kind === kind);
  if (!spec || spec.toggle) return spec?.kind ?? kind;
  const type = kind === "Charging surge" ? (vehicleType === "CAR" ? " · Cars" : " · Motorcycles") : "";
  return `${kind} · ${magnitude} ${spec.unit}${type}`;
}

export function scenarioFromDraft(draft, hubs) {
  const name = String(draft.name ?? "").trim();
  const assumptions = String(draft.assumptions ?? "").trim();
  const hub = hubs.find(item => item.id === draft.hubId);
  const horizonMinutes = Number(draft.horizonMinutes);
  if (!name || name.length > 90) throw new Error("Enter a scenario name of up to 90 characters.");
  if (!hub) throw new Error("Choose an available Hub selection.");
  if (!Number.isInteger(horizonMinutes) || horizonMinutes < 15 || horizonMinutes > 1440) {
    throw new Error("Enter a simulation duration between 15 and 1,440 minutes.");
  }
  if (assumptions.length > 500) throw new Error("Keep assumptions within 500 characters.");
  const conditions = [];
  for (const spec of conditionSpecs) {
    const magnitude = spec.toggle ? Number(draft[spec.key] === "on") : Number(draft[spec.key] || 0);
    if (!Number.isInteger(magnitude) || magnitude < 0 || magnitude > 500) {
      throw new Error(`${spec.label} must be a whole number from 0 to 500.`);
    }
    if (!magnitude) continue;
    if (spec.key === "fault" && Number.isFinite(hub.chargingTotal) && magnitude > hub.chargingTotal) {
      throw new Error(`This Hub only has ${hub.chargingTotal} charging points.`);
    }
    conditions.push({ kind: spec.kind, magnitude, ...(spec.key === "charging" && {
      vehicleType: draft.chargingType === "CAR" ? "CAR" : "MOTORCYCLE"
    }) });
  }
  if (!conditions.length) throw new Error("Add at least one hypothetical condition.");
  return { name, hubId: hub.id, horizonMinutes, assumptions, conditions };
}

export function metricValue(run, field, side) {
  if (field === "unserved" && side === "projected") {
    return run.metrics.projected?.unserved ?? run.metrics.unserved;
  }
  return run.metrics[side]?.[field];
}

const metricVersion = run => run.metrics.modelVersion ?? 1;
const conditionSignature = scenario => conditionsOf(scenario)
  .map(({ kind, magnitude, vehicleType }) => JSON.stringify([
    kind, magnitude, kind === "Charging surge" ? vehicleType ?? "MOTORCYCLE" : null
  ])).sort().join("|");

export function compareRuns(first, second, scenario, otherScenario) {
  const compatible = !second || metricVersion(first) === metricVersion(second);
  const warnings = [];
  if (second) {
    if (first.baseline?.id !== second.baseline?.id || scenario?.hubId !== otherScenario?.hubId) {
      warnings.push("The runs use different Hubs.");
    }
    if (first.capturedAt !== second.capturedAt || JSON.stringify(first.baseline) !== JSON.stringify(second.baseline)) {
      warnings.push("The runs use different baseline times or resource states.");
    }
    if (scenario?.horizonMinutes !== otherScenario?.horizonMinutes) warnings.push("The simulation durations differ.");
    if ((scenario?.assumptions ?? "") !== (otherScenario?.assumptions ?? "")
        || conditionSignature(scenario) !== conditionSignature(otherScenario)) {
      warnings.push("The scenario conditions or assumptions differ.");
    }
    if (!compatible) warnings.push("The runs use different versions of the simulation model. Deltas are unavailable.");
  }
  if ([first, second].some(run => run && run.baseline?.freshness !== "Live")) {
    warnings.push("At least one baseline has stale or unverified Hub data.");
  }
  const rows = metricSpecs.map(([id, label, unit]) => {
    const a = metricValue(first, id, "projected");
    const b = second ? metricValue(second, id, "projected") : metricValue(first, id, "baseline");
    return { id, label, unit, a, b, delta: compatible && Number.isFinite(a) && Number.isFinite(b) ? a - b : null };
  });
  return { warnings, rows };
}

const chargingMinutes = 60;
const rateOverHorizon = (rate, minutes) => Math.ceil(rate * minutes / 60);
const percentage = (numerator, denominator) => denominator ? Math.round(100 * numerator / denominator) : null;
const needCount = value => Number.isInteger(value) && value >= 0;

export function evaluateScenario(scenario, snapshot) {
  // The worker receives a structured clone; the projected objects below are independent
  // of the immutable baseline even when this function is called outside the worker.
  const { horizonMinutes: horizon, hubId } = scenario;
  const admissionFree = snapshot?.parkingAdmissionFree ?? snapshot?.parkingFree;
  if (!snapshot || snapshot.id !== hubId || !Number.isInteger(horizon) || horizon < 15 || horizon > 1440 ||
      ![snapshot.vehiclesFree, snapshot.parkingFree, snapshot.parkingTotal, snapshot.chargingTotal, admissionFree].every(needCount) ||
      admissionFree > snapshot.parkingFree ||
      snapshot.parkingFree > snapshot.parkingTotal || !Array.isArray(snapshot.chargingPoints) ||
      snapshot.chargingPoints.length !== snapshot.chargingTotal) {
    throw new Error("The captured Hub baseline is incomplete. Start a new run after its data is available.");
  }
  const conditions = new Map(conditionsOf(scenario).map(condition => [condition.kind, condition]));
  const strength = kind => conditions.get(kind)?.magnitude ?? 0;
  if (!conditions.size) throw new Error("This scenario has no simulation conditions.");
  const wasOnline = snapshot.status === "Operational";
  const online = wasOnline && !conditions.has("Hub outage");
  const originalPoints = snapshot.chargingPoints.filter(point => point.operational);
  const rankedPoints = [...originalPoints].sort((a, b) =>
    Number(!a.available) - Number(!b.available)
    || Number(a.commitment === "Charging") - Number(b.commitment === "Charging")
    || a.pointId.localeCompare(b.pointId));
  const faultCount = strength("Point fault");
  if (faultCount > snapshot.chargingTotal) throw new Error("The Hub has fewer charging points than this scenario requires.");
  const modeledPoints = online ? rankedPoints.slice(faultCount) : [];
  const charge = conditions.get("Charging surge");
  const targetType = charge?.vehicleType ?? "MOTORCYCLE";
  const chargingDemand = rateOverHorizon(charge?.magnitude ?? 0, horizon);
  const freeMatching = modeledPoints.filter(point => point.available && point.vehicleType === targetType).length;

  // One end time per free, compatible point. Arrivals are evenly spaced
  // and a request that cannot start immediately counts as Full in the model.
  const endTimes = Array(freeMatching).fill(0);
  let accepted = 0;
  let completed = 0;
  let newBusyMinutes = 0;
  for (let index = 0; index < chargingDemand; index++) {
    const arrival = index * 60 / charge.magnitude;
    const slot = endTimes.findIndex(end => end <= arrival);
    if (slot < 0) continue;
    const end = arrival + chargingMinutes;
    endTimes[slot] = end;
    accepted++;
    if (end <= horizon) completed++;
    newBusyMinutes += Math.min(end, horizon) - arrival;
  }

  const rentalDemand = rateOverHorizon(strength("Vehicle surge"), horizon);
  const parkingDemand = rateOverHorizon(strength("Parking surge"), horizon);
  const additionalVehicles = online ? Math.min(admissionFree, strength("Vehicle concentration")) : 0;
  const physicalOccupancy = snapshot.parkingTotal - snapshot.parkingFree;
  const parkingMadeFull = online && conditions.has("Parking full");
  const availableBeforeParking = online && !parkingMadeFull ? admissionFree - additionalVehicles : 0;
  const parked = Math.min(parkingDemand, availableBeforeParking);
  const availableBeforeRental = online ? snapshot.vehiclesFree + additionalVehicles : 0;
  const rented = Math.min(rentalDemand, availableBeforeRental);
  const unservedCharging = chargingDemand - accepted;
  const unservedParking = parkingDemand - parked;
  const unservedRental = rentalDemand - rented;
  const baselineActive = originalPoints.filter(point => point.commitment === "Charging").length;
  const modeledActive = modeledPoints.filter(point => point.commitment === "Charging").length;
  const projected = {
    availableVehicles: availableBeforeRental - rented,
    availableParking: availableBeforeParking - parked,
    parkingUtilization: percentage(parkingMadeFull ? snapshot.parkingTotal : physicalOccupancy + additionalVehicles + parked, snapshot.parkingTotal),
    availableCharging: modeledPoints.filter(point => point.available).length - (accepted - completed),
    chargingUtilization: percentage(modeledActive * horizon + newBusyMinutes, modeledPoints.length * horizon),
    chargingRejected: unservedCharging,
    chargingCompleted: completed,
    chargingPaused: Math.max(0, baselineActive - modeledActive),
    unserved: unservedCharging + unservedParking + unservedRental
  };
  const baseline = {
    availableVehicles: wasOnline ? snapshot.vehiclesFree : 0,
    availableParking: wasOnline ? admissionFree : 0,
    parkingUtilization: percentage(physicalOccupancy, snapshot.parkingTotal),
    availableCharging: wasOnline ? originalPoints.filter(point => point.available).length : 0,
    chargingUtilization: percentage(baselineActive, wasOnline ? originalPoints.length : 0),
    chargingRejected: 0, chargingCompleted: 0, chargingPaused: 0, unserved: 0
  };

  const recommendations = [];
  const alternatives = Array.isArray(snapshot.alternatives) ? snapshot.alternatives : [];
  function suggest(capacity, action) {
    const alternative = [...alternatives].filter(hub => hub[capacity] > 0)
      .sort((a, b) => b[capacity] - a[capacity])[0];
    recommendations.push(alternative ? `${action} Review ${alternative.name} first. Its captured spare capacity is ${alternative[capacity]}.`
      : `${action} The snapshot has no verified spare capacity at another Hub.`);
  }
  if (!online) recommendations.push("Confirm the outage and review nearby Hubs before redirecting new arrivals. Existing simulated sessions stay paused.");
  if (unservedCharging) {
    suggest(targetType === "CAR" ? "chargingFreeCars" : "chargingFreeMotorcycles",
      "Review compatible charging capacity to reduce Full results.");
  }
  if (unservedParking || parkingMadeFull) suggest("parkingFree", "Review parking alternatives for arrivals that could not enter.");
  if (unservedRental) suggest("vehiclesFree", "Review vehicle availability before proposing redistribution.");
  if (faultCount && online) recommendations.push("Inspect the simulated charging-point failures before planning more charging capacity.");
  if (strength("Vehicle concentration") && online && projected.availableParking === 0) {
    recommendations.push("Review vehicle distribution before the Hub runs out of parking space.");
  }
  return {
    metrics: {
      modelVersion: 2, baseline, projected, unserved: projected.unserved,
      demand: { charging: chargingDemand, parking: parkingDemand, rental: rentalDemand },
      chargingMinutes
    },
    recommendations
  };
}
