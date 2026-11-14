# UI implementation contract

This document is the visual and interaction source of truth for the implementation. It keeps the emerald/slate direction of the [Submission 2 UI guideline](../submission-2/ui-design/hud-identity/ui_guidelines.md) and the existing Student/Operator mockups, while applying the later decision to build **one HTML/CSS/JavaScript app**. The old guideline's React/Tailwind prompt is a mockup instruction, not the implementation stack. The current integration priority is the **PC layout**; mobile refinement follows after the desktop pages are assembled.

## One app, two role shells

- **Student shell:** one 64 px top bar with brand, Hub/Rental/Parking navigation, current account/role and a role switch. Main content uses the same page heading, action position and card layout on every Student route.
- **Operator shell:** one 256 px dark slate sidebar on desktop, with Network, Fleet, Incidents, Charging and What-if routes. The same 64 px top bar shows current Hub, demo status and role switch. On narrow screens, navigation becomes a compact menu; it is not duplicated inside feature pages.
- **Routing:** hash routes; every route works after refresh from the GitHub Pages project URL. A direct route that needs a role shows the shared role selection, then returns to the requested route.
- **One state:** Student and Operator views read the same browser store on the demo machine. Switching role changes the shell and available actions, not the underlying data.

Member 1 owns the shells and shared UI primitives. Feature owners render page content into the shell. No feature creates its own navbar, sidebar, role switch, reset control, toast framework, or global CSS rules.

## Canonical references and source folders

Use **[Reserve Parking Space](../submission-2/ui-design/student-portal/UI_STUDENT_ReserveParkingSpace.png)** as the Student visual reference: white 64 px navigation, emerald active route, light slate page, form/cards and a clear summary panel. Use **[Network Overview](../submission-2/ui-design/operator-portal/fleet-incident-mockup/UI_OPERATOR_Network_Overview.png)** as the Operator visual reference: dark sidebar, white top header, page heading, KPI cards and content panels. They define the shell and component language; domain views can have different content layouts.

Target folder structure:

```text
index.html
src/app/              # main.js, router.js, browser store and demo clock
src/ui/shared/        # tokens.css, base.css, components.css, components.js
src/ui/student/       # shell.js and Hub, Rental, Parking/Charging pages
src/ui/operator/      # shell.js and Fleet, Incident, Charging, What-if pages
src/modules/<area>/   # feature services and rules, separate from rendering
```

Member 1 first extracts the two reference shells and shared primitives into these folders. Other members add route content inside the appropriate portal folder and call their domain services in `src/modules/`. Do not copy either reference's complete HTML/CSS into each feature: that would create six separately maintained navbars, forms and status badges again. New UI elements should be built from the shared primitives or proposed for addition to `ui/shared`.

## Shared JavaScript and feature page contract

The existing parking and Fleet `app.js` files are self-contained prototypes: each owns its navigation, event listeners, demo state and rendering. Use their appearance and feature flow as references, then extract common code once. Do **not** use either whole `app.js` as a file that every member copies; copied event handlers and state would diverge as soon as features are integrated.

Use browser-native ES modules (`import`/`export`) and one `index.html` entry. `src/app/main.js` initializes the store and router. The router selects the role shell and mounts one page into a content element. Each page exports the same small interface:

```js
export function mount(root, context) {
  // Render this route and attach only its own event handlers.
  // context exposes the store, owning services and shared UI helpers.
  return () => { /* remove listeners/timers created by this page */ };
}
```

The router calls the returned cleanup function before mounting another route. Pages do not write `window.onhashchange`, register permanent document-wide click handlers, replace the whole document, or create a second app state. The shell owns navigation and role switching; `src/ui/shared/components.js` owns common controls and feedback; `src/modules/<area>/` owns business transitions. A page reads a snapshot, calls an owning service, then refreshes its visible data from the shared store. The exact `context` fields and route names should be frozen in the foundation PR and shown in one working Student page and one working Operator page before the feature branches start.

Shared files have one owner and one review path. Feature branches may add a page and its scoped stylesheet. A change to a shared component or token is a separate, small change reviewed with Member 1; after it merges, other features import the updated version. This lets six people work in parallel without editing the same `app.js` or CSS rules. The shared stylesheet is imported once at the entry point; page styles use a route root selector such as `.parking-page` so they cannot restyle another feature.

## Visual tokens

Implement these as CSS custom properties in one `src/ui/shared/tokens.css`; feature CSS must reference the variables. The tokens follow the common palette already visible in the parking, Fleet and What-if mockups. The older blue Hub prototype should be recolored through these tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--color-primary` | `#059669` | Main action, selected navigation, positive emphasis |
| `--color-primary-soft` | `#ECFDF5` | Selected/positive surface |
| `--color-charging` | `#06B6D4` | Charging and battery accents |
| `--color-info` | `#0284C7` | Links and informational states |
| `--color-warning` | `#F59E0B` | Waiting, low battery, near capacity |
| `--color-danger` | `#EF4444` | Fault, Full, destructive action, error |
| `--color-bg` | `#F8FAFC` | App background |
| `--color-surface` | `#FFFFFF` | Cards, modal, table background |
| `--color-text` | `#0F172A` | Main text |
| `--color-muted` | `#64748B` | Secondary text |
| `--color-border` | `#E2E8F0` | Dividers, input/card borders |
| `--color-sidebar` | `#0F172A` | Operator navigation |

Use Inter if it is loaded; fall back to system sans serif. Body text is 16 px with line-height about 1.5; secondary text 14 px; compact labels may be 12 px. Page titles are 28 px desktop and 24 px mobile; section headings 18–20 px. Use a spacing scale of 4, 8, 12, 16, 24 and 32 px. Shared cards use a 12 px radius, fields/buttons 8 px, badges pill shaped. Use 1 px borders and restrained shadow only where needed for separation. Do not copy the 9–11 px dashboard body text from some mockups into the working app.

