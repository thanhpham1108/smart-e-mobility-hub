# What-if Simulation — Design test cases (bonus)

**Owner:** Nguyễn Xuân An — 2452023; Submission 3 support: Phạm Nguyễn Công Thành — 2453175. [Class diagram](../class-diagram/what-if/06-what-if.puml) · [Method catalogue](../method-design/06-what-if.md).

## TC-W-01 — Completed simulation stays isolated

| Field | Value |
| --- | --- |
| Related use case | UC-W01–W04 |
| Initial state | A ReadyToRun scenario increases charging demand at a known Hub; live Hub, parking and charging records have known versions. |
| Steps | Start run, allow snapshot and simulation to complete, then view result and recommendations. |
| Expected response | Result shows predicted charging congestion, baseline timestamp/assumptions and feasible recommendations or No Intervention Required. |
| Expected state | Run is Completed with one baseline and one result. Live source versions, allocations, reservations, incidents and vehicle states are unchanged; reviewing a recommendation makes no live write. |

## TC-W-02 — Incomplete snapshot or worker failure

| Field | Value |
| --- | --- |
| Related use case | UC-W02, UC-W03 |
| Initial state | A valid ReadyToRun scenario; one source cannot provide a consistent snapshot, or the worker times out after a snapshot. |
| Steps | Start a run under each failure condition, then request its result. |
| Expected response | Run becomes Failed with a stage/reason; result request reports unavailable/incomplete. A retry creates a new run ID. |
| Expected state | No Failed run is published as Completed; no partial result/recommendation and no live state change. |

## TC-W-03 — Compare different baselines and horizons

| Field | Value |
| --- | --- |
| Related use case | UC-W05 |
| Initial state | Two Completed runs have compatible metric definitions but different snapshot timestamps, assumptions or simulation periods. |
| Steps | Compare the two runs; then compare the first run to its stored baseline. |
| Expected response | Both comparisons show defined metric deltas and relevant comparability warnings; the baseline comparison identifies its own baseline. Missing/incompatible measures are not fabricated. |
| Expected state | Runs, results, recommendations, snapshots and live operational state remain unchanged. |

## TC-W-04 — Full arrivals remain simulation statistics

| Field | Value |
| --- | --- |
| Related use cases | UC-W01–W04 |
| Initial state | A scenario generates more charging arrivals per hour than its copied Hub capacity can serve. The live Hub has its own FCFS waitlist. |
| Steps | Run the scenario and inspect its result and recommendations. |
| Expected response | The result counts simulated Full/rejected arrivals and reports point utilization and completed sessions. It does not claim simulated waitlist positions or queue delay. |
| Expected state | The simulation changes only its copied state. The live waitlist, requests, allocations and Hub capacity remain unchanged; recommendations are read-only. |
