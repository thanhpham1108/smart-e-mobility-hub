# PostgreSQL setup and release

The browser app on GitHub Pages uses Supabase Auth and the Data API. SQL migrations create the schema and the demo data. Only the project URL and publishable key are part of the browser configuration. Grant administrative access through Supabase, and share demo account passwords privately.

## Local development

1. Install Node.js and Docker for the local Supabase stack. Run `npx supabase start` at the repository root, then `npx supabase db reset`. This reset targets the local instance and loads the migrations and SQL seed.
2. Open local Supabase Studio using the URL shown by the CLI. In **Authentication → Users**, add and auto-confirm `demo-student@example.com` and `demo-operator@example.com`. Add `demo-guest@example.com` to test two different students. Use the SQL Editor to run [link-demo-users.sql](../../supabase/link-demo-users.sql) and check that the accounts you created show `linked = true`.
3. Serve the repo using `python3 -m http.server 4173`. To connect this browser to the local stack, change the two values in the `hosted` configuration object in [backend.js](../../src/app/backend.js) to the local API URL and publishable key printed by the CLI. Keep the local change out of the feature commit. With the repository configuration unchanged, opening localhost uses the hosted demo database.
4. Install check dependencies with `npm ci`, then run `npm test`. The check runs migrations against an embedded PostgreSQL engine with simulated Auth claims. For an Auth and browser integration check, use the local Supabase stack or the hosted demo.

## Hosted demo

1. The GitHub integration tracks `develop` from the repository root. Release migration changes first so Supabase can apply them independently of the frontend.
2. In the hosted Supabase Dashboard, use the [GitHub Pages URL](https://thanhpham1108.github.io/smart-e-mobility-hub/) as the Auth **Site URL**. Disable public sign-ups, then add and auto-confirm the demo accounts from the local instructions. Run the identity linking script. The production integration applies the SQL migrations. It does not automatically copy local Auth settings or local accounts.
3. Check that the Supabase deployment has applied every migration, that the accounts are linked and that both portal roles can read the required views. Then publish the frontend update to `develop` and verify the GitHub Pages release.
4. To switch portals, sign out and sign in with the other account. The Operator can advance time or reset the shared demo. Reset clears operational history, notifications and command receipts and restores the deterministic dataset. It preserves Auth accounts and profile mappings. A reset affects everyone using the demo project; confirm it before a walkthrough.

## Ownership and migration rules

- Add a timestamped migration when a table, constraint, function or grant changes. Once deployed, repair it in a new migration. Keep migration order explicit across member branches.
- Use dates in ISO 8601 and compare them in PostgreSQL. Show demo times in Asia/Ho_Chi_Minh. Implement expiry against the shared demo clock. The server's real receive time orders charging requests, with current battery and request ID as tie breakers.
- The browser calls `app_view` for reads and `app_command` for writes. Each module adds operations to its own SQL handler and uses the shared envelope. Backend functions own resource eligibility, role checks and cross-module writes.
- Run the shared PostgreSQL checks and a browser smoke test before publishing. The hosted demo is a shared environment for final verification and presentation. Use the local stack for resets during feature development.
