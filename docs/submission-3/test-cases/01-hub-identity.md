# Hub & Identity — Test cases (bonus)

**Owner:** Võ Hoàng Phúc Duy — 2452214

**Related class diagram:** `../class-diagram/01-hub-identity.puml`

## TC-HI-01 — Valid sign-in creates an authorized session

| Field | Value |
| --- | --- |
| Related use case | `UC-A01 — Sign In` |
| Initial state / preconditions | A registered Student account exists. The supplied identifier and credential are valid. No active session for this login attempt exists. |
| Input and steps | 1. Submit the valid identifier and credential. 2. `AuthService.authenticate(...)` verifies the account. 3. System creates a `Session` containing the Student role. 4. Protected Student operation is attempted with that session. |
| Expected response | Authentication succeeds. A session is returned. The Student role is available for authorization. |
| Expected persisted state | One authenticated session exists for the login attempt. No reservation, rental, parking, or charging state is modified. |

## TC-HI-02 — Wrong-role request is rejected

| Field | Value |
| --- | --- |
| Related use case | `UC-A01/UC-A02` and the architecture rule for authentication and role checks |
| Initial state / preconditions | A valid Student session exists and is active. An operation requiring the `OPERATOR` role is requested. |
| Input and steps | 1. Submit the protected request with the Student session. 2. `AuthService.authorize(session, OPERATOR)` checks the session. 3. Authorization result is evaluated before the protected operation executes. |
| Expected response | Authorization returns `false`. The protected Operator operation is rejected with an authorization error/denial. |
| Expected persisted state | No protected resource, Hub state, reservation, rental, charging request, or incident state is changed. The existing Student session remains valid. |

## TC-HI-03 — No matching Hub / stale Hub status is handled without false availability

| Field | Value |
| --- | --- |
| Related use case | `UC-H02 — Find a Mobility Hub` and `UC-H03 — View Hub Status` |
| Initial state / preconditions | The search criteria contain a valid location and required service, but no Hub satisfies the criteria; separately, a selected Hub may contain a stale `lastUpdated` value. |
| Input and steps | 1. Student searches using the location and service criteria. 2. `HubService.findHubs(...)` returns an empty list. 3. UI displays the no-results message and allows the Student to change the location/range. 4. If a Hub is later selected, `HubService.getHubStatus(hubId)` returns status data including `lastUpdated`. 5. UI marks stale/unavailable data rather than presenting it as current. |
| Expected response | Search returns an empty list when no Hub matches. The user can search again. For a stale status, the UI displays the freshness information and does not falsely label stale telemetry as real-time. |
| Expected persisted state | No reservation or other allocation is created by the search/status operation. A retry/search with changed criteria performs a fresh query. |

