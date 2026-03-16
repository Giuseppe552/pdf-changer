/**
 * CSP Exfiltration Test Runner
 *
 * Automated Playwright script that runs the test harness in Chrome,
 * Firefox, and WebKit, then collects and compares results.
 *
 * Prerequisites:
 *   1. Start receiver:  bun run receiver.ts  (port 9999)
 *   2. Start server:    bun run server.ts    (port 8888)
 *   3. Run this:        npx playwright test runner.ts
 *
 * Or run directly:
 *   npx tsx runner.ts
 */

import { chromium, firefox, webkit, type BrowserType } from "playwright";

type TestResult = {
  id: number;
  name: string;
  category: string;
  result: string;
  detail: string;
};

type BrowserResult = {
  browser: string;
  version: string;
  userAgent: string;
  results: TestResult[];
  cspViolations: Array<{
    directive: string;
    blockedURI: string;
    timestamp: number;
  }>;
};

async function runBrowser(browserType: BrowserType): Promise<BrowserResult> {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages for debugging
  const consoleMessages: string[] = [];
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto("http://localhost:8888/harness.html", {
    waitUntil: "domcontentloaded",
  });

  // Wait for tests to complete (max 30s)
  await page.waitForFunction(
    () => (window as unknown as { __testsDone: boolean }).__testsDone === true,
    { timeout: 30_000 },
  );

  const results = await page.evaluate(
    () => (window as unknown as { __testResults: TestResult[] }).__testResults,
  );

  const cspViolations = await page.evaluate(
    () =>
      (
        window as unknown as {
          __cspViolations: Array<{
            directive: string;
            blockedURI: string;
            timestamp: number;
          }>;
        }
      ).__cspViolations,
  );

  const userAgent = await page.evaluate(() => navigator.userAgent);

  await browser.close();

  return {
    browser: browserType.name(),
    version: browser.version(),
    userAgent,
    results,
    cspViolations,
  };
}

async function main() {
  console.log("CSP Exfiltration Cross-Browser Test Runner");
  console.log("==========================================\n");

  const browsers: BrowserType[] = [chromium, firefox, webkit];
  const allResults: BrowserResult[] = [];

  for (const browserType of browsers) {
    console.log(`Testing ${browserType.name()}...`);
    try {
      const result = await runBrowser(browserType);
      allResults.push(result);
      console.log(
        `  ${result.results.length} tests, ` +
          `${result.results.filter((r) => r.result === "blocked").length} blocked, ` +
          `${result.results.filter((r) => r.result === "executed").length} executed`,
      );
    } catch (e) {
      console.error(`  Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Print comparison table
  console.log("\n\nComparison Table");
  console.log("================\n");

  const header = ["#", "Vector", "Category"];
  for (const r of allResults) header.push(r.browser);
  console.log(header.join("\t"));
  console.log(header.map(() => "---").join("\t"));

  // Get all test IDs from the first browser's results
  const testIds = allResults[0]?.results.map((r) => r.id) ?? [];
  for (const id of testIds) {
    const row: string[] = [];
    const first = allResults[0]?.results.find((r) => r.id === id);
    row.push(String(id));
    row.push(first?.name ?? "?");
    row.push(first?.category ?? "?");
    for (const browserResult of allResults) {
      const test = browserResult.results.find((r) => r.id === id);
      row.push(test?.result ?? "n/a");
    }
    console.log(row.join("\t"));
  }

  // Write JSON output
  const output = {
    generatedAt: new Date().toISOString(),
    browsers: allResults,
  };

  const fs = await import("node:fs");
  const filename = `csp-results-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${filename}`);
}

main().catch(console.error);
