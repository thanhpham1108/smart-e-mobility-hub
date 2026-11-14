# PC UI reference frames

These are the **exact two Submission 2 prototypes selected as the PC visual baseline** for implementation. They are copied here so every feature owner can inspect the same screenshot and source while working inside `docs/implementation/`. The Submission 2 originals remain in place as submitted course artifacts.

| Portal | Screenshot to match | Source prototype | Live shared shell |
| --- | --- | --- | --- |
| Student | [Reserve Parking Space](student/reference.png) | [HTML](student/index.html), [CSS](student/styles.css), [JS](student/app.js), `student/assets/` | [`src/ui/student/shell.js`](../../../src/ui/student/shell.js) |
| Operator | [Network Overview](operator/reference.png) | [HTML](operator/index.html), [CSS](operator/styles.css), [JS](operator/app.js), [fixtures](operator/fixtures.json) | [`src/ui/operator/shell.js`](../../../src/ui/operator/shell.js) |

The screenshots define the PC shell, hierarchy, palette, spacing and shared control appearance. The copied HTML/CSS/JS are **read-only design references**. Each prototype has its own navigation, demo data and event handlers; importing its whole `app.js` into the live app would duplicate those responsibilities. Implement features in `src/ui/` and `src/modules/` using the shared entry point, router and store described in [UI_DESIGN_SYSTEM.md](../UI_DESIGN_SYSTEM.md).

To inspect the copies as interactive prototypes, serve the repository with `python3 -m http.server 4173` from the root and open `/docs/implementation/ui-reference/student/` or `/docs/implementation/ui-reference/operator/`. The operator prototype loads its copied `fixtures.json` over HTTP. For the live shared foundation, open `/#/student/parking` or `/#/operator/network`.
