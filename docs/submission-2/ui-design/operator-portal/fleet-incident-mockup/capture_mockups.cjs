/** Export the three 1440px-wide submission mockups with Playwright and a local browser. */
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const base = __dirname;
const output = path.resolve(base, "..");
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const safeName = pathname === "/" ? "index.html" : path.basename(pathname);
  try {
    const bytes = await fs.readFile(path.join(base, safeName));
    response.writeHead(200, { "Content-Type": mime[path.extname(safeName)] || "application/octet-stream" });
    response.end(bytes);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BRAVE_PATH || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    args: ["--no-sandbox"]
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForSelector(".kpi-grid");
    const targets = [
      ["overview", "UI_OPERATOR_Network_Overview.png", ".kpi-grid"],
      ["redistribution", "UI_OPERATOR_Redistribution.png", ".vehicle-row"],
      ["incidents", "UI_OPERATOR_Incident_Desk.png", ".incident-item"]
    ];
    for (const [screen, filename, ready] of targets) {
      if (screen !== "overview") {
        await page.locator(`[data-screen="${screen}"]`).click();
        await page.waitForSelector(ready);
      }
      await page.screenshot({ path: path.join(output, filename), fullPage: true });
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
      console.log(`${filename}: ${dimensions.width} x ${dimensions.height}`);
      if (dimensions.width > 1440) throw new Error(`${screen} has horizontal overflow`);
    }
    // Exercise the two state-changing workflows after exporting the unchanged fixtures.
    await page.locator('[data-screen="redistribution"]').click();
    await page.locator('[data-action="validate-transfer"]').click();
    if (await page.locator('[data-action="create-order"]').isDisabled()) throw new Error("Feasible transfer was rejected");
    await page.locator('[data-action="create-order"]').click();
    const created = await page.evaluate(() => ({
      order: state.data.orders.find((item) => item.id === "RO-205"),
      sourceOccupied: hub("metro").occupied,
      destinationOccupied: hub("ktx-b").occupied
    }));
    if (!created.order || created.sourceOccupied !== 39 || created.destinationOccupied !== 34) throw new Error("Assignment changed physical occupancy before arrival");
    await page.locator('[data-arrival-id="EV-017"]').check();
    await page.locator('[data-action="confirm-arrival"]').click();
    const partial = await page.evaluate(() => ({ order: state.data.orders.find((item) => item.id === "RO-205"), first: vehicle("EV-017"), second: vehicle("EV-019") }));
    if (partial.order.status !== "PartiallyCompleted" || partial.first.hubId !== "ktx-b" || partial.second.hubId !== "metro") throw new Error("Partial arrival changed the wrong vehicles");
    await page.locator('[data-arrival-id="EV-019"]').check();
    await page.locator('[data-action="confirm-arrival"]').click();
    if (await page.evaluate(() => state.data.orders.find((item) => item.id === "RO-205").status) !== "Completed") throw new Error("Final arrival did not complete the order");

    await page.locator('[data-screen="incidents"]').click();
    await page.locator('[data-incident-id="INC-041"]').click();
    await page.locator("#repair-note").fill("Reservation rebooked and affected student notified");
    await page.locator('[data-action="resolve-commitments"]').click();
    await page.locator("#repair-note").fill("Controller repaired and safety inspection passed");
    await page.locator('[data-action="complete-repair"]').click();
    await page.locator('[data-action="resolve-incident"]').click();
    await page.locator('[data-action="close-incident"]').click();
    const resolved = await page.evaluate(() => ({ ticket: state.data.incidents.find((item) => item.id === "INC-041"), affected: vehicle("EV-008") }));
    if (resolved.ticket.status !== "Closed" || resolved.affected.status !== "Available") throw new Error("Incident could not be safely closed");
    await page.locator('[data-action="simulate-fault"]').click();
    await page.locator('[data-action="simulate-fault"]').click();
    const fault = await page.evaluate(() => ({ tickets: state.data.incidents.filter((item) => item.vehicleId === "EV-014" && item.status !== "Closed"), order: state.data.orders.find((item) => item.id === "RO-204"), affected: vehicle("EV-014") }));
    if (fault.tickets.length !== 1 || fault.order.status !== "AtRisk" || fault.affected.status !== "Faulted") throw new Error("Fault event did not deduplicate/restrict/flag at-risk order");
    console.log("Workflow checks: transfer, partial arrival, incident resolution, fault deduplication passed");
    if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
