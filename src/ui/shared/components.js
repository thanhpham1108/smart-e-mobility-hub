export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function badge(label, tone = "neutral") {
  const allowed = new Set(["positive", "info", "warning", "danger", "neutral"]);
  return `<span class="badge badge--${allowed.has(tone) ? tone : "neutral"}">${escapeHtml(label)}</span>`;
}

export function statCard(label, value, detail, tone = "positive") {
  return `<article class="card stat-card"><div class="stat-card__head"><span>${escapeHtml(label)}</span><span class="stat-card__mark stat-card__mark--${tone}" aria-hidden="true"></span></div><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
}

export function pageHeader(eyebrow, title, description, action = "") {
  return `<header class="page-header"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="page-header__description">${escapeHtml(description)}</p></div>${action}</header>`;
}
