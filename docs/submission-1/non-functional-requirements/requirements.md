# Non-Functional Requirements (FURPS+ Framework)

## 1. Functionality 
* **Security (Role-Based Access Control):** The system shall restrict access based on two roles: `Student` and `Operator`. Students cannot access the Operator Dashboard or fleet management tools, and Operators must authenticate to access redistribution and maintenance views.
* **Input Validation & Error Handling:** The system shall validate all reservation and scheduling inputs, preventing bookings for timestamps in the past. Invalid requests must trigger an inline error: *"Invalid time selected."*
* **Data Integrity (Concurrency Prevention):** When a vehicle, parking spot, or charging slot is reserved, its status must immediately transition to `Reserved` (locally/in-state) to prevent double-booking from subsequent queries.

## 2. Reliability
* **Safe Retries (Idempotency):** The system must handle rapid, duplicate user submissions (e.g., double-clicks or unstable connection retries) without creating duplicate booking records.
* **Session & State Persistence:** If a user refreshes the browser during an active flow (e.g., viewing Hub details, selecting a vehicle, or configuring a charging slot), the application must persist the current selection state in client storage (`localStorage` or `sessionStorage`).
* **Fail-Safe Simulation States:** During the What-If Simulation (Domain 6), if an Operator simulates a "Hub Offline" event, all active charging sessions within that Hub must automatically fall back to a `Paused` state rather than counting charging time indefinitely.

## 3. Performance
* **Client-Side Filtering Latency:** Filtering vehicle or hub lists (e.g., filtering by battery level $> 50\%$) must update the view within $1.0\text{ s}$.
* **Dashboard Initial Render:** The Operator Dashboard overview (hub capacities, active alerts) must achieve an initial render time of under $2.0\text{ s}$ under standard network conditions.
* **Non-Blocking Simulation:** The What-If Simulation engine must compute asynchronously (e.g., via Web Workers or async tasks) without blocking the UI thread, allowing the Operator to navigate other tabs during execution.

## 4. Supportability
* **Separation of Concerns:** The codebase must maintain a clear separation between presentation (HTML/CSS) and domain logic (JavaScript/Python modules) to facilitate parallel work across team members.
* **State Transition Logging:** Key domain state changes (e.g., vehicle changing from `Available` to `Reserved`, charging slot state moving to `Occupied`) must emit structured, timestamped logs to the browser console for MVP debugging.
* **Cross-Browser Support:** The web client must run cleanly on modern evergreen browsers (Chrome, Safari, Edge) without requiring third-party extensions.

## 5. Usability
* **The 3-Click Rule:** Core student user flows (finding a hub and reserving an available vehicle or charging slot) must be completable within a maximum of three navigation steps/clicks from the main view.
* **Responsive Mobile-First Layout:** The student-facing interface must adapt responsively across standard mobile viewport widths ($320\text{px}$ to $430\text{px}$) without horizontal scrolling or layout breakage.

## 6. Constraints (+)
* **Decoupled Mock Data:** All mock/pre-populated datasets (vehicles, hubs, charging stations) must reside in standalone JSON fixtures. Raw data structures must not be hard-coded into UI components.
* **Timezone & Temporal Standards:** All timestamp operations (reservations, charging queues, schedules) must adhere to ISO 8601 formatting and be normalized to the local timezone (`GMT+7`) to prevent queue calculation errors.
* **Lightweight Smart Charging Logic:** The charging scheduler uses straightforward rule-based prioritization (e.g., lowest battery first or first-come, first-served). Each hub manages a queue of up to 20 vehicles at a time, ensuring slot assignments update smoothly in the browser without requiring complex optimization engines.
* **Mock IoT:** Vehicle telemetry (GPS coordinates, battery levels, digital locks) shall be simulated via state events and mock timers; no live hardware integration is required.
* **Simulated Billing:** Rental and charging transactions shall operate exclusively via a mock student campus credit system without external third-party payment gateways.
