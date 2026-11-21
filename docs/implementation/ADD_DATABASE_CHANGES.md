# Add a table or demo data

Each feature owner adds their own SQL changes on a Git branch. The source of truth for a shared schema change is a new file in `supabase/migrations/`. Use [database setup](DATABASE_SETUP.md) to start local Supabase and open the demo.

A GitHub contributor can write and review migrations using local Supabase. Hosted dashboard access is for the people who manage the project and verify deployments.

## Add a table

1. Start from the current Supabase integration base and create your feature branch. Update your branch before generating the migration so it includes the tables your module references. During the rollout, the base with the SQL frontend is `integration/supabase-postgres`. After cutover, use `develop`.
2. Generate a migration. Pick a short name that says which feature owns it.

   ```bash
   npx supabase migration new parking_hub_labels
   ```

3. Write the SQL in the new timestamped file. This example adds a parking label per Hub. It links to the shared Hub ID, and its primary key prevents duplicate codes within a Hub.

   ```sql
   create table app.hub_parking_labels (
     hub_id text not null references app.hubs(id) on delete cascade,
     code text not null,
     label text not null,
     primary key (hub_id, code)
   );

   create function app.seed_hub_parking_labels() returns void
   language sql set search_path = '' as $$
     insert into app.hub_parking_labels (hub_id, code, label)
     values ('ktx-a', 'VISITOR', 'Visitor parking')
     on conflict (hub_id, code) do nothing;
   $$;

   select app.seed_hub_parking_labels();
   ```

4. If a screen uses the rows, expose the specific fields through the appropriate `app_view` case. If users can change them, add an operation through `app_command` and its owning handler. Check the caller's role and ownership in SQL. Keep the table in schema `app` and call the API from the feature service. See the [shared contracts](SHARED_CONTRACTS.md).

## Add demo data or make it survive reset

- To add rows to an existing table, generate a new migration with an `INSERT` using stable IDs and references that already exist. For sample rows the app can edit, use `ON CONFLICT DO NOTHING` to preserve existing edits. A migration runs against the current hosted data, so avoid using a global reset to add a row.
- For data that must come back after the Operator clicks **Reset Demo**, also update `app.restore_demo()` in a new migration. Copy the current function definition, use `CREATE OR REPLACE FUNCTION`, and call the module's seed helper after its parent rows exist. In the example, call `app.seed_hub_parking_labels()` after restoring `app.hubs`. The cascade clears these dependent labels when demo hubs are deleted. For tables without a cascade, delete their demo rows before deleting the parent rows.
- The current [seed.sql](../../supabase/seed.sql) initializes an empty database. A new migration delivers added demo rows to the hosted project, and the reset function decides what the app restores on later resets.

## Check and submit

Apply the migration locally with `npx supabase db reset --local`. Check the new table in local Studio by selecting schema **app**. Run `npm test`, then open the feature screen with the appropriate demo role. If the rows are part of the demo baseline, use **Reset Demo** locally and verify they come back. Commit the migration, any API changes and the relevant docs together. In the PR, list the changed table, demo IDs, role needed and how to verify the flow.
