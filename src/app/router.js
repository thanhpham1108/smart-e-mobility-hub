import { mount as mountLogin } from "../ui/student/pages/login.js";
import { mount as mountHubs } from "../ui/student/pages/hubs.js";
import { mount as mountProfile } from "../ui/student/pages/profile.js";

import { mount as mountParking } from "../ui/student/pages/parking.js";
import { mount as mountNetwork } from "../ui/operator/pages/network.js";

import { studentShell } from "../ui/student/shell.js";
import { operatorShell } from "../ui/operator/shell.js";

import { escapeHtml } from "../ui/shared/components.js";

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

export function startRouter(root, context) {
  let disposePage = () => {};

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