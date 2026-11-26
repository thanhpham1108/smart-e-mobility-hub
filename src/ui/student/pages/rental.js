import { mountRecords } from "../../shared/records.js";
import { catalog, clearFilters, filterCatalog } from "./rental/catalog.js";
import { vehicleDetails } from "./rental/vehicle.js";
import { reservation } from "./rental/reservation.js";
import { trip, returnOptions } from "./rental/trip.js";
import { history } from "./rental/history.js";
import { rentalUrl } from "./rental/components.js";

const screens = { catalog, vehicle: vehicleDetails, reservation, trip, history };

export function mount(root, context) {
  const { screen = "catalog", recordId } = context;
  let active = true;
  const navigate = (kind, id) => {
    if (active) location.hash = rentalUrl(kind, id);
  };
  const cleanup = mountRecords(root, context, (data, viewer, memory) =>
    screens[screen](data, recordId, memory), {
    "rental.filter": filterCatalog,
    "rental.clearFilters": clearFilters,
    "rental.reserve": async (input, { api }) => {
      const result = await api.command("rental.reserve", input);
      if (result.ok) navigate("reservations", result.data.reservationId);
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
