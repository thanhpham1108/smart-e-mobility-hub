import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/+esm";

const hosted = {
  url: "https://tnalsedjzhzlsetdzxka.supabase.co",
  key: "sb_publishable_mfjgRrMVvPhVdWTnyLw5iA_0qNT0rIm"
};
const { url, key } = globalThis.SMART_HUB_SUPABASE ?? hosted;
export const client = createClient(url, key);

const errorMessages = {
  AUTH_REQUIRED: "Sign in with a SmartHub demo account.",
  FORBIDDEN: "This action is unavailable for your account.",
  PARKING_FULL: "No parking capacity is available for this window.",
  STOP_CHARGING_FIRST: "Stop the active charging session before checking out.",
  PARKING_NOT_ACTIVE: "Check in to parking before starting charging.",
  VEHICLE_NOT_FOUND: "The vehicle could not be found.",
  VEHICLE_UNAVAILABLE: "This vehicle is no longer available.",
  STALE_SCHEDULE: "The schedule changed. Review it and try again.",
  COMMAND_CONFLICT: "This action ID was already used with different input.",
  DEMO_NOT_INITIALIZED: "The shared demo database is still being set up.",
  RECONCILIATION_REQUIRED: "The event does not match the active session."
};

function camelize(value) {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), camelize(item)]));
}

async function rpc(name, args) {
  try {
    const { data, error } = await client.rpc(name, args);
    if (error) {
      const code = error.code === "42501" || error.code === "PGRST301" ? "AUTH_REQUIRED"
        : error.code === "PGRST202" ? "DEMO_NOT_INITIALIZED" : "CONNECTION_FAILED";
      return { ok: false, code, message: errorMessages[code] ?? "Unable to reach the shared database." };
    }
    if (data.ok) return { ok: true, data: camelize(data.data) };
    const code = data.code ?? "UNKNOWN_ERROR";
    const message = code.toLowerCase().replaceAll("_", " ");
    return { ok: false, code, message: errorMessages[code] ?? message[0].toUpperCase() + message.slice(1) + "." };
  } catch {
    return { ok: false, code: "CONNECTION_FAILED", message: "Unable to reach the shared database." };
  }
}

export const api = {
  read(name, filter = {}) {
    return rpc("app_view", { p_view: name, p_filter: filter });
  },
  command(operation, input = {}, commandId = crypto.randomUUID()) {
    const args = { p_operation: operation, p_input: input, p_command_id: commandId };
    return rpc("app_command", args).then(result =>
      result.code === "CONNECTION_FAILED" ? rpc("app_command", args) : result);
  }
};

// Route data lives in memory and is refreshed from PostgreSQL.
export function routeData(api, name, onError) {
  const listeners = new Set();
  let state;
  let active = true;
  let pending;
  let errorShown = false;

  async function refresh() {
    if (!active) return false;
    if (pending) return pending;
    pending = (async () => {
      const result = await api.read(name);
      if (!active) return false;
      if (!result.ok) {
        errorShown = true;
        onError(result);
        return false;
      }
      if (errorShown) onError(null);
      errorShown = false;
      if (state?.revision !== result.data.revision) {
        state = result.data;
        for (const listener of listeners) {
          try { listener(state); } catch (error) {
            console.error("Unable to display shared data.", error);
            onError({ message: "Unable to display the loaded view." });
          }
        }
      }
      return true;
    })();
    try { return await pending; } finally { pending = null; }
  }

  const timer = setInterval(() => {
    if (document.visibilityState === "visible") refresh();
  }, 5000);
  const resume = () => { if (document.visibilityState === "visible") refresh(); };
  document.addEventListener("visibilitychange", resume);

  return {
    refresh,
    readSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      active = false;
      listeners.clear();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    }
  };
}
