import { mount as mountLogin } from "../ui/student/pages/login.js";
import { mount as mountHubs } from "../ui/student/pages/hubs.js";
import { mount as mountProfile } from "../ui/student/pages/profile.js";

import { mount as mountParking } from "../ui/student/pages/parking.js";
import { mount as mountNetwork } from "../ui/operator/pages/network.js";

import { mount as mountHubs } from "../ui/student/pages/hubs.js";
import { mount as mountRentals } from "../ui/student/pages/rental.js";
import { mount as mountParking } from "../ui/student/pages/parking.js";
import { mount as mountNetwork } from "../ui/operator/pages/network.js";
import { mount as mountCharging } from "../ui/operator/pages/charging.js";
import { mountFleet, mountIncidents } from "../ui/operator/pages/fleet.js";
import { mount as mountSimulation } from "../ui/operator/pages/simulation.js";
import { studentShell } from "../ui/student/shell.js";
import { operatorShell } from "../ui/operator/shell.js";

import { escapeHtml } from "../ui/shared/components.js";
import { routeData } from "./backend.js";

const routes = {
  // Public
  "/login": {
    public: true,
    title: "Sign in",
    mount: mountLogin
  },

  // Student
  "/student/hubs": {
    role: "student",
    title: "Hubs",
    owner: "Hub & Identity",
    mount: mountHubs
  },

  "/student/profile": {
    role: "student",
    title: "Profile",
    owner: "Hub & Identity",
    mount: mountProfile
  },

  "/student/rental": {
    role: "student",
    title: "Rentals",
    owner: "Vehicle Rental"
  },

  "/student/parking": {
    role: "student",
    title: "Parking & Charging",
    mount: mountParking
  },

  // Operator
  "/operator/network": {
    role: "operator",
    title: "Network Overview",
    mount: mountNetwork
  },

  "/operator/fleet": {
    role: "operator",
    title: "Fleet & Redistribution",
    owner: "Fleet & Incident"
  },

  "/operator/incidents": {
    role: "operator",
    title: "Incidents",
    owner: "Fleet & Incident"
  },

  "/operator/charging": {
    role: "operator",
    title: "Smart Charging",
    owner: "Smart Charging"
  },

  "/operator/what-if": {
    role: "operator",
    title: "What-if Simulation",
    owner: "What-if Simulation"
  }
};

const fallback = "/student/hubs";

const demoTimeFormat = new Intl.DateTimeFormat(
  "en-GB",
  {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short"
  }
);
  "/student/hubs": { role: "student", title: "Hubs", view: "hubs", mount: mountHubs },
  "/student/rental": { role: "student", title: "Rentals", view: "rental", mount: mountRentals },
  "/student/parking": { role: "student", title: "Parking & Charging", view: "parking", mount: mountParking },
  "/operator/network": { role: "operator", title: "Network Overview", view: "network", mount: mountNetwork },
  "/operator/fleet": { role: "operator", title: "Fleet & Redistribution", view: "fleet", mount: mountFleet },
  "/operator/incidents": { role: "operator", title: "Incidents", view: "incidents", mount: mountIncidents },
  "/operator/charging": { role: "operator", title: "Smart Charging", view: "charging", mount: mountCharging },
  "/operator/what-if": { role: "operator", title: "What-if Simulation", view: "simulation", mount: mountSimulation }
};

const rentalScreens = { vehicles: "vehicle", reservations: "reservation", trips: "trip" };

