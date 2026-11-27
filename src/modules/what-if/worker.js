self.onmessage = ({ data: { scenario, baseline } }) => {
  try {
    const { kind, magnitude, horizonMinutes } = scenario;
    const base = {
      availableVehicles: baseline.vehiclesFree,
      availableParking: baseline.parkingFree,
      availableCharging: baseline.chargingFree
    };
    const projected = { ...base };
    let unserved = 0;
    let recommendations = [];
    switch (kind) {
      case "Charging surge": {
        const arrivals = Math.ceil(magnitude * horizonMinutes / 60);
        unserved = Math.max(0, arrivals - base.availableCharging);
        projected.availableCharging = Math.max(0, base.availableCharging - arrivals);
        if (unserved) recommendations = ["Review compatible charging capacity at nearby Hubs."];
        break;
      }
      case "Point fault":
        projected.availableCharging = Math.max(0, base.availableCharging - magnitude);
        recommendations = ["Investigate the simulated point faults and review spare charging capacity."];
        break;
      case "Vehicle surge": {
        const arrivals = Math.ceil(magnitude * horizonMinutes / 60);
        unserved = Math.max(0, arrivals - base.availableVehicles);
        projected.availableVehicles = Math.max(0, base.availableVehicles - arrivals);
        if (unserved) recommendations = ["Consider redistributing shared vehicles to the affected Hub."];
        break;
      }
      case "Hub outage":
        Object.keys(projected).forEach(key => { projected[key] = 0; });
        recommendations = ["Review alternative Hubs for parking, rental and charging."];
        break;
      default: throw new Error("Unsupported condition.");
    }
    self.postMessage({ ok:true, metrics:{ baseline:base, projected, unserved }, recommendations });
  } catch (error) {
    self.postMessage({ ok:false, message:error.message });
  }
};
