import {
  escapeHtml,
  pageHeader,
  badge
} from "../../shared/components.js";

export function mount(
  root,
  { auth, profileService }
) {
  let profile =
    profileService.getProfile().data;

  let feedback = "";
  let tone = "";

  function render() {
    const result =
      profileService.getProfile();

    if (result.ok) {
      profile = result.data;
    }

    root.innerHTML = `
      ${pageHeader(
        "Hub & Identity",
        "My profile",
        "Manage the profile fields permitted for the demo account.",
        badgeHtml(profile?.role || "student")
      )}

      <section class="card profile-card">

        <!-- Profile summary -->
        <div class="profile-summary">

          <span
            class="avatar avatar--large"
            aria-hidden="true"
          >
            ${escapeHtml(
              (profile?.name || "U")
                .slice(0, 2)
                .toUpperCase()
            )}
          </span>

          <div>
            <h2>
              ${escapeHtml(
                profile?.name || "Unknown user"
              )}
            </h2>

            <p>
              ${escapeHtml(
                profile?.userId || ""
              )}
            </p>
          </div>

        </div>

        <!-- Profile form -->
        <form
          id="profile-form"
          novalidate
        >

          <div class="profile-fields">

            <!-- Read-only fields -->
            <div class="field">

              <label for="profile-name">
                Name
              </label>

              <input
                id="profile-name"
                type="text"
                value="${escapeHtml(
                  profile?.name || ""
                )}"
                disabled
              />

            </div>

            <div class="field">

              <label for="profile-role">
                Role
              </label>

              <input
                id="profile-role"
                type="text"
                value="${escapeHtml(
                  profile?.role || ""
                )}"
                disabled
              />

            </div>

            <!-- Editable fields -->
            <div class="field">

              <label for="profile-email">
                Email
              </label>

              <input
                id="profile-email"
                type="email"
                value="${escapeHtml(
                  profile?.email || ""
                )}"
                required
              />

            </div>

            <div class="field">

              <label for="profile-phone">
                Phone
              </label>

              <input
                id="profile-phone"
                type="tel"
                value="${escapeHtml(
                  profile?.phone || ""
                )}"
                placeholder="Optional"
              />

            </div>

          </div>

          <p
            class="form-feedback ${escapeHtml(tone)}"
            id="profile-feedback"
            role="status"
            aria-live="polite"
          >
            ${escapeHtml(feedback)}
          </p>

          <div class="profile-actions">

            <button
              class="button button--primary"
              type="submit"
            >
              Save profile
            </button>

            <button
              class="button button--secondary"
              type="button"
              id="profile-reset"
            >
              Reset form
            </button>

          </div>

        </form>

      </section>
    `;
  }

  function badgeHtml(role) {
    return `
      <span class="badge badge--info">
        ${escapeHtml(role)}
      </span>
    `;
  }

  function onSubmit(event) {
    event.preventDefault();

    const email =
      root.querySelector(
        "#profile-email"
      ).value;

    const phone =
      root.querySelector(
        "#profile-phone"
      ).value;

    const result =
      profileService.updateProfile({
        email,
        phone
      });

    if (result.ok) {
      profile = result.data;
      feedback =
        "Profile updated successfully.";
      tone = "is-success";
    } else {
      feedback =
        result.message;
      tone = "is-error";
    }

    render();
  }

  function onClick(event) {
    if (
      event.target.closest("#profile-reset")
    ) {
      /*
       * Reload the original profile
       * values from ProfileService.
       */
      const result =
        profileService.getProfile();

      if (result.ok) {
        profile = result.data;
      }

      feedback = "";
      tone = "";

      render();
    }
  }

  root.addEventListener(
    "submit",
    onSubmit
  );

  root.addEventListener(
    "click",
    onClick
  );

  render();

  return () => {
    root.removeEventListener(
      "submit",
      onSubmit
    );

    root.removeEventListener(
      "click",
      onClick
    );
  };
}