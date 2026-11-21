# Contributing to Smart E-Mobility Hub

Start from `develop`. The app uses native HTML, CSS and JavaScript on GitHub Pages. Supabase Auth verifies the demo users and PostgreSQL stores shared state. Use the [database setup guide](docs/implementation/DATABASE_SETUP.md) to run a local database or access the hosted demo.

## Work on a feature

1. Read your module's assignment in the [implementation guide](docs/implementation/README.md). Use the [shared contracts](docs/implementation/SHARED_CONTRACTS.md) and [UI design system](docs/implementation/UI_DESIGN_SYSTEM.md).
2. For schema changes, add a migration under `supabase/migrations/` and update the API and data contract. Review effects on other modules that use the same IDs. Run migrations against a clean local instance and check the existing MVP workflows.
3. Put domain decisions in SQL commands and keep screens focused on collecting input and showing results. Use the shared client and the existing shells. Pass stable IDs across modules. Keep data state in PostgreSQL. Store only the Auth session and temporary interaction state in the browser.
4. Open a feature PR to `develop`. Include the route, required account, setup or seed, steps, expected database changes and any paired module needed for verification. Mention new migrations and their order.
5. Coordinate deployment with the integration lead. When a frontend change needs a new schema, deploy and verify the migration first. Avoid resetting the hosted demo during another teammate's review.

## Verify a flow

Use `npm ci && npm test` for the local PostgreSQL checks and the browser for login, navigation, errors and persistence. For cross-device behavior sign in as Student and Operator in separate browser profiles. Check that the Operator sees the update within the next visible-tab refresh.
