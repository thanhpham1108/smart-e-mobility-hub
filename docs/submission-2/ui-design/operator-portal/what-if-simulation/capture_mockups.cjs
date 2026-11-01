const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const base = __dirname;

async function capture(page, screen, filename, selector) {
  await page.locator(`[data-screen="${screen}"]`).last().click();
  await page.waitForSelector(selector);
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  if (dimensions.width !== 1440 || dimensions.height !== 900) throw new Error(`${screen} is ${dimensions.width}x${dimensions.height}, expected 1440x900`);
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

    await capture(page, "configure", "UI_OPERATOR_Configure_WhatIf_Scenario.png", ".scenario-grid");
    const liveBefore = await page.evaluate(() => JSON.stringify(appState.liveNetwork));
    await page.locator('[data-action="run"]').first().click();
    await page.waitForSelector('[data-view="results"].active .kpi-grid');
    const runCheck = await page.evaluate(() => ({
      liveAfter: JSON.stringify(appState.liveNetwork),
      run: appState.runs.find((item) => item.id === "SIM-1101-04")
    }));
    if (runCheck.liveAfter !== liveBefore) throw new Error("What-if run modified live network state");
    if (!runCheck.run || runCheck.run.status !== "Completed" || !runCheck.run.baseline) throw new Error("Completed run lacks baseline or result status");
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(base, "UI_OPERATOR_Simulation_Results.png"), fullPage: true });
    console.log("UI_OPERATOR_Simulation_Results.png: 1440 x 900");

    await capture(page, "compare", "UI_OPERATOR_Compare_Scenarios.png", ".comparison-table");
    const finalLive = await page.evaluate(() => JSON.stringify(appState.liveNetwork));
    if (finalLive !== liveBefore) throw new Error("Comparison modified live network state");
    if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
    console.log("Workflow checks: isolated run, completed result, and read-only comparison passed");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
