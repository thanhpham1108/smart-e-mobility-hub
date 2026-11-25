// Run against scripts/fleet-preview.mjs, never a shared or hosted demo.
// Install Playwright separately, or set PLAYWRIGHT_MODULE to its absolute index.mjs.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("dialog", dialog => dialog.accept());
const base = "http://127.0.0.1:4173";
const out = "output/fleet-incident";
await mkdir(out, { recursive: true });
async function command(op, input = {}) {
  const response = await page.request.post(base + "/__local_rpc", { data: { name: "demo_command", args: { p_role: "operator", p_operation: op, p_input: input, p_command_id: crypto.randomUUID() } } });
  const result = (await response.json()).data;
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.data;
}
async function go(route, title) {
  await page.goto(`${base}/#/operator/${route}`);
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
}
async function action(label, expectedText) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByText(expectedText, { exact: false }).first().waitFor();
}
async function shot(name) { await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }); }
try {
  await command("demo.reset", { confirm: true });
  await go("network", "Network Overview");
  await shot("01-network");
  await go("fleet", "Fleet & Redistribution");
  await page.locator('[name="vehicleIds"][value="rental-a-01"]').check();
  await page.locator('[name="vehicleIds"][value="rental-a-02"]').check();
  await action("Review feasibility", "Ready for confirmation");
  await shot("02-transfer-review");
  await action("Confirm reviewed transfer", "Transfer created.");
  await action("Dispatch vehicles", "Dispatch recorded.");
  await page.locator('form[data-action="arrive"] [value="rental-a-01"]').check();
  await action("Confirm selected arrivals", "Selected arrivals confirmed.");
  assert.equal(await page.locator('.fi-order').filter({ hasText: "Partial" }).count(), 1);
  await shot("03-partial-arrival");
  await go("incidents", "Incidents & Recovery");
  await page.getByLabel("Affected resource").selectOption("vehicle:rental-a-02");
  await page.getByLabel("Observed fault").fill("Brake fault after dispatch; vehicle held for inspection.");
  await page.getByLabel("Fault reference", { exact: true }).fill("brake-demo");
  await action("Report and restrict resource", "Fault recorded;");
  await action("Start investigation", "Investigation started.");
  await page.getByLabel("Repair owner").fill("Mai Hoàng Phương Đông");
  await page.getByLabel("Investigation and repair plan").fill("Inspect brake cable, replace and perform a safe brake test.");
  await action("Assign repair plan", "Repair plan assigned.");
  await page.getByLabel("Repair evidence").fill("Cable replaced. Brake response checked successfully.");
  await page.getByText("Repair work is complete", { exact: true }).click();
  await action("Save repair update", "Repair evidence saved.");
  await shot("04-incident-repair");
  await action("Verify recovery and resolve", "Recovery verified.");
  await action("Close incident", "Incident closed.");
  await shot("05-incident-closed");
  await go("fleet", "Fleet & Redistribution");
  await action("Revalidate order", "Order revalidated.");
  await page.locator('form[data-action="arrive"] [value="rental-a-02"]').check();
  await action("Confirm selected arrivals", "Selected arrivals confirmed.");
  await shot("06-transfer-completed");
  await go("network", "Network Overview");
  await page.getByLabel("Observed battery (%)").fill("71");
  await action("Send observation", "Vehicle observation accepted.");
  await action("Replay same event", "Duplicate event acknowledged.");
  await shot("07-telemetry-replay");
  // A polling refresh must preserve a partially entered form.
  await page.getByLabel("Observation note").fill("Unsaved field note");
  await command("demo.advance");
  await page.waitForFunction(() => document.querySelector('[data-demo-time]')?.textContent.includes("09:15"), { timeout: 10000 });
  assert.equal(await page.getByLabel("Observation note").inputValue(), "Unsaved field note");
  await action("Use current demo time", "Telemetry simulator");
  assert.equal(await page.getByLabel("Observed at (ICT)").inputValue(), "2026-10-24T09:15");
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, title] of [["network", "Network Overview"], ["fleet", "Fleet & Redistribution"], ["incidents", "Incidents & Recovery"]]) {
      await go(route, title);
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert.ok(dimensions.content <= dimensions.viewport, `${route} overflows at ${width}: ${JSON.stringify(dimensions)}`);
      await shot(`${route}-${width}`);
    }
  }
  // A separate branch of the demo verifies cancellation of outstanding work only.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await command("demo.reset", { confirm: true });
  await go("fleet", "Fleet & Redistribution");
  await page.locator('[name="vehicleIds"][value="rental-a-01"]').check();
  await page.locator('[name="vehicleIds"][value="rental-a-02"]').check();
  await action("Review feasibility", "Ready for confirmation");
  await action("Confirm reviewed transfer", "Transfer created.");
  await action("Dispatch vehicles", "Dispatch recorded.");
  await page.locator('form[data-action="arrive"] [value="rental-a-01"]').check();
  await action("Confirm selected arrivals", "Selected arrivals confirmed.");
  await command("incident.report", { vehicleId: "rental-a-02", description: "Brake fault; vehicle returned for repair." });
  await go("fleet", "Fleet & Redistribution");
  await page.getByText("Cancel remaining work after verified return", { exact: true }).click();
  await page.getByLabel("Disposition evidence").fill("Operator received rental-a-02 at KTX Khu A, original parking area.");
  await page.getByText("All outstanding vehicles are physically at the source Hub", { exact: true }).click();
  await action("Confirm return and cancel remaining work", "Remaining transfer work cancelled.");
  assert.equal(await page.locator('.fi-order').filter({ hasText: "Cancelled" }).count(), 1);
  await page.getByText("Transfer history", { exact: true }).click();
  await shot("08-verified-cancellation");
  assert.deepEqual(errors, []);
  console.log("Passed: transfer review/dispatch/partial arrival, incident repair/recovery, revalidation/completion, telemetry replay, verified partial cancellation, polling draft preservation; 1440/1024/390 layouts.");
} finally { await browser.close(); }
