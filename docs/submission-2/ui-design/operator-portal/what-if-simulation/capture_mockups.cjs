const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const base = __dirname;

async function capture(page, screen, filename, selector) {
  await page.locator(`[data-screen="${screen}"]`).last().click();
  await page.waitForSelector(selector);
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  if (dimensions.width !== 1440 || dimensions.height !== 900) throw new Error(`${screen} is ${dimensions.width}x${dimensions.height}, expected 1440x900`);
  const viewOverflow = await page.locator(`[data-view="${screen}"]`).evaluate((view) => ({
    horizontal: view.scrollWidth - view.clientWidth,
    vertical: view.scrollHeight - view.clientHeight
  }));
  if (viewOverflow.horizontal > 1 || viewOverflow.vertical > 1) throw new Error(`${screen} view overflows by ${viewOverflow.horizontal}px x ${viewOverflow.vertical}px`);
  await page.screenshot({ path: path.join(base, filename), fullPage: true });
  console.log(`${filename}: ${dimensions.width} x ${dimensions.height}`);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"]
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(base, "index.html")).href);
    await page.waitForSelector(".scenario-grid");

    const liveBefore = await page.evaluate(() => JSON.stringify(appState.liveNetwork));
    const runCountBeforeSave = await page.evaluate(() => appState.runs.length);
    await page.locator('[data-action="save"]').first().click();
    const saveCheck = await page.evaluate(() => ({
      liveAfter: JSON.stringify(appState.liveNetwork),
      scenario: appState.scenarios.find((item) => item.id === "SCN-1101-04"),
      runCount: appState.runs.length,
      activeView: document.querySelector("[data-view].active")?.dataset.view
    }));
    if (saveCheck.liveAfter !== liveBefore) throw new Error("Saving a scenario modified live network state");
    if (!saveCheck.scenario || saveCheck.scenario.status !== "ReadyToRun") throw new Error("Scenario was not saved as ReadyToRun");
    if (saveCheck.runCount !== runCountBeforeSave) throw new Error("Saving a scenario started a simulation run");
    if (saveCheck.activeView !== "configure") throw new Error("Saving a scenario left the configuration screen");
    await page.waitForTimeout(1800);
    await capture(page, "configure", "UI_OPERATOR_Configure_WhatIf_Scenario.png", ".scenario-grid");

    await page.evaluate(() => appActions.runSimulation());
    await page.waitForSelector('[data-view="results"].active .kpi-grid');
    const runCheck = await page.evaluate(() => ({
      liveAfter: JSON.stringify(appState.liveNetwork),
      run: appState.runs.find((item) => item.id === "SIM-1101-04")
    }));
    if (runCheck.liveAfter !== liveBefore) throw new Error("What-if run modified live network state");
    if (!runCheck.run || runCheck.run.status !== "Completed" || !runCheck.run.baseline) throw new Error("Completed run lacks baseline or result status");
    await page.waitForTimeout(1800);
    await capture(page, "results", "UI_OPERATOR_Simulation_Results.png", ".result-context");

    await capture(page, "compare", "UI_OPERATOR_Compare_Scenarios.png", ".comparison-table");
    const finalLive = await page.evaluate(() => JSON.stringify(appState.liveNetwork));
    if (finalLive !== liveBefore) throw new Error("Comparison modified live network state");
    const outcomeCount = await page.locator(".outcome-comparison > div").count();
    if (outcomeCount !== 2) throw new Error("Comparison does not show both recommendation outcomes");
    if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
    console.log("Workflow checks: ReadyToRun save, isolated run, contextual result, and read-only comparison passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
