import { escapeHtml } from "./components.js";

const localTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short"
});

export function timeLabel(value) { return value ? localTime.format(new Date(value)) + " ICT" : "—"; }
export function toLocalInput(value) { return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16); }
export function fromLocalInput(value) { return new Date(value + ":00+07:00").toISOString(); }
export const e = escapeHtml;

export function options(records, key, label) {
  return records.map(row => `<option value="${e(row[key])}">${e(row[label])}</option>`).join("");
}
export function field(name, label, control) {
  return `<label class="field"><span>${e(label)}</span>${control.replace("{{name}}", e(name))}</label>`;
}
export function select(name, label, items) {
  return field(name, label, `<select name="{{name}}" required>${items}</select>`);
}
export function input(name, label, props = "") {
  return field(name, label, `<input name="{{name}}" ${props}>`);
}
export function button(label, operation, data = {}) {
  return `<button type="button" class="button button--secondary" data-operation="${e(operation)}" data-input="${e(JSON.stringify(data))}">${e(label)}</button>`;
}
export function actionForm(operation, fields, title) {
  return `<form class="records-form" data-operation="${e(operation)}">${fields}<button class="button button--primary">${e(title)}</button></form>`;
}
export function panel(title, content) {
  return `<section class="card records-panel"><h2>${e(title)}</h2>${content}</section>`;
}
export function list(rows, render, fallback) {
  return rows.length ? `<div class="records-list">${rows.map(render).join("")}</div>` : `<p class="records-meta">${e(fallback)}</p>`;
}

export function mountRecords(root, { store, api, viewer }, renderContent, handlers = {}) {
  let active = true;
  let busy = false;
  let deferred = false;
  let message = "";
  const memory = {};
  function render(force = false) {
    if (!active) return;
    if (!force && (busy || root.contains(document.activeElement) && document.activeElement.matches("input, select, textarea"))) {
      deferred = true;
      return;
    }
    deferred = false;
    root.innerHTML = `<div class="records-page">${renderContent(store.readSnapshot(), viewer, memory)}
      <p class="records-message" role="status">${e(message)}</p></div>`;
  }
  async function execute(operation, input, source) {
    if (busy) return;
    busy = true;
    const control = source.querySelector("button") ?? source;
    control.disabled = true;
    try {
      const custom = handlers[operation];
      const result = custom ? await custom(input, { store, api, viewer, memory }) : await api.command(operation, input);
      message = result.ok ? result.message ?? "Saved to the shared database." : result.message;
      if (result.refresh || (result.ok && !result.readOnly)) await store.refresh();
    } catch {
      message = "The action could not be completed. Check the input and try again.";
    } finally {
      busy = false;
      if (active) render(true);
    }
  }
  const unsubscribe = store.subscribe(() => render());
  const onClick = event => {
    const control = event.target.closest("button[data-operation]");
    if (control) execute(control.dataset.operation, JSON.parse(control.dataset.input), control);
  };
  const onSubmit = event => {
    const form = event.target.closest("form[data-operation]");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form, event.submitter);
    const input = Object.fromEntries(data);
    for (const field of form.querySelectorAll("select[multiple]")) input[field.name] = data.getAll(field.name);
    execute(event.submitter?.dataset.operation ?? form.dataset.operation, input, form);
  };
  const onBlur = () => {
    if (deferred) setTimeout(() => { if (deferred) render(); }, 0);
  };
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("focusout", onBlur);
  render(true);
  return () => {
    active = false;
    unsubscribe();
    root.removeEventListener("click", onClick);
    root.removeEventListener("submit", onSubmit);
    root.removeEventListener("focusout", onBlur);
  };
}
