# Final MVP architecture

## Deployment

```mermaid
flowchart LR
    S[Student browser]
    O[Operator browser]
    G[GitHub Pages static frontend]
    A[Supabase Auth and Data API]
    P[Supabase PostgreSQL]
    S -->|HTTPS| G
    O -->|HTTPS| G
    S -->|Authenticated HTTPS| A
    O -->|Authenticated HTTPS| A
    A -->|RPC and SQL| P
```

The hosted project uses one shared demo dataset. Both browsers open the same HTML/CSS/JavaScript app directly. Each browser establishes an anonymous Supabase session automatically and polls views for the selected demo portal. No live device telemetry is required. The Operator submits identified simulated events.

## Development

```mermaid
flowchart TD
    UI[Student and Operator pages]
    JS[JavaScript services and route reads]
    RPC[Authenticated SQL views and commands]
    DB[Six domain schemas within the shared app schema]
    W[What-if Web Worker]
    UI --> JS --> RPC --> DB
    JS --> W
    W -->|Results and recommendations| JS
```

SQL commands use one transaction to recheck and change shared resources. The simulation captures a versioned copy before computation and only writes its own result. Details are in the [database setup](DATABASE_SETUP.md) and [shared contracts](SHARED_CONTRACTS.md).
