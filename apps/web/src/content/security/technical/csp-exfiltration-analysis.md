---
title: CSP Exfiltration Analysis
summary: Analysis of browser-based data exfiltration vectors and how CSP and VPE address each one.
audience: [teams]
riskLevel: high
difficulty: advanced
lastReviewed: 2026-03-14
tags: [csp, exfiltration, browser, security, research]
estimatedMinutes: 20
---

# CSP Exfiltration Analysis

This document analyzes browser-based data exfiltration vectors relevant to client-side PDF processing. Each vector is assessed for risk (1-100) and the mitigation applied by PDF Changer's VPE.

## CSP-blocked vectors

These are fully blocked by the Content Security Policy applied inside the VPE sandbox:

| Vector | Risk | Mitigation |
|--------|------|-----------|
| fetch() to external server | 95 | `connect-src 'none'` |
| XMLHttpRequest | 95 | `connect-src 'none'` |
| WebSocket connection | 90 | `connect-src 'none'` |
| navigator.sendBeacon() | 85 | `connect-src 'none'` |
| Image pixel beacon (new Image()) | 80 | `img-src 'none'` |
| Dynamic script injection | 80 | `script-src 'unsafe-inline'` (no external) |
| CSS background-image URL | 70 | `style-src 'none'` |
| FontFace URL loading | 65 | `font-src 'none'` |
| Form submission to external URL | 60 | `form-action 'none'` |
| EventSource (SSE) | 55 | `connect-src 'none'` |
| iframe navigation | 50 | `frame-src 'none'` + sandbox |
| SVG foreignObject with external ref | 45 | `img-src 'none'` |
| XSLT with external document() | 40 | `default-src 'none'` |
| Prefetch/preconnect link elements | 35 | `default-src 'none'` |

## Separately mitigated vectors

These bypass CSP but are addressed by other VPE mechanisms:

| Vector | Risk | Mitigation |
|--------|------|-----------|
| WebRTC ICE candidate leakage | 90 | RTCPeerConnection monkey-patched to undefined |
| WebRTC ufrag/password data encoding | 85 | Same monkey-patch |
| DNS prefetch subdomain encoding | 75 | `X-DNS-Prefetch-Control: off` header |
| DOM element injection (tracking pixel) | 70 | MutationObserver detects all suspicious elements |
| Dynamic link rel="dns-prefetch" | 60 | We control all HTML; no dynamic injection possible |

## Cannot-block vectors

These cannot be mitigated by any in-browser mechanism:

| Vector | Risk | Why |
|--------|------|-----|
| Browser extensions with host permissions | 95 | Extensions bypass CSP entirely, can read DOM and intercept requests |
| OS-level network monitoring | 85 | Operating system sees all traffic regardless of browser sandbox |
| Spectre-class side-channel attacks | 70 | Full mitigation is impossible in software (per Chromium Security Team) |
| Hardware keyloggers or screen capture | 65 | Physical access defeats all software protections |
| Compromised browser binary | 60 | Modified browser can ignore all security policies |
| DNS-over-HTTPS resolver logging | 40 | DoH resolver sees query patterns regardless of browser behavior |

## Research references

- Steffens, Stock, Johns. "Data Exfiltration in the Face of CSP." ACM AsiaCCS 2016. Proved DNS prefetch bypasses the strictest CSP configurations.
- Chromium Security Team. Post-Spectre Threat Model. States that "full Spectre mitigation is impossible in software."
- W3C CSP Working Group. Issue #92. WebRTC exfiltration acknowledged in 2016; no fix implemented.
- CVE-2020-6519. Chrome CSP bypass via javascript: URI bookmarks.
- Chen, Gorbaty, Singhal, Jackson. "Self-Exfiltration: The Dangers of Browser-Enforced IFC." IEEE W2SP 2012.

## What this does not protect

This analysis covers browser-level vectors only. It does not address OS-level monitoring, hardware-level attacks, or compromised browser binaries. See the [residual risk disclosure](/security/technical/residual-risk-disclosure) for those vectors.

## Methodology

Each vector was tested against:
1. A strict CSP with `default-src 'none'` and no connect-src allowlist
2. A sandboxed iframe without `allow-same-origin`
3. The combination of both (PDF Changer's approach)

Risk scores reflect the vector's potential impact if unmitigated, considering data bandwidth, detectability, and reliability. They are not CVSS scores.
