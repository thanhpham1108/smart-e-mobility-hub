import { evaluateScenario } from "./model.js";

self.onmessage = ({ data: { scenario, baseline } }) => {
  try {
    self.postMessage({ ok: true, ...evaluateScenario(scenario, baseline) });
  } catch (error) {
    self.postMessage({ ok: false, message: error.message });
  }
};
