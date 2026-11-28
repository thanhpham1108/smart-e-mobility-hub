const failure = (code, message) => ({
  ok: false,
  code,
  message
});

const success = data => ({
  ok: true,
  data
});

export function createProfileService({ store, auth }) {

  function getProfile() {
    const user = auth.currentUser();

    if (!user) {
      return failure(
        "UNAUTHENTICATED",
        "Please sign in first."
      );
    }

    return success({ ...user });
  }

  function updateProfile(changes) {
    const user = auth.currentUser();

    if (!user) {
      return failure(
        "UNAUTHENTICATED",
        "Please sign in first."
      );
    }

    const email =
      String(changes.email ?? "").trim();

    const phone =
      String(changes.phone ?? "").trim();

    if (
      !email ||
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      return failure(
        "INVALID_EMAIL",
        "Enter a valid email address."
      );
    }

    if (
      phone &&
      !/^[0-9+() .-]{8,20}$/.test(phone)
    ) {
      return failure(
        "INVALID_PHONE",
        "Enter a valid phone number."
      );
    }

    return store.commit({
      operation: "profile.update",

      apply(draft) {
        const target =
          draft.users.find(
            item => item.userId === user.userId
          );

        if (!target) {
          return failure(
            "USER_NOT_FOUND",
            "Profile owner no longer exists."
          );
        }

        target.email = email;
        target.phone = phone;

        return success({ ...target });
      }
    });
  }

  return {
    getProfile,
    updateProfile
  };
}