# Contributing to Smart E-Mobility Hub

The app uses native HTML, CSS and JavaScript on GitHub Pages. The app opens directly in demo mode, and Supabase PostgreSQL stores shared state. Use the [database setup guide](docs/implementation/DATABASE_SETUP.md) to run a local database or access the hosted demo.

## Work on a feature

1. Start from `develop` after the SQL frontend cutover. During the rollout, start from `integration/supabase-postgres`. Read your module's assignment, data contract and UI guide in the [implementation guide](docs/implementation/README.md).
2. Follow [Add a table or demo data](docs/implementation/ADD_DATABASE_CHANGES.md) for a complete migration example. Update the API and data contract, review effects on modules that share the same IDs, then verify the change locally.
3. Put domain decisions in SQL commands and keep screens focused on collecting input and showing results. Use the shared client and the existing shells. Pass stable IDs across modules. Keep data state in PostgreSQL. Store only the Auth session and temporary interaction state in the browser.
4. Open a feature PR to the same base branch. Include the route, required portal, setup or seed, steps, expected database changes and any paired module needed for verification. Mention new migrations and their order.
5. Coordinate deployment with the integration lead. When a frontend change needs a new schema, deploy and verify the migration first. Avoid resetting the hosted demo during another teammate's review.

## Verify a flow

Use `npm ci && npm test` for the local PostgreSQL checks and the browser for portal switching, navigation, errors and persistence. For cross-device behavior open the Student and Operator portals in separate browser profiles. Check that the Operator sees the update within the next visible-tab refresh.
