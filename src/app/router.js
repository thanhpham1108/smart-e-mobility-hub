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

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short"
});

export function startRouter(root, { api, client }) {
  let viewer = null;
  let generation = 0;
  let clean = () => {};

  function login(message = "") {
    root.innerHTML = `<main class="auth-page"><form class="card auth-card">
      <div class="brand-mark" aria-hidden="true">S</div><h1>Sign in to SmartHub</h1>
      <p>Use your Student or Operator demo account.</p>
      <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="username" required></div>
      <div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required></div>
      <p role="status" data-login-feedback>${escapeHtml(message)}</p>
      <button class="button button--primary">Sign in</button></form></main>`;
    root.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      button.disabled = true;
      const fields = new FormData(form);
      try {
        const { error } = await client.auth.signInWithPassword({ email: fields.get("email"), password: fields.get("password") });
        if (error) form.querySelector("[data-login-feedback]").textContent = "Unable to sign in. Check your email, password and connection.";
        else await initialize();
      } catch {
        form.querySelector("[data-login-feedback]").textContent = "Unable to reach the sign-in service.";
      } finally { button.disabled = false; }
    });
  }

  async function route() {
    const current = ++generation;
    clean();
    if (!viewer) { login(); return; }
    let path = location.hash.slice(1);
    if (routes[path]?.role !== viewer.role) {
      path = viewer.role === "operator" ? "/operator/network" : "/student/hubs";
      history.replaceState(null, "", `#${path}`);
    }
    const { role, title, view, mount } = routes[path];
    root.innerHTML = role === "operator" ? operatorShell(path, title) : studentShell(path);
    const page = root.querySelector("#page-root");
    const feedback = root.querySelector("[data-demo-feedback]");
    const show = message => { if (feedback) feedback.textContent = message; };
    page.innerHTML = '<p role="status">Loading from SmartHub…</p>';
    let unmount = () => {};
    let mounted = false;
    const store = routeData(api, view, result => {
      if (result?.code === "AUTH_REQUIRED") { handleSignOut(); return; }
      if (result && !mounted) page.innerHTML = `<p role="alert">${escapeHtml(result.message)}</p>`;
      show(result ? result.message : "");
    });
    const timeElement = root.querySelector("[data-demo-time]");
    const stop = store.subscribe(state => {
      if (current !== generation) return;
      if (timeElement) timeElement.textContent = dateTime.format(new Date(state.demoTime));
      if (!mounted) { mounted = true; unmount = mount(page, { store, api, viewer }) ?? unmount; }
    });
    clean = () => { stop(); unmount(); store.dispose(); };
    root.querySelector("[data-sign-out]").addEventListener("click", handleSignOut);
    root.querySelector("[data-menu-toggle]")?.addEventListener("click", event => {
      event.currentTarget.setAttribute("aria-expanded", String(root.querySelector("#operator-navigation").classList.toggle("is-open")));
    });
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

  async function handleSignOut() {
    viewer = null;
    await route();
    await client.auth.signOut();
  }

  async function initialize() {
    const { data } = await client.auth.getSession();
    if (!data?.session) { login(); return; }
    const result = await api.read("bootstrap");
    if (!result.ok) { login(result.message); return; }
    viewer = result.data;
    await route();
  }

  window.addEventListener("hashchange", route);
  client.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT" && viewer) { viewer = null; route(); }
  });
  initialize();
}
