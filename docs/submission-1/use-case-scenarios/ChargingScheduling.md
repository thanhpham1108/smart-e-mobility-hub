# Use Case: Smart Charging Slot Scheduling

## 1. Overview
* **Use Case ID:** UC-05
* **Use Case Name:** Smart Charging Slot Scheduling
* **Primary Actor:** Student / EV Owner
* **Secondary Actor:** Smart Charging Scheduler (System Engine)
* **Description:** Allows students and EV owners to reserve and schedule a charging slot at a designated campus Hub. The system automatically prioritizes and allocates slots based on current battery level, target state of charge (SoC), and departure schedule.

---

## 2. Preconditions
1. The user is logged in to the application with a `Student` role.
2. The selected Hub is operational with charging infrastructure configured.
3. Vehicle details (current battery percentage, target SoC) are registered or simulated in system state.

---

## 3. Postconditions
1. A charging slot is successfully allocated and marked as `Reserved` (or the user is assigned a priority position in the charging queue).
2. The estimated charging start time, completion time, and estimated fee are calculated and displayed.
3. State changes are stored in client storage (`localStorage`) and logged to the developer console.

---

## 4. Main Success Scenario (Basic Flow)

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| **1** | User navigates to the Hub details screen and selects **"Smart Charging"**. | Displays the Hub's charging bay overview (available vs. occupied ports) and detected vehicle state. |
| **2** | User selects target State of Charge (e.g., 80%) and specifies expected departure time. | Dynamically computes and displays estimated charging duration needed based on battery deficit. |
| **3** | User clicks **"Schedule Charging Slot"**. | Initiates validation and scheduling allocation logic. |
| **4** | — | Validates that the selected departure timestamp is strictly in the future. |
| **5** | — | Checks available charging ports. Identifies an open port matching the vehicle's charge profile. |
| **6** | — | Applies rule-based prioritization (lowest battery percentage first / FCFS) and locks the selected slot. |
| **7** | — | Updates slot status to `Reserved`, hides it from other users' search results, and emits a timestamped console log. |
| **8** | — | Displays reservation confirmation with Port ID, scheduled start/end times, and estimated cost. |

---

## 5. Alternative & Exception Flows

### 4a. Invalid Time Selected
* **4a1.** User submits a departure time that is in the past or shorter than the required minimum charging window.
* **4a2.** System rejects the request and displays inline error: *"Invalid time selected."*
* **4a3.** User adjusts the departure time and re-submits (returns to Step 3).

### 5a. All Charging Ports Occupied (Queue Enrolment)
* **5a1.** System identifies that all charging ports at the selected Hub are currently occupied or reserved.
* **5a2.** System notifies user: *"All ports currently occupied. Would you like to join the priority charging queue?"* with an estimated waiting time.
* **5a3.** User confirms joining the queue.
* **5a4.** System places the vehicle into the priority queue (sorted by battery percentage ascending: vehicles with lowest battery get higher priority).
* **5a5.** System updates user UI with Queue Position Ticket and estimated wait time.

### 8a. User Cancels Scheduled Reservation
* **8a1.** User views active reservation summary and clicks **"Cancel Reservation"**.
* **8a2.** System prompts for confirmation.
* **8a3.** User confirms cancellation.
* **8a4.** System reverts slot status to `Available` (or automatically reassigns it to the next vehicle waiting in the priority queue).
* **8a5.** System emits state change log to developer console and displays cancellation confirmation banner.
