import { createStore } from "./store.js";
import { createDemoClock } from "./clock.js";
import { startRouter } from "./router.js";

import {
  createAuthService,
  createHubService,
  createProfileService
} from "../modules/hub-identity/index.js";

const root = document.querySelector("#app");

try {
  const source = new URL("../data/fixtures/demo.json", import.meta.url);
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(
      `Demo fixtures returned HTTP ${response.status}.`
    );
  }

  const store = createStore(
    await response.json()
  );

  const clock = createDemoClock(store);

  // Hub & Identity services
  const auth = createAuthService({
    store
  });

  const hubService = createHubService({
    store,
    clock
  });

  const profileService = createProfileService({
    store,
    auth
  });

  // Restore an existing demo login session.
  auth.restoreSession();

  startRouter(root, {
    store,
    clock,
    auth,
    hubService,
    profileService
  });

} catch (error) {
  console.error(
    "Unable to start Smart E-Mobility Hub.",
    error
  );

  root.innerHTML = `
    <main
      class="student-main"
      role="alert"
    >
      <h1>Unable to load demo data</h1>

      <p>
        Open the app through its HTTP server
        and try reloading.
      </p>
    </main>
  `;
}