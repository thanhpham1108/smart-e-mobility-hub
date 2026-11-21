export function createDemoClock(store) {
  const advanceListeners = new Set();
  return {
    now: () => store.readSnapshot().demoTime,
    subscribeAfterAdvance(listener) {
      advanceListeners.add(listener);
      return () => advanceListeners.delete(listener);
    },
    advanceMinutes(minutes) {
      if (!Number.isSafeInteger(minutes) || minutes <= 0) {
        return { ok: false, code: "INVALID_TIME_STEP", message: "Choose a positive number of whole minutes." };
      }
      const result = store.commit({
        operation: "demo.advanceClock",
        apply(draft, { now }) {
          const next = new Date(Date.parse(now) + minutes * 60_000);
          if (!Number.isFinite(next.getTime())) {
            return { ok: false, code: "INVALID_TIME_STEP", message: "The resulting demo time is out of range." };
          }
          draft.demoTime = next.toISOString();
          return { ok: true, data: draft.demoTime };
        }
      });
      if (result.ok) {
        for (const listener of advanceListeners) {
          try { listener(result.data); } catch (error) { console.error("A demo-time handler failed.", error); }
        }
      }
      return result;
    }
  };
}
