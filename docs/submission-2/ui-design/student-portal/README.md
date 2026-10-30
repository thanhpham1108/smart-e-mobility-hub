# Student Portal — Parking & Private EV Mockups

| Screen | Use cases | Screenshot | Source |
| --- | --- | --- | --- |
| Reserve Parking Space | UC-P01, UC-S02, UC-X01 | [PNG](UI_STUDENT_ReserveParkingSpace.png) | [HTML](parking-private-ev/index.html), [CSS](parking-private-ev/styles.css), [JavaScript](parking-private-ev/app.js) |
| Parking Ticket | UC-P06, UC-P02 | [PNG](UI_STUDENT_ParkingTicket.png) | [HTML](parking-private-ev/index.html), [CSS](parking-private-ev/styles.css), [JavaScript](parking-private-ev/app.js) |
| My Parking Bookings | UC-P03, UC-P04, UC-P07 | [PNG](UI_STUDENT_MyParkingBookings.png) | [HTML](parking-private-ev/index.html), [CSS](parking-private-ev/styles.css), [JavaScript](parking-private-ev/app.js) |

## Run the Mockup

Open `parking-private-ev/index.html` directly in a browser. No installation or network connection is required. Alternatively, from the repository root:

```sh
python3 -m http.server 8000 --directory docs/submission-2/ui-design/student-portal
```

Open `http://localhost:8000/parking-private-ev/`. The three views are available at `#reserve`, `#ticket`, and `#bookings`.

## Export Screenshots

Set the browser viewport to **1440 × 900**, reset the demo, and capture each view as PNG using the filenames in the table. The supplied images use that exact resolution.

## Scope and Demo Data

The assignment lists three mobile screens, while [UI guidelines](../ui_guidelines.md) explicitly standardize a single desktop application. These deliverables follow the guidelines' desktop layout and export format; the same source also adapts to narrow screens.

- Emerald primary actions, cyan/sky charging accents, slate backgrounds, rounded cards, a 64-pixel Student Portal navbar, Hub search and role switch follow the design system.
- The clock is fixed at **24 October 2026, 09:07 (UTC+7)** for repeatable screenshots. All data is fictional and held in memory. Reloading the page or choosing **Reset demo** restores the fixtures.
- Check-in uses the displayed deadline and is unavailable before arrival or at/after expiry. Parking capacity is checked across the entire selected interval in the mock data. KTX Khu A is full from 12:00–13:00; Ga Metro ĐHQG is full from 10:00–11:00. KTX Khu B provides an alternative.
- The demo allows one extra reservation (`PK-1024-082`) per reset. An equivalent active reservation returns the existing ticket. QR assets encode the matching demo reference and are explicitly invalid for real entry.
- Charging submission creates Pending, not a guaranteed slot. Cancelling parking also cancels linked Pending/Scheduled charging. An Active charging session must stop before checkout; declining checkout afterwards keeps charging stopped and parking active.
- The role switch provides a read-only Operator preview. Rental screens, real authentication, camera scanning, physical barriers, backend storage and real scheduling are outside this mockup.

Verified interactions: invalid times, full-interval alternatives, new reservation and QR reference, early check-in rejection, valid check-in/checkout, battery validation, charging request, cancellation cascade, stopping charging before checkout, retaining stopped charging after declining checkout, search/filter, role switch and 390-pixel layout overflow. All three primary views fit within 1440 × 900 with no page overflow.
