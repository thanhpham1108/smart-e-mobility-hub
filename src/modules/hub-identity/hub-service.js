const failure = (code, message) => ({
  ok: false,
  code,
  message
});

const success = data => ({
  ok: true,
  data
});

export function createHubService({ store, clock }) {

  function getHubStatus(hubId) {
    const state = store.readSnapshot();

    const hub = state.hubs.find(
      item => item.id === hubId
    );

    if (!hub) {
      return failure(
        "HUB_NOT_FOUND",
        "Hub not found."
      );
    }

    const now = Date.parse(clock.now());

    const live = hub.freshness === "Live";
    const stale = hub.freshness === "Stale";

    return success({
      hubId: hub.id,
      name: hub.name,
      area: hub.area,

      freshness: stale
        ? "Stale data"
        : "Live data",

      isAvailable: live,

      lastUpdated: new Date(
        now - (stale ? 18 : 2) * 60_000
      ).toISOString(),

      vehicleAvailability:
        live ? "Available" : "Unknown",

      batteryAvailability:
        live ? "Available" : "Unknown"
    });
  }

  function findHubs(criteria = {}) {
    const state = store.readSnapshot();

    const query =
      String(criteria.query ?? "")
        .trim()
        .toLowerCase();

    const area =
      String(criteria.area ?? "")
        .trim()
        .toLowerCase();

    const hubs = state.hubs.filter(hub => {
      const text =
        `${hub.name} ${hub.area} ${hub.id}`
          .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!area || hub.area.toLowerCase().includes(area))
      );
    });

    return success(
      hubs.map(hub => ({
        ...hub,
        status: getHubStatus(hub.id).data
      }))
    );
  }

  function findAlternativeHubs(criteria = {}) {
    const excludedId = criteria.excludeHubId;

    const preferredArea =
      String(criteria.area ?? "")
        .trim()
        .toLowerCase();

    const result = findHubs({})
      .data
      .filter(hub => hub.id !== excludedId)
      .sort((a, b) => {
        const aSame =
          preferredArea &&
          a.area.toLowerCase().includes(preferredArea)
            ? 0
            : 1;

        const bSame =
          preferredArea &&
          b.area.toLowerCase().includes(preferredArea)
            ? 0
            : 1;

        return (
          aSame - bSame ||
          Number(b.status.isAvailable) -
          Number(a.status.isAvailable)
        );
      });

    return success(result);
  }

  return {
    findHubs,
    getHubStatus,
    findAlternativeHubs
  };
}