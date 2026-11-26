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
