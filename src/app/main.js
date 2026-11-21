import { api, client } from "./backend.js";
import { startRouter } from "./router.js";

startRouter(document.querySelector("#app"), { api, client });
