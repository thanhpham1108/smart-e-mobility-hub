const storageKey = "smart-hub-demo";

const failure = (code, message) => ({ ok: false, code, message });
const success = data => ({ ok: true, data });

function encodeJson(value, sortKeys = false) {
  return JSON.stringify(value, (_key, item) => {
    if (item === null || typeof item === "string" || typeof item === "boolean" || Number.isFinite(item)) return item;
    if (Array.isArray(item)) return item;
    if (typeof item !== "object" || Object.getPrototypeOf(item) !== Object.prototype) {
      throw new TypeError("Store values must be JSON data.");
    }
    return sortKeys ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
  });
}

export function createStore(seed, { storage, key = storageKey } = {}) {
  const initial = JSON.parse(encodeJson(seed));
  const collectionNames = Object.keys(initial).filter(name => Array.isArray(initial[name]));
  const listeners = new Set();
  let writing = false;

  function isCompatible(state) {
    return Number.isInteger(state?.schemaVersion) && state.schemaVersion === initial.schemaVersion
      && Number.isInteger(state.revision) && state.revision >= 0
      && (state.role === "student" || state.role === "operator")
      && typeof state.demoTime === "string" && Number.isFinite(Date.parse(state.demoTime))
      && collectionNames.every(name => Array.isArray(state[name]));
  }

  if (!isCompatible(initial)) throw new TypeError("Invalid demo seed.");

  function getStorage() {
    return storage ?? globalThis.localStorage;
  }

  function load() {
    try {
      const saved = JSON.parse(getStorage().getItem(key));
      if (isCompatible(saved?.state) && Array.isArray(saved.receipts)) return saved;
    } catch {
      // A missing, invalid or inaccessible save starts from the seed.
    }
    return { state: structuredClone(initial), receipts: [] };
  }

  let saved = load();

  function readSnapshot() {
    return structuredClone(saved.state);
  }

  function publish(next) {
    let serialized;
    try {
      if (!isCompatible(next.state)) throw new TypeError("Invalid state shape.");
      serialized = encodeJson(next);
    } catch {
      return failure("INVALID_STATE", "The change produced invalid demo data.");
    }
    try {
      getStorage().setItem(key, serialized);
    } catch {
      return failure("STORAGE_UNAVAILABLE", "Unable to save demo data in this browser.");
    }
    saved = JSON.parse(serialized);
    for (const listener of listeners) {
      try {
        listener(readSnapshot());
      } catch (error) {
        console.error("A demo view failed to refresh.", error);
      }
    }
    return success(null);
  }

  function commit(command) {
    if (writing) return failure("WRITE_IN_PROGRESS", "Apply related changes inside the current command.");
    const { operation, apply, callerId, commandId, input = null } = command ?? {};
    if (typeof operation !== "string" || !operation || typeof apply !== "function"
      || (commandId !== undefined && (typeof commandId !== "string" || !commandId || typeof callerId !== "string" || !callerId))) {
      return failure("INVALID_COMMAND", "Supply an operation and apply function, plus a caller for a retry ID.");
    }

    let fingerprint;
    if (commandId !== undefined) {
      try {
        fingerprint = encodeJson(input, true);
      } catch {
        return failure("INVALID_COMMAND", "Retry inputs must be JSON data.");
      }
      const prior = saved.receipts.find(receipt => receipt.callerId === callerId
        && receipt.operation === operation && receipt.commandId === commandId);
      if (prior) {
        return prior.fingerprint === fingerprint
          ? structuredClone(prior.result)
          : failure("COMMAND_CONFLICT", "This command ID was already used with different inputs.");
      }
    }

    writing = true;
    try {
      const draft = readSnapshot();
      const result = apply(draft, { now: draft.demoTime });
      if (result?.ok === false && typeof result.code === "string" && typeof result.message === "string") return result;
      if (result?.ok !== true || !Object.hasOwn(result, "data")) {
        return failure("INVALID_COMMAND_RESULT", "A command must return a synchronous result with data or an error.");
      }

      draft.schemaVersion = initial.schemaVersion;
      draft.revision = saved.state.revision + 1;
      const receipts = commandId === undefined ? saved.receipts
        : [...saved.receipts, { callerId, operation, commandId, fingerprint, result }];
      const resultJson = encodeJson(result);
      const persisted = publish({ state: draft, receipts });
      return persisted.ok ? JSON.parse(resultJson) : persisted;
    } catch (error) {
      console.error(`Demo command failed: ${operation}`, error);
      return failure("COMMAND_FAILED", "The change could not be completed.");
    } finally {
      writing = false;
    }
  }

  function resetDemo() {
    if (writing) return failure("WRITE_IN_PROGRESS", "Finish the current change before resetting.");
    writing = true;
    try {
      const state = { ...structuredClone(initial), role: saved.state.role };
      return publish({ state, receipts: [] });
    } finally {
      writing = false;
    }
  }

  return {
    readSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    commit,
    resetDemo,
    setRole(role) {
      if (role !== "student" && role !== "operator") return failure("INVALID_ROLE", "Unknown demo role.");
      if (role === saved.state.role) return success(null);
      return commit({
        operation: "demo.setRole",
        apply(draft) {
          draft.role = role;
          return success(null);
        }
      });
    }
  };
}
