import { escapeHtml } from "../../shared/components.js";

export function mount(root, { auth }) {
  root.innerHTML = `
    <div class="auth-page">
      <section class="auth-card card">

        <div class="auth-brand">
          <span class="brand-mark" aria-hidden="true">S</span>

          <div>
            <strong>VNU-HCM SmartHub</strong>
            <small>Student & Operator mobility platform</small>
          </div>
        </div>

        <p class="eyebrow">Hub & Identity</p>

        <h1>Sign in</h1>

        <p class="auth-copy">
          Use a seeded demo account to access the Smart E-Mobility Hub.
        </p>

        <form id="login-form" novalidate>

          <div class="field">
            <label for="login-id">Account ID</label>

            <input
              id="login-id"
              type="text"
              autocomplete="username"
              placeholder="demo-student"
              required
            />
          </div>

          <div class="field">
            <label for="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              placeholder="demo123"
              required
            />
          </div>

          <p
            class="form-error"
            id="login-error"
            role="alert"
            aria-live="polite"
          ></p>

          <button
            class="button button--primary"
            type="submit"
            id="login-submit"
          >
            Sign in
          </button>

        </form>

        <div class="demo-accounts">
          <strong>Demo accounts</strong>

          <span>demo-student · Student</span>
          <span>demo-guest · Student</span>
          <span>demo-operator · Operator</span>

          <small>
            Password for all demo accounts:
            <code>demo123</code>
          </small>
        </div>

      </section>
    </div>
  `;

  const form = root.querySelector("#login-form");
  const accountInput = root.querySelector("#login-id");
  const passwordInput = root.querySelector("#login-password");
  const error = root.querySelector("#login-error");
  const submitButton = root.querySelector("#login-submit");

  function onSubmit(event) {
    event.preventDefault();

    error.textContent = "";

    const accountId = accountInput.value.trim();
    const password = passwordInput.value;

    if (!accountId) {
      error.textContent = "Please enter your account ID.";
      accountInput.focus();
      return;
    }

    if (!password) {
      error.textContent = "Please enter your password.";
      passwordInput.focus();
      return;
    }

    submitButton.disabled = true;

    const result = auth.authenticate(
      accountId,
      password
    );

    if (!result.ok) {
      error.textContent = result.message;
      submitButton.disabled = false;
      passwordInput.focus();
      return;
    }

    /*
     * Role-aware navigation.
     *
     * Student  -> Student Hub
     * Operator -> Operator Network
     */
    if (result.data.role === "operator") {
      location.hash = "#/operator/network";
    } else {
      location.hash = "#/student/hubs";
    }
  }

  form.addEventListener("submit", onSubmit);

  /*
   * Return cleanup function required by the router.
   */
  return () => {
    form.removeEventListener("submit", onSubmit);
  };
}