Status is conveyed by **label and color together**: Available/Completed uses positive green; Reserved/In Use/Charging uses info or charging blue; Waiting/At Risk uses amber; Full/Faulted/Cancelled uses red or neutral as appropriate. Each badge receives a visible text label; a color alone does not carry meaning. The exact domain status string comes from its owner module, while the shared badge maps status to visual tone.

## Shared components and their owners

| Component | Shared rule | Owner |
| --- | --- | --- |
| `AppShell`, `StudentNav`, `OperatorNav`, `PageHeader` | One implementation for all routes; active location and role are clear. | Member 1 |
| `Button`, `IconButton`, `TextField`, `SelectField`, `Modal` | One size scale, disabled/loading/focus styles, visible labels and inline validation. | Member 1 |
| `Card`, `StatCard`, `StatusBadge`, `Alert`, `EmptyState`, `Toast` | One border/radius/type system; use semantic status tones. | Member 1 |
| `DataTable`, `FilterBar`, `Tabs` | Shared header/filter/empty behavior; mobile layout may become stacked rows. | Member 1, extended by feature owner only through props/data |
| Domain visuals: parking interval grid, vehicle card, charging schedule/queue, redistribution progress, simulation chart | Use shared tokens and common controls; domain owner keeps the visualization logic. | Relevant feature owner |

No component should query or mutate domain state itself. The page calls its owning service and passes data to UI components. Feature CSS may define layout for a domain visualization, but cannot override global button, input, heading, badge, navbar or sidebar styles.

## Responsive and interaction rules

- **Current review width:** 1440 px desktop, with a 1024 px laptop check when a page is dense. After the PC pages are integrated, inspect 768 px tablet and 390 px phone. At 390 px, no horizontal page scrolling; charts and dense tables may scroll inside their own labelled region or switch to stacked cards.
- **Page layout:** main content max-width about 1320 px with 16 px phone and 24 px desktop side padding. Desktop split views collapse to one column on phones. Do not fix a page to the 1440 × 900 mockup size.
- **Controls:** primary actions have consistent placement, minimum 44 × 44 px touch target on mobile, visible keyboard focus and disabled/loading feedback. Hover cannot be the only cue. Form errors appear beside the relevant field and are summarized when a submit fails.
- **Feedback:** use shared toast/alert language for success, Full/waitlist, expired booking, conflict and telemetry/data-unavailable states. Never present a planned charging end as a confirmed stop or a future waiting request as an assigned point.
- **Accessibility:** semantic headings and controls, labels for inputs and icons, sufficient text contrast, and status text in addition to color. Motion respects reduced-motion preferences.

## Screen coverage and prototype references

| Route group | Required working views | Existing starting point |
| --- | --- | --- |
| Student / Hub | Login/role choice, Hub search/status, profile | [Hub & Identity prototype](../submission-2/ui-design/hud-identity/README.md) |
| Student / Rental | Vehicle list/details, reservation, trips, pickup/return | [Student Portal screenshots](../submission-2/ui-design/student-portal/README.md) |
| Student / Parking & Charging | Reserve interval, ticket, bookings, charging status/cancel/complete | [Parking prototype](../submission-2/ui-design/student-portal/parking-private-ev/), plus shared charging state |
| Operator / Fleet | Network overview, redistribution, incident desk, telemetry controls | [Fleet prototype](../submission-2/ui-design/operator-portal/fleet-incident-mockup/README.md) |
| Operator / Charging | Queue/waitlist, schedule, adjustment modal | [Charging mockups](../submission-2/ui-design/operator-portal/smart-charging/README.md) |
| Operator / What-if | Scenario configuration, results, recommendations, comparison | [What-if prototype](../submission-2/ui-design/operator-portal/what-if-simulation/README.md) |

Screenshots are **layout references**, not permission to revive superseded rules. In particular, the Charging mockup's mixed DC/AC power, grid-load threshold, promised future allocations and `InsufficientChargingTime` checks do not define the current MVP. Use the later [Smart Charging inventory](../submission-3/class-diagram/smart-charging/05-smart-charging-inventory.md) and method design for behavior. If the implemented display differs from the mockup, record the reason for the Final report.

## How six agents keep one visual system

1. **Foundation PR:** Member 1 merges tokens, shells and shared components into `develop`. The team inspects one Student and one Operator reference page at 1440 px before feature UI work starts. Mobile review comes after PC integration.
2. **Agent handoff:** every feature prompt includes this file, its assigned route, a screenshot reference, the available shared components and the domain status/error contract. Explicitly require importing shared CSS/components and forbid new global styles or new shell markup.
3. **Feature review:** each PC feature PR includes a screenshot of its working route at 1440 px, plus a short note for any new component or token requested. A new shared component goes through Member 1; a one-off domain visual stays local. Add 390 px screenshots in the later mobile pass.
4. **Visual acceptance:** compare navigation, heading, card, form, badge, empty/error state and spacing against the two reference pages. Check functional transitions after changing role or Hub. Fix differences before merging into `develop`.

**Copyable agent instruction:** “Implement only the assigned route inside the existing Student/Operator shell. Read `docs/implementation/UI_DESIGN_SYSTEM.md` and the route's source mockup. Import shared tokens and components; do not define global nav, button, form, badge or typography styles. Use the owning service for state changes. Show loading, success, empty and error states. Provide a 1440 px PC screenshot for review. Mobile polish follows after PC integration.”
