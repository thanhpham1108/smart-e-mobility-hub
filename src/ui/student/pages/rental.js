import { mountRecords } from "../../shared/records.js";
import { catalog, clearFilters, filterCatalog } from "./rental/catalog.js";
import { vehicleDetails } from "./rental/vehicle.js";
import { reservation } from "./rental/reservation.js";
import { trip, returnOptions } from "./rental/trip.js";
import { history } from "./rental/history.js";
import { rentalUrl } from "./rental/components.js";

const screens = { catalog, vehicle: vehicleDetails, reservation, trip, history };

export function mount(root, context) {
  const { screen = "catalog", recordId, query } = context;
  const initialFilters = {
    hubId: query?.get("hub") ?? "",
    vehicleType: query?.get("type") ?? "",
    minBattery: Math.max(0, Math.min(100, Number(query?.get("battery")) || 0))
  };
  let active = true;
  const navigate = (kind, id) => {
    if (active) location.hash = rentalUrl(kind, id);
  };
  const cleanup = mountRecords(root, context, (data, viewer, memory) => {
    memory.filters ??= {
      ...initialFilters,
      hubId: data.hubs.some(hub => hub.id === initialFilters.hubId) ? initialFilters.hubId : "",
      vehicleType: ["ELECTRIC_BICYCLE", "ELECTRIC_MOTORCYCLE", "CAR"].includes(initialFilters.vehicleType) ? initialFilters.vehicleType : ""
    };
    return screens[screen](data, recordId, memory);
  }, {
    "rental.filter": filterCatalog,
    "rental.clearFilters": clearFilters,
    "rental.reserve": async (input, { api, memory }) => {
      const result = await api.command("rental.reserve", input);
      if (result.ok) navigate("reservations", result.data.reservationId);
      memory.reservationUnavailable = ["VEHICLE_UNAVAILABLE", "HUB_UNAVAILABLE", "VEHICLE_NOT_FOUND"].includes(result.code);
      return { ...result, refresh: true };
    },
    "rental.pickup": async (input, { api }) => {
      const result = await api.command("rental.pickup", input);
      if (result.ok) navigate("trips", result.data.tripId);
      return { ...result, refresh: true };
    },
    "rental.cancel": async (input, { api }) => ({
      ...await api.command("rental.cancel", input), refresh: true
    }),
    "rental.returnOptions": returnOptions,
    "rental.return": async (input, services) => {
      const { api, memory } = services;
      const result = await api.command("rental.return", { ...input, hubId: memory.returnHubId });
      if (!result.ok && ["PARKING_FULL", "RETURN_SPACE_UNAVAILABLE", "HUB_UNAVAILABLE"].includes(result.code)) {
        await returnOptions({ tripId: input.tripId, hubId: memory.returnHubId }, services);
      }
      return { ...result, refresh: true };
    },
    "incident.report": async (input, { api, memory }) => {
      memory.problemDescription = input.description;
      const result = await api.command("incident.report", input);
      if (result.ok) {
        memory.incidentId = result.data.incidentId;
        memory.problemDescription = "";
      }
      return { ...result, refresh: true };
    }
  });
  return () => {
    active = false;
    cleanup();
  };
}