function matchRoute(path) {
  if (Object.hasOwn(routes, path)) return routes[path];
  const rental = routes["/student/rental"];
  if (path === "/student/rental/history") return { ...rental, screen: "history" };
  const match = /^\/student\/rental\/(vehicles|reservations|trips)\/([^/]+)$/.exec(path);
  if (!match) return null;
  try {
    return { ...rental, screen: rentalScreens[match[1]], recordId: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short"
});

export function startRouter(root, createDemoApi) {
  let generation = 0;
  let clean = () => {};

  function showFeedback(message) {
    const feedback =
      root.querySelector("[data-demo-feedback]");

    if (feedback) {
      feedback.textContent = message;
    }
  }

  function redirectTo(path) {
    if (location.hash !== `#${path}`) {
      location.hash = `#${path}`;
    }
  }

  function renderRoute() {
    disposePage();

    const requestedPath =
      location.hash.slice(1) || fallback;

    const activePath =
      Object.hasOwn(routes, requestedPath)
        ? requestedPath
        : fallback;

    const route = routes[activePath];

    if (requestedPath !== activePath) {
      history.replaceState(
        null,
        "",
        `${location.pathname}${location.search}#${activePath}`
      );
    }

    /*
     * Public routes do not require authentication.
     */
    if (route.public) {
      root.innerHTML = `
        <main id="page-root"></main>
      `;

      const pageRoot =
        root.querySelector("#page-root");

      disposePage =
        route.mount(pageRoot, context) || (() => {});

      return;
    }

    /*
     * All non-public routes require authentication.
     */
    const auth = context.auth;

    if (!auth) {
      console.error(
        "Authentication service is unavailable."
      );

      redirectTo("/login");
      return;
    }

    const currentUser =
      auth.currentUser();

    if (!currentUser) {
      redirectTo("/login");
      return;
    }

    /*
     * Check the required role.
     */
    if (route.role) {
      const roleResult =
        auth.requireRole(route.role);

      if (!roleResult.ok) {
        if (roleResult.code === "UNAUTHENTICATED") {
          redirectTo("/login");
          return;
        }

        /*
         * A logged-in user trying to access
         * another role's page is redirected
         * to their own portal.
         */
        if (currentUser.role === "operator") {
          redirectTo("/operator/network");
        } else {
          redirectTo("/student/hubs");
        }

        return;
      }
    }

    /*
     * Keep the existing demo store role
     * synchronized with the authenticated user.
     */
    const roleResult =
      context.store.setRole(currentUser.role);

    root.innerHTML =
      currentUser.role === "student"
        ? studentShell(activePath)
        : operatorShell(
            activePath,
            route.title
          );

    const pageRoot =
      root.querySelector("#page-root");

    let unmount = () => {};

    if (route.mount) {
      unmount =
        route.mount(
          pageRoot,
          context
        ) || unmount;
    } else {
      pageRoot.innerHTML = `
        <section class="placeholder-page">

          <p class="eyebrow">
            ${escapeHtml(route.owner)}
          </p>

          <h1>
            ${escapeHtml(route.title)}
          </h1>

          <p>
            This route is reserved for its
            feature owner. The shared shell
            and navigation are ready.
          </p>

        </section>
      `;
    }

    /*
     * Demo clock
     */
    const timeElement =
      root.querySelector(
        "[data-demo-time]"
      );

    let unsubscribeClock = () => {};

    if (timeElement) {
      function renderClock(demoTime) {
        timeElement.dateTime =
          demoTime;

        timeElement.textContent =
          demoTimeFormat.format(
            Date.parse(demoTime)
          );
      }

      renderClock(
        context.clock.now()
      );

      unsubscribeClock =
        context.store.subscribe(
          snapshot =>
            renderClock(
              snapshot.demoTime
            )
        );
    }

    /*
     * Reset demo
     */
    root
      .querySelector(
        "[data-reset-demo]"
      )
      ?.addEventListener(
        "click",
        () => {
          const result =
            context.store.resetDemo();

          if (result.ok) {
            /*
             * Resetting the demo also resets
             * authentication state.
             */
            auth.signOut();

            redirectTo("/login");
          }

          showFeedback(
            result.ok
              ? "Demo data and time reset."
              : result.message
          );
        }
      );

    /*
     * Advance demo clock
     */
    root
      .querySelector(
        "[data-advance-clock]"
      )
      ?.addEventListener(
        "click",
        () => {
          const result =
            context.clock.advanceMinutes(
              15
            );

          showFeedback(
            result.ok
              ? "Demo time advanced by 15 minutes."
              : result.message
          );
        }
      );

    if (!roleResult.ok) {
      showFeedback(
        roleResult.message
      );
    }

    /*
     * Operator mobile menu
     */
    root
      .querySelector(
        "[data-menu-toggle]"
      )
      ?.addEventListener(
        "click",
        () => {
          const nav =
            root.querySelector(
              "#operator-navigation"
            );

          const expanded =
            nav?.classList.toggle(
              "is-open"
            ) || false;

          root
            .querySelector(
              "[data-menu-toggle]"
            )
            .setAttribute(
              "aria-expanded",
              String(expanded)
            );
        }
      );

    disposePage = () => {
      unmount();
      unsubscribeClock();
    };
  }

  window.addEventListener(
    "hashchange",
    renderRoute
  );

  renderRoute();
}
  async function route() {
    const current = ++generation;
    clean();
    let path = location.hash.slice(1);
    let selected = matchRoute(path);
    if (!selected) {
      path = "/student/parking";
      history.replaceState(null, "", `#${path}`);
      selected = routes[path];
    }
    const { role, title, view, mount, screen, recordId } = selected;
    root.innerHTML = role === "operator" ? operatorShell(path, title) : studentShell(path);
    const page = root.querySelector("#page-root");
    const feedback = root.querySelector("[data-demo-feedback]");
    const show = message => { if (feedback) feedback.textContent = message; };
    const showError = message => { page.innerHTML = `<p role="alert">${escapeHtml(message)}</p>`; };
    page.innerHTML = '<p role="status">Loading from SmartHub…</p>';
    root.querySelector("[data-menu-toggle]")?.addEventListener("click", event => {
      event.currentTarget.setAttribute("aria-expanded", String(root.querySelector("#operator-navigation").classList.toggle("is-open")));
    });
    const controls = [...root.querySelectorAll("[data-reset-demo], [data-advance-clock]")];
    controls.forEach(button => { button.disabled = true; });

    let api;
    try { api = await createDemoApi(role); }
    catch {
      if (current === generation) showError("Unable to open the shared demo. Refresh to try again.");
      return;
    }
    if (current !== generation) return;
    const profile = await api.read("bootstrap");
    if (current !== generation) return;
    if (!profile.ok) { showError(profile.message); return; }
    const viewer = profile.data;
    let unmount = () => {};
    let mounted = false;
    const store = routeData(api, view, result => {
      if (result && !mounted) showError(result.message);
      show(result ? result.message : "");
    });
    const timeElement = root.querySelector("[data-demo-time]");
    const stop = store.subscribe(state => {
      if (current !== generation) return;
      if (timeElement) {
        timeElement.dateTime = state.demoTime;
        timeElement.textContent = dateTime.format(new Date(state.demoTime));
      }
      if (!mounted) { mounted = true; unmount = mount(page, { store, api, viewer, screen, recordId }) ?? unmount; }
    });
    clean = () => { stop(); unmount(); store.dispose(); };
    controls.forEach(button => { button.disabled = false; });
    for (const [selector, operation] of [["[data-reset-demo]", "demo.reset"], ["[data-advance-clock]", "demo.advance"]]) {
      root.querySelector(selector)?.addEventListener("click", async event => {
        const button = event.currentTarget;
        if (operation === "demo.reset" && !globalThis.confirm("Reset shared demo data for everyone?")) return;
        button.disabled = true;
        const result = await api.command(operation, operation === "demo.reset" ? { confirm: true } : {});
        if (result.ok) await store.refresh();
        show(result.ok ? (operation === "demo.reset" ? "Shared demo reset." : "Demo time advanced.") : result.message);
        button.disabled = false;
      });
    }
    await store.refresh();
  }

  window.addEventListener("hashchange", route);
  route();
}
