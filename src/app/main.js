import { createDemoApi } from "./backend.js";
import { startRouter } from "./router.js";

startRouter(document.querySelector("#app"), createDemoApi);
