import { mount as mountParking } from "../ui/student/pages/parking.js";
import { mount as mountNetwork } from "../ui/operator/pages/network.js";
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
  "/operator/charging": { role: "operator", title: "Smart Charging", owner: "Smart Charging" },
  "/operator/what-if": { role: "operator", title: "What-if Simulation", owner: "What-if Simulation" }
};

const fallback = "/student/parking";
let disposePage = () => {};

export function startRouter(root, context) {
  function renderRoute() {
    disposePage();
    disposePage = () => {};
    const path = location.hash.slice(1) || fallback;
    const route = routes[path] || routes[fallback];
    const activePath = routes[path] ? path : fallback;
    if (!routes[path]) history.replaceState(null, "", `${location.pathname}${location.search}#${fallback}`);
    context.store.setRole(route.role);
    root.innerHTML = route.role === "student" ? studentShell(activePath) : operatorShell(activePath, route.title);
    const pageRoot = root.querySelector("#page-root");
    if (route.mount) {
      disposePage = route.mount(pageRoot, context) || (() => {});
    } else {
      pageRoot.innerHTML = `<section class="placeholder-page"><p class="eyebrow">${escapeHtml(route.owner)}</p><h1>${escapeHtml(route.title)}</h1><p>This route is reserved for its feature owner. The shared shell and navigation are ready.</p></section>`;
    }
    root.querySelector("[data-reset-demo]")?.addEventListener("click", context.store.resetDemo);
    root.querySelector("[data-menu-toggle]")?.addEventListener("click", () => {
      const nav = root.querySelector("#operator-navigation");
      const expanded = nav?.classList.toggle("is-open") || false;
      root.querySelector("[data-menu-toggle]").setAttribute("aria-expanded", String(expanded));
    });
  }

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
