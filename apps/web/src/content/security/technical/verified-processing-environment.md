---
title: Verified Processing Environment (VPE)
summary: Architecture of the VPE system that proves no data leaves the browser during PDF processing.
audience: [teams, journalists, whistleblowers]
riskLevel: medium
difficulty: advanced
lastReviewed: 2026-03-14
tags: [vpe, sandbox, csp, audit, privacy]
estimatedMinutes: 15
---

# Verified Processing Environment (VPE)

PDF Changer processes files client-side with zero uploads. The VPE wraps every processing operation in a monitored environment and produces a tamper-evident audit report proving no data left the browser.

## Architecture

Every PDF operation runs inside three concentric layers of protection:

1. **Sandboxed iframe** with opaque origin (`sandbox="allow-scripts"` without `allow-same-origin`). The iframe cannot make fetch/XHR to any origin, cannot access localStorage or cookies, and cannot navigate the parent window. Its own CSP blocks `connect-src`, `img-src`, `font-src`, and `form-action`.

2. **Three audit monitors** run simultaneously in the parent page:
   - **PerformanceObserver** watches all resource timing entries (fetch, XHR, script, img loads)
   - **CSP violation listener** captures blocked exfiltration attempts with the directive that blocked them
   - **MutationObserver** detects injected DOM elements (scripts, images, iframes, objects)

3. **WebRTC monkey-patch** removes `RTCPeerConnection` and `webkitRTCPeerConnection` from the global scope during processing. This prevents IP leakage via ICE candidates and data encoding in ufrag/password fields.

## Audit report

After processing, the VPE produces a report containing:

- SHA-256 hashes of input and output bytes
- List of all detected events (network requests, CSP violations, DOM injections)
- Verdict: clean (zero events), suspicious (events detected), or failed
- Which monitors were active and the CSP policy in effect
- Processing duration and file sizes

For reports with events, an HMAC chain provides tamper-evidence: each entry's HMAC covers the previous entry's HMAC plus the current event data. Modifying or removing any entry breaks the chain.

## CSP inside the sandbox

The sandbox HTML includes its own maximally restrictive Content Security Policy:

```
default-src 'none';
script-src 'unsafe-inline' 'wasm-unsafe-eval';
worker-src blob:;
connect-src 'none';
form-action 'none';
img-src 'none';
font-src 'none';
style-src 'none';
media-src 'none';
object-src 'none';
frame-src 'none';
```

No `report-uri` or `report-to` directives are used because CSP reports are themselves an exfiltration vector.

## How each vector is blocked

| Vector | Mitigation |
|--------|-----------|
| fetch/XHR | CSP `connect-src 'none'` + opaque origin |
| WebSocket | CSP `connect-src 'none'` |
| Image pixel beacons | CSP `img-src 'none'` |
| Form submission | CSP `form-action 'none'` |
| WebRTC ICE candidates | Monkey-patched away |
| DNS prefetch | `X-DNS-Prefetch-Control: off` header |
| Dynamic script injection | MutationObserver + CSP `script-src` |
| sendBeacon | CSP `connect-src 'none'` |
| FontFace loading | CSP `font-src 'none'` |

## Export formats

Reports can be exported as:

- **JSON** with HMAC chain and ephemeral verification key. Machine-readable for programmatic verification.
- **Standalone HTML** with inline CSS. No external dependencies. Contains full report, residual risk disclosure, and verification instructions.

## What this does not protect

See the [residual risk disclosure](/security/technical/residual-risk-disclosure) for vectors that cannot be blocked in-browser: browser extensions, OS-level compromise, Spectre-class attacks, and hardware-level threats.
