const SESSION_KEY = "smart-hub-session";

const failure = (code, message) => ({ ok: false, code, message });
const success = data => ({ ok: true, data });

export function createAuthService({ store }) {
  function users() {
    return store.readSnapshot().users || [];
  }

  function currentUser() {
    const state = store.readSnapshot();

    return users().find(
      user => user.userId === state.currentUserId
    ) || null;
  }

  function authenticate(identifier, credential = "") {
    const normalized = String(identifier ?? "")
      .trim()
      .toLowerCase();

    if (!normalized) {
      return failure(
        "MISSING_IDENTIFIER",
        "Enter your demo account ID."
      );
    }

    if (!String(credential ?? "").trim()) {
      return failure(
        "MISSING_CREDENTIAL",
        "Enter your demo password."
      );
    }

    const user = users().find(
      item => item.userId.toLowerCase() === normalized
    );

    if (!user || credential !== "demo123") {
      return failure(
        "INVALID_CREDENTIALS",
        "Account ID or password is incorrect."
      );
    }

    const result = store.commit({
      operation: "auth.signIn",

      apply(draft) {
        draft.currentUserId = user.userId;
        draft.role = user.role;
        draft.authenticated = true;

        return success({
          userId: user.userId,
          role: user.role
        });
      }
    });

    if (!result.ok) return result;

    try {
      sessionStorage.setItem(SESSION_KEY, user.userId);
    } catch {}

    return result;
  }

  function signOut() {
    const result = store.commit({
      operation: "auth.signOut",

      apply(draft) {
        draft.currentUserId = null;
        draft.authenticated = false;
        draft.role = "student";

        return success(null);
      }
    });

    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}

    return result;
  }

  function restoreSession() {
    const state = store.readSnapshot();

    if (state.authenticated && state.currentUserId) {
      return success(currentUser());
    }

    let userId = null;

    try {
      userId = sessionStorage.getItem(SESSION_KEY);
    } catch {}

    if (!userId) {
      return failure("NO_SESSION", "No active session.");
    }

    const user = users().find(
      item => item.userId === userId
    );

    if (!user) {
      return failure(
        "NO_SESSION",
        "The demo session is no longer valid."
      );
    }

    return store.commit({
      operation: "auth.restore",

      apply(draft) {
        draft.currentUserId = user.userId;
        draft.role = user.role;
        draft.authenticated = true;

        return success(user);
      }
    });
  }

  function requireRole(requiredRole) {
    const user = currentUser();

    if (!user) {
      return failure(
        "UNAUTHENTICATED",
        "Please sign in first."
      );
    }

    if (user.role !== requiredRole) {
      return failure(
        "FORBIDDEN",
        `This page requires the ${requiredRole} role.`
      );
    }

    return success(user);
  }

  return {
    authenticate,
    signOut,
    restoreSession,
    currentUser,
    requireRole
  };
}