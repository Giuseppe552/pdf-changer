# CSP Exfiltration Cross-Browser Test Suite

Standalone test harness for systematically testing browser data exfiltration vectors against Content Security Policy restrictions.

## Quick start

```bash
# Terminal 1: Start the receiver (logs all incoming requests)
bun run receiver.ts
# or: npx tsx receiver.ts

# Terminal 2: Start the test harness server (serves HTML with CSP headers)
bun run server.ts
# or: npx tsx server.ts

# Terminal 3: Open in browser manually
open http://localhost:8888/harness.html

# Or run automated cross-browser tests
npx tsx runner.ts
```

## Architecture

```
receiver.ts     — HTTP server on :9999, logs every request (the "attacker")
server.ts       — HTTP server on :8888, serves harness.html with CSP headers
harness.html    — Self-contained test page, no dependencies
runner.ts       — Playwright script for automated cross-browser testing
```

## CSP policy under test

The harness is served with the same CSP policy as PDF Changer's Verified Processing Environment:

```
default-src 'none';
script-src 'unsafe-inline';
style-src 'unsafe-inline';
img-src 'none';
connect-src 'none';
font-src 'none';
object-src 'none';
media-src 'none';
frame-src 'none';
form-action 'none';
base-uri 'none';
worker-src 'none'
```

## Test routes

| URL | CSP | Purpose |
|-----|-----|---------|
| `/harness.html` | Strict (VPE policy) | Primary test |
| `/harness-relaxed.html` | Permissive | Baseline comparison |
| `/harness-sandbox.html` | Strict + sandbox iframe | Sandbox escape testing |

## Results

Each test produces a JSON result with:
- Browser name and version
- User agent string
- Per-vector results (blocked / executed / error / timeout / unknown)
- CSP violation events captured by the page

Export results from the browser UI or use the Playwright runner for automated collection.
