# PostgreSQL setup and release

GitHub Pages serves the browser app. Supabase applies SQL migrations and hosts its shared PostgreSQL data. The project's URL and publishable key connect the browser to Supabase.

## Open the demo

Open SmartHub and use the Student/Operator switch in the header. The browser automatically opens a Supabase anonymous session and each portal uses its seeded demo profile. Keep the seeded profiles unlinked to email accounts while demo access is active. Visitors share the same sample records, so use fictional contact details in the Student profile.

## Local development

1. Install Node.js and Docker. Run `npx supabase start` at the repository root, then `npx supabase db reset --local` to load the migrations and SQL seed. The local Auth configuration enables anonymous sessions.
2. Serve the repo using `python3 -m http.server 4173`. To connect this browser to the local stack, change the two values in the `hosted` configuration object in [backend.js](../../src/app/backend.js) to the local API URL and publishable key printed by the CLI. Keep the local change out of the feature commit. With the repository configuration unchanged, opening localhost uses the hosted demo database.
3. Run `npm ci` and `npm test` to check migrations and role handling against embedded PostgreSQL. Use local Supabase for a full browser check, including opening both portals and refreshing them after a change.

## Hosted demo

1. The GitHub integration tracks `develop` from the repository root (`.`). With **Deploy to production** enabled, a push or merge to `develop` applies new files in `supabase/migrations/` in order. Supabase records applied migrations. Add a new migration for later changes. The local `seed.sql` and Auth settings are excluded from the default hosted deployment. The initial hosted sample data is loaded by a migration in this repo.
2. In the hosted Supabase Dashboard, use the [GitHub Pages URL](https://thanhpham1108.github.io/smart-e-mobility-hub/) as the Auth **Site URL**. Under **Authentication → Sign In / Providers**, enable **Allow new users to sign up** and **Allow anonymous sign-ins**. Confirm that the new SQL migration is applied before releasing the frontend that calls it.
3. Verify that both portals open on GitHub Pages. Use the Operator switch to advance time or reset the shared demo. Reset clears operational history, notifications and command receipts and restores the sample dataset for everyone using the demo project.

## Ownership and migration rules

- Follow [Add a table or demo data](ADD_DATABASE_CHANGES.md) for a worked example and the difference between hosted data and records restored by **Reset Demo**.
- Add a timestamped migration when a table, constraint, function or grant changes. Once deployed, repair it in a new migration. Keep migration order explicit across member branches.
- Use dates in ISO 8601 and compare them in PostgreSQL. Show demo times in Asia/Ho_Chi_Minh. Implement expiry against the shared demo clock. The server's real receive time orders charging requests, with current battery and request ID as tie breakers.
- The demo browser calls `demo_view` and `demo_command`, which delegate to `app_view` and `app_command`. Each module adds operations to its own SQL handler and uses the shared envelope. Backend functions own resource eligibility, role checks and cross-module writes.
- Run the shared PostgreSQL checks and a browser smoke test before publishing. The hosted demo is a shared environment for final verification and presentation. Use the local stack for resets during feature development.
