import { pageHeader, badge } from "../../shared/components.js";
import { actionForm, e, input, mountRecords, panel } from "../../shared/records.js";

export function mount(root, context) {
  return mountRecords(root, context, (profile, _viewer, memory) => {
    const contact = memory.draft ?? profile;
    return `${pageHeader("Student Portal", "Personal Profile", "Manage contact information for your demo account.")}
      <div class="hub-profile">
        ${panel("Account", `<dl class="hub-identity">
          <div><dt>Full name</dt><dd>${e(profile.name)}</dd></div>
          <div><dt>Account ID</dt><dd>${e(profile.userId)}</dd></div>
          <div><dt>Role</dt><dd>${badge("Student", "info")}</dd></div>
        </dl>`)}
        ${panel("Contact information", actionForm("identity.profile",
          input("email", "Email", `type="email" maxlength="160" autocomplete="email" value="${e(contact.email ?? "")}"`) +
          input("phone", "Phone number", `type="tel" maxlength="32" autocomplete="tel" value="${e(contact.phone ?? "")}"`),
          "Save changes"))}
      </div>`;
  }, {
    async "identity.profile"(contact, { api, memory }) {
      memory.draft = contact;
      const result = await api.command("identity.profile", contact);
      if (result.ok) memory.draft = null;
      return result.ok ? { ...result, message: "Contact information updated." } : result;
    }
  });
}
