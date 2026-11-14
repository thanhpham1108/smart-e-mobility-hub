import { store } from "./store.js";
import { startRouter } from "./router.js";

startRouter(document.querySelector("#app"), { store });
