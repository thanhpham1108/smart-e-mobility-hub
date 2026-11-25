import { badge, escapeHtml } from "../shared/components.js";
import { timeLabel } from "../shared/records.js";
import { fleetService } from "../../modules/fleet-incident/service.js";

export const e = escapeHtml;
export const time = timeLabel;
const tones = { Available: "positive", AVAILABLE: "positive", Operational: "positive", OPERATIONAL: "positive", Completed: "positive", Resolved: "positive", Live: "positive",
  Planned: "info", Dispatched: "info", Partial: "info", Scheduled: "info", Charging: "info", Investigating: "info", ActionAssigned: "info",
  AtRisk: "danger", FAULTED: "danger", Faulty: "danger", High: "danger", Offline: "danger", Open: "warning", InRepair: "warning", Stale: "warning", Maintenance: "warning", Suspended: "warning" };
export const status = value => badge(({ AtRisk: "At risk", ActionAssigned: "Action assigned", InRepair: "In repair", UNDER_MAINTENANCE: "Maintenance", REDISTRIBUTING: "Redistributing", IN_USE: "In use" })[value] ?? value, tones[value] ?? "neutral");
export const empty = (title, description = "") => `<div class="fi-empty"><strong>${e(title)}</strong>${description ? `<p>${e(description)}</p>` : ""}</div>`;
export const panel = (title, content, detail = "") => `<section class="card fi-panel"><div class="fi-panel-heading"><h2>${e(title)}</h2>${detail}</div>${content}</section>`;
export const act = (label, action, attrs = "", primary = false) => `<button type="button" class="button button--${primary ? "primary" : "secondary"}" data-action="${action}" ${attrs}>${e(label)}</button>`;
export const field = (name, label, control) => `<label class="field"><span>${e(label)}</span>${control.replaceAll("{{name}}", name)}</label>`;
export const input = (name, label, attrs = "") => field(name, label, `<input name="{{name}}" ${attrs}>`);
export const select = (name, label, options, attrs = "") => field(name, label, `<select name="{{name}}" ${attrs}>${options}</select>`);
export const options = (rows, key, label, selected) => rows.map(row => `<option value="${e(row[key])}" ${row[key] === selected ? "selected" : ""}>${e(row[label])}</option>`).join("");
export const note = (name, label, placeholder = "") => field(name, label, `<textarea name="{{name}}" rows="3" maxlength="1000" required placeholder="${e(placeholder)}"></textarea>`);
export const history = rows => rows.length ? `<ol class="fi-history">${rows.map(row => `<li><div><strong>${e(row.action.replace(/([a-z])([A-Z])/g, "$1 $2"))}</strong><time>${time(row.createdAt)}</time></div><p>${e(row.note)}</p></li>`).join("")}</ol>` : empty("No recorded history yet");

// Preserve draft controls across polling. Each route owns its state and listeners.
export function mountFleetView(root, context, initial, template, handlers) {
  const state = { ...initial };
  const service = fleetService(context.api, context.store);
  let active = true;
  let busy = false;
  let feedback = null;
  const drafts = new Map();
  function remember() {
    for (const form of root.querySelectorAll("form[data-draft]")) {
      drafts.set(form.dataset.draft, [...form.elements].filter(el => el.name).map(el => ({ name: el.name, value: el.value, checked: el.checked, type: el.type })));
    }
  }
  function render() {
    if (!active) return;
    remember();
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const focusName = focused?.name;
    const focusForm = focused?.closest("form")?.dataset.draft;
    const selection = focused?.selectionStart;
    const expanded = new Set([...root.querySelectorAll("details[open]")].map(details => details.querySelector("summary")?.textContent));
    root.innerHTML = `<div class="fi-page">${feedback ? `<div class="fi-feedback ${feedback.error ? "is-error" : ""}" role="${feedback.error ? "alert" : "status"}">${e(feedback.message)}</div>` : ""}${template(context.store.readSnapshot(), state)}</div>`;
    for (const details of root.querySelectorAll("details")) details.open = expanded.has(details.querySelector("summary")?.textContent);
    for (const form of root.querySelectorAll("form[data-draft]")) for (const saved of drafts.get(form.dataset.draft) ?? []) {
      const controls = [...form.elements].filter(el => el.name === saved.name && el.type === saved.type);
      for (const el of controls) {
        if (["checkbox", "radio"].includes(el.type)) { if (el.value === saved.value) el.checked = saved.checked; }
        else el.value = saved.value;
      }
    }
    for (const button of root.querySelectorAll("button, input, select, textarea")) if (busy) button.disabled = true;
    if (focusName && focusForm) {
      const form = [...root.querySelectorAll("form[data-draft]")].find(f => f.dataset.draft === focusForm);
      const replacement = form && [...form.elements].find(el => el.name === focusName);
      replacement?.focus({ preventScroll: true });
      if (selection != null && replacement?.setSelectionRange && ["text", "search", "textarea"].includes(replacement.type)) replacement.setSelectionRange(selection, selection);
    }
  }
  const tools = { state, service, ...context, render,
    clearDraft: name => {
      drafts.delete(name);
      for (const form of root.querySelectorAll("form[data-draft]")) if (form.dataset.draft === name) form.removeAttribute("data-draft");
    },
    tell: (message, error = false) => { feedback = { message, error }; },
    async save(operation, input, message) {
      const result = await service.command(operation, input);
      feedback = { error: !result.ok || ["RECONCILIATION_REQUIRED", "AtRisk"].includes(result.data?.status), message: result.ok ? result.data?.message ?? message ?? "Saved." : result.message };
      return result;
    }
  };
  async function run(action, values, control) {
    if (busy || !handlers[action]) return;
    remember(); busy = true;
    root.querySelectorAll("button").forEach(button => { button.disabled = true; });
    try { await handlers[action](values, tools, control); }
    catch { feedback = { error: true, message: "Unable to complete the action. Check your connection and input, then try again." }; }
    finally { busy = false; render(); }
  }
  const click = event => {
    const button = event.target.closest("button[data-action]");
    if (button && !button.disabled) run(button.dataset.action, button.dataset, button);
  };
  const submit = event => {
    const form = event.target.closest("form[data-action]");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form, event.submitter);
    const values = Object.fromEntries(data);
    for (const name of ["vehicleIds", "arrivedIds"]) if (data.has(name)) values[name] = data.getAll(name);
    run(event.submitter?.dataset.submitAction ?? form.dataset.action, values, form);
  };
  root.addEventListener("click", click);
  root.addEventListener("submit", submit);
  const unsubscribe = context.store.subscribe(() => { if (!busy) render(); });
  render();
  return () => { active = false; unsubscribe(); root.removeEventListener("click", click); root.removeEventListener("submit", submit); };
}
