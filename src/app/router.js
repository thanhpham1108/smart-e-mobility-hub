import { mount as mountParking } from "../ui/student/pages/parking.js";
import { mount as mountNetwork } from "../ui/operator/pages/network.js";
import { mount as mountCharging } from "../ui/operator/pages/charging.js";
import { studentShell } from "../ui/student/shell.js";
import { operatorShell } from "../ui/operator/shell.js";
import { escapeHtml } from "../ui/shared/components.js";

const routes = {
  "/student/hubs": { role: "student", title: "Hubs", owner: "Hub & Identity" },
  "/student/rental": { role: "student", title: "Rentals", owner: "Vehicle Rental" },
  "/student/parking": { role: "student", title: "Parking & Charging", mount: mountParking },
  "/operator/network": { role: "operator", title: "Network Overview", mount: mountNetwork },
  "/operator/fleet": { role: "operator", title: "Fleet & Redistribution", owner: "Fleet & Incident" },
  "/operator/incidents": { role: "operator", title: "Incidents", owner: "Fleet & Incident" },
  "/operator/charging": { role: "operator", title: "Smart Charging", mount: mountCharging },
  "/operator/what-if": { role: "operator", title: "What-if Simulation", owner: "What-if Simulation" }
};

const fallback = "/student/parking";
const demoTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short"
});

export function startRouter(root, context) {
  let disposePage = () => {};

  function showFeedback(message) {
    root.querySelector("[data-demo-feedback]").textContent = message;
  }

  function renderRoute() {
    disposePage();
    const path = location.hash.slice(1) || fallback;
    const activePath = Object.hasOwn(routes, path) ? path : fallback;
    const route = routes[activePath];
    if (path !== activePath) history.replaceState(null, "", `${location.pathname}${location.search}#${fallback}`);
    const roleResult = context.store.setRole(route.role);
    root.innerHTML = route.role === "student" ? studentShell(activePath) : operatorShell(activePath, route.title);
    const pageRoot = root.querySelector("#page-root");
    let unmount = () => {};
    if (route.mount) {
      unmount = route.mount(pageRoot, context) || unmount;
    } else {
      pageRoot.innerHTML = `<section class="placeholder-page"><p class="eyebrow">${escapeHtml(route.owner)}</p><h1>${escapeHtml(route.title)}</h1><p>This route is reserved for its feature owner. The shared shell and navigation are ready.</p></section>`;
    }
    const timeElement = root.querySelector("[data-demo-time]");
    let unsubscribeClock = () => {};
    if (timeElement) {
      function renderClock(demoTime) {
        timeElement.dateTime = demoTime;
        timeElement.textContent = demoTimeFormat.format(Date.parse(demoTime));
      }
      renderClock(context.clock.now());
      unsubscribeClock = context.store.subscribe(snapshot => renderClock(snapshot.demoTime));
    }

    root.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
      const result = context.store.resetDemo();
      if (result.ok) {
        renderRoute();
        root.querySelector("[data-reset-demo]")?.focus();
      }
      showFeedback(result.ok ? "Demo data and time reset." : result.message);
    });
    root.querySelector("[data-advance-clock]")?.addEventListener("click", () => {
      const result = context.clock.advanceMinutes(15);
      showFeedback(result.ok ? "Demo time advanced by 15 minutes." : result.message);
    });
    if (!roleResult.ok) showFeedback(roleResult.message);
    root.querySelector("[data-menu-toggle]")?.addEventListener("click", () => {
      const nav = root.querySelector("#operator-navigation");
      const expanded = nav?.classList.toggle("is-open") || false;
      root.querySelector("[data-menu-toggle]").setAttribute("aria-expanded", String(expanded));
    });
    disposePage = () => {
      unmount();
      unsubscribeClock();
    };
  }

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
