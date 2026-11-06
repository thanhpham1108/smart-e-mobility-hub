# `<Module>` — Method descriptions

**Owner:** `<member name>`

**Class diagram:** `../class-diagram/<module>.puml`

**Use cases:** `<UC IDs>`

Add one row for **every** operation appearing in the class diagram. Keep the signature identical, including parameter and return types. Do not add rows for attributes or operations absent from the diagram.

| Class.method signature | Purpose | Input and output | Preconditions | Postconditions / state change | Errors / exception result |
| --- | --- | --- | --- | --- | --- |
| `ExampleService.doWork(input: Input): Result` | What this operation accomplishes | `input`: meaning; returns `Result` | Required session, state or resource | Data/state after success | Invalid input, conflict, unavailable data, or retry behavior |

After editing, compare the diagram's operation list against this table in both directions. State updates must follow the related Submission 2 state chart; cross-module calls must use the contracts in the [architecture baseline](../architectural-design/architecture_baseline.md).
