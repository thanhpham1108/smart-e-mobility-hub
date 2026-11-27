import {
  escapeHtml,
  pageHeader,
  badge,
  statCard
} from "../../shared/components.js";

export function mount(root, { hubService, auth, store }) {
  let query = "";
  let selectedId = null;

  function render() {
    const user = auth.currentUser();

    const result = hubService.findHubs({
      query
    });

    const hubs = result.ok
      ? result.data
      : [];

    /*
     * Keep the selected Hub if it still exists
     * after filtering.
     */
    let selected =
      hubs.find(hub => hub.id === selectedId) ||
      hubs[0] ||
      null;

    if (selected) {
      selectedId = selected.id;
    }

    const countLabel =
      `${hubs.length} Hub${hubs.length === 1 ? "" : "s"}`;

    root.innerHTML = `
      ${pageHeader(
        "Hub & Identity",
        "Find a mobility Hub",
        `Welcome, ${user?.name || "Student"}. Search hubs and check live availability before you travel.`,
        `<span class="badge badge--info">${escapeHtml(countLabel)}</span>`
      )}

      <div class="hub-page-grid">

        <!-- Search and result list -->
        <section class="card hub-search-card">

          <div class="hub-search-row">

            <div class="field">
              <label for="hub-query">
                Search by name, area or Hub ID
              </label>

              <input
                id="hub-query"
                type="search"
                value="${escapeHtml(query)}"
                placeholder="e.g. Metro or KTX"
                autocomplete="off"
              />
            </div>

            <button
              type="button"
              class="button button--secondary"
              id="clear-hub-search"
            >
              Clear
            </button>

          </div>

          <div
            class="hub-results"
            aria-live="polite"
          >
            ${
              hubs.length
                ? hubs.map(hub => `
                    <button
                      type="button"
                      class="hub-result ${
                        hub.id === selected?.id
                          ? "is-selected"
                          : ""
                      }"
                      data-hub-id="${escapeHtml(hub.id)}"
                    >

                      <span>
                        <strong>
                          ${escapeHtml(hub.name)}
                        </strong>

                        <small>
                          ${escapeHtml(hub.area)}
                        </small>
                      </span>

                      ${badge(
                        hub.status.freshness,
                        hub.status.isAvailable
                          ? "positive"
                          : "warning"
                      )}

                    </button>
                  `).join("")
                : `
                    <div class="empty-state">
                      <strong>No matching Hubs</strong>

                      <p>
                        Try another name, area or Hub ID.
                      </p>
                    </div>
                  `
            }
          </div>

        </section>

        <!-- Selected Hub status -->
        <aside class="hub-status-card card">

          ${
            selected
              ? renderStatus(selected)
              : `
                <div class="empty-state">
                  <strong>Select a Hub</strong>

                  <p>
                    Hub status will appear here.
                  </p>
                </div>
              `
          }

        </aside>

      </div>
    `;
  }

  function renderStatus(hub) {
    const status = hub.status;

    const alternativeMarkup =
      !status.isAvailable
        ? `
          <div class="alternative-box">

            <strong>Need another Hub?</strong>

            <p>
              This Hub is not reporting live availability.
              You can compare alternative Hubs.
            </p>

            <button
              type="button"
              class="button button--secondary"
              data-find-alternatives
              data-hub-id="${escapeHtml(hub.id)}"
            >
              Find alternatives
            </button>

          </div>
        `
        : "";

    return `
      <div class="hub-status-head">

        <div>
          <p class="eyebrow">Hub status</p>

          <h2>
            ${escapeHtml(hub.name)}
          </h2>

          <p>
            ${escapeHtml(hub.area)}
          </p>
        </div>

        ${badge(
          status.freshness,
          status.isAvailable
            ? "positive"
            : "warning"
        )}

      </div>

      <div class="hub-stats">

        ${statCard(
          "Vehicle availability",
          status.vehicleAvailability,
          "Current demo read-model",
          status.isAvailable
            ? "positive"
            : "warning"
        )}

        ${statCard(
          "Battery availability",
          status.batteryAvailability,
          "Current demo read-model",
          status.isAvailable
            ? "positive"
            : "warning"
        )}

      </div>

      <dl class="status-list">

        <div>
          <dt>Hub ID</dt>
          <dd>${escapeHtml(hub.id)}</dd>
        </div>

        <div>
          <dt>Last updated</dt>

          <dd>
            ${formatDate(status.lastUpdated)}
          </dd>
        </div>

      </dl>

      ${alternativeMarkup}
    `;
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "medium",
        timeStyle: "short"
      }
    ).format(date) + " ICT";
  }

  function onInput(event) {
    if (event.target.id !== "hub-query") {
      return;
    }

    query = event.target.value;

    /*
     * Re-render the result list while preserving
     * the search input focus.
     */
    render();

    const input = root.querySelector("#hub-query");

    if (input) {
      input.focus();

      /*
       * Keep cursor at the end after re-render.
       */
      input.setSelectionRange(
        input.value.length,
        input.value.length
      );
    }
  }

  function onClick(event) {

    /*
     * Select Hub
     */
    const hubItem =
      event.target.closest("[data-hub-id]");

    if (
      hubItem &&
      !event.target.closest("[data-find-alternatives]")
    ) {
      selectedId = hubItem.dataset.hubId;

      render();
      return;
    }

    /*
     * Clear search
     */
    if (
      event.target.closest("#clear-hub-search")
    ) {
      query = "";
      selectedId = null;

      render();
      return;
    }

    /*
     * Find alternative Hubs
     */
    const alternativeButton =
      event.target.closest("[data-find-alternatives]");

    if (alternativeButton) {
      const currentHubId =
        alternativeButton.dataset.hubId;

      const result =
        hubService.findAlternativeHubs({
          excludeHubId: currentHubId
        });

      if (!result.ok) {
        return;
      }

      /*
       * Display the alternative Hubs
       * as the current search result.
       */
      const alternatives = result.data;

      if (!alternatives.length) {
        return;
      }

      selectedId = alternatives[0].id;

      /*
       * Use the first alternative Hub ID
       * as the search query so the selected
       * Hub remains visible.
       */
      query = "";

      renderAlternativeHubs(alternatives);
    }
  }

  function renderAlternativeHubs(alternatives) {
    const resultContainer =
      root.querySelector(".hub-results");

    if (!resultContainer) {
      return;
    }

    resultContainer.innerHTML = `
      <div class="alternative-list">

        <p class="eyebrow">
          Alternative Hubs
        </p>

        <p>
          ${alternatives.length}
          alternative Hub${alternatives.length === 1 ? "" : "s"}
          found.
        </p>

        ${alternatives.map(hub => `
          <button
            type="button"
            class="hub-result ${
              hub.id === selectedId
                ? "is-selected"
                : ""
            }"
            data-hub-id="${escapeHtml(hub.id)}"
          >

            <span>
              <strong>
                ${escapeHtml(hub.name)}
              </strong>

              <small>
                ${escapeHtml(hub.area)}
              </small>
            </span>

            ${badge(
              hub.status.freshness,
              hub.status.isAvailable
                ? "positive"
                : "warning"
            )}

          </button>
        `).join("")}

      </div>
    `;

    const selected =
      alternatives.find(
        hub => hub.id === selectedId
      );

    const statusCard =
      root.querySelector(".hub-status-card");

    if (statusCard && selected) {
      statusCard.innerHTML =
        renderStatus(selected);
    }
  }

  root.addEventListener(
    "input",
    onInput
  );

  root.addEventListener(
    "click",
    onClick
  );

  const unsubscribe =
    store.subscribe(render);

  render();

  return () => {
    unsubscribe();

    root.removeEventListener(
      "input",
      onInput
    );

    root.removeEventListener(
      "click",
      onClick
    );
  };
}