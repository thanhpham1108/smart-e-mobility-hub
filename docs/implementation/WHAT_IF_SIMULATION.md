# What-if Simulation

Operator route: `#/operator/what-if`. Covers UC-W01–W05 using the existing SmartHub shell and Supabase demo session.

## Try a scenario

1. In **Scenario setup**, enter **Morning charging surge**, select **KTX Khu A**, set **60 minutes** and **15 motorcycle charging requests/hour**. Leave the other quantities at zero. Review and save.
2. Click **Run**. Check the snapshot time and Hub freshness in **Results**. The baseline contains the selected Hub's free vehicles, parking and charging counts, charging point states and commitments, plus spare capacity at other eligible Hubs.
3. Review the Full count, charging utilization and completed sessions. Open **Recommendations** to see what the Operator could review.
4. Create a second scenario for the same Hub with **120 minutes** and **Hub goes offline** selected. Run it and open **Compare**. Compare the two completed runs to see the duration and condition warnings, then compare a run with its own captured baseline.

## Model assumptions

- A scenario applies one or several conditions at one selected Hub. It starts at snapshot capture and runs for 15–1,440 minutes.
- Requests are spread evenly over the horizon. Each new charging session takes 60 minutes. Only compatible free points accept new requests. Existing commitments hold throughout the horizon unless a simulated outage or fault interrupts them.
- A simulated Full request counts as rejected. Charging utilization measures charging minutes divided by operational point minutes. An outage with no operational points has no utilization percentage. Completed sessions count only new simulated sessions that finish inside the horizon.
- Rental and parking use captured free capacity. The model holds new bookings for the horizon and takes no credit for unknown releases. Vehicle concentration consumes spare parking capacity before new arrivals. Recommendations use captured alternative capacity and are advisory.
- Legacy runs remain readable. A comparison between different model versions or missing metrics displays no delta for those metrics.

## Isolation and local checks

Migration `20261127000100_what_if_simulation.sql` adds the conditions and assumptions fields and captures a baseline under the same state lock as the operational commands. Both RPC entry points dispatch simulation commands without invoking operational reconciliation. The browser worker receives a copy of the snapshot and saves completed results and recommendations together. A failed run has no completed result.

Run `npm test` and `node scripts/check-what-if.mjs` from the branch checkout. The second command checks the model, snapshot immutability, role checks, failure handling, comparisons and unchanged operational records even when a scheduled charging commitment is already due for reconciliation. For a browser preview on an available port, the disposable PGlite server in `scripts/fleet-preview.mjs` also serves the What-if route.

Apply the migration to the target Supabase project before deploying this frontend. Migrations already in hosted history are kept intact.
