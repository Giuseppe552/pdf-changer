/**
 * CSP Test Harness Server
 *
 * Serves the test harness HTML with configurable CSP headers.
 * This simulates the PDF Changer VPE's CSP policy.
 *
 * Usage:
 *   bun run server.ts
 *   # or: npx tsx server.ts
 *
 * Open http://localhost:8888/harness.html in browser
 */

import { createServer, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 8888;
const DIR = import.meta.dirname ?? __dirname;

// The VPE's actual CSP policy
const CSP_STRICT = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'none'",
  "connect-src 'none'",
  "font-src 'none'",
  "object-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "worker-src 'none'",
].join("; ");

// Relaxed policy for baseline comparison
const CSP_RELAXED = "default-src * 'unsafe-inline' 'unsafe-eval'";

function serveFile(res: ServerResponse, filename: string, csp: string) {
  try {
    const content = readFileSync(join(DIR, filename), "utf-8");
    const contentType = filename.endsWith(".html")
      ? "text/html"
      : filename.endsWith(".json")
        ? "application/json"
        : "text/plain";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/harness.html") {
    serveFile(res, "harness.html", CSP_STRICT);
  } else if (url.pathname === "/harness-relaxed.html") {
    serveFile(res, "harness.html", CSP_RELAXED);
  } else if (url.pathname === "/harness-sandbox.html") {
    // Serve with sandbox iframe wrapper
    const wrapper = `<!DOCTYPE html>
<html><head><title>Sandbox Test</title></head><body>
<iframe sandbox="allow-scripts" src="/harness.html"
  style="width:100%;height:100vh;border:none"></iframe>
</body></html>`;
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Security-Policy": CSP_STRICT,
    });
    res.end(wrapper);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`CSP Test Harness Server on http://localhost:${PORT}`);
  console.log("");
  console.log("Routes:");
  console.log(`  /harness.html          — strict CSP (VPE policy)`);
  console.log(`  /harness-relaxed.html  — relaxed CSP (baseline)`);
  console.log(`  /harness-sandbox.html  — strict CSP + sandbox iframe`);
  console.log("");
  console.log(`Receiver should be running on http://localhost:9999`);
  console.log("");
});
