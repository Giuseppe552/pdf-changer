---
title: What Verified Processing Means
summary: Plain-language explanation of the green shield badge and what it proves about your privacy.
audience: [general-users, office-workers]
riskLevel: low
difficulty: beginner
lastReviewed: 2026-03-14
tags: [vpe, badge, privacy, verification]
estimatedMinutes: 4
---

# What Verified Processing Means

When you process a PDF with PDF Changer, you see a green shield badge that says "Verified clean." This page explains what that means in plain language.

## What the badge proves

The badge means that during processing:

- **Zero network requests** were made. Your file data stayed in your browser.
- **No scripts were injected** into the page by extensions or other code.
- **No browser policy violations** occurred. The strict security rules were active and working.
- **WebRTC was disabled** so your IP address could not be leaked through a side channel.

Three independent monitors watched for these events simultaneously. If any of them detected something, the badge would turn amber or red instead of green.

## What you can check yourself

You do not have to trust the badge. You can verify independently:

1. Open your browser's developer tools (press F12).
2. Go to the Network tab.
3. Process a PDF.
4. See for yourself: zero requests to external servers.

You can also visit the [Verify page](/verify) to run an automated test.

## What this does not protect

The badge cannot detect browser extensions reading your data, operating system malware capturing your screen, or hardware devices like keyloggers. These threats operate below the browser level and no website can detect them. If you are in a high-risk situation, read our [residual risk disclosure](/security/technical/residual-risk-disclosure) for practical steps.

## The audit report

Click "Details" on the badge to see the full audit report. This includes:

- SHA-256 hashes of your input and output files (for integrity verification).
- Which monitors were active and what they found.
- The security policy that was in effect during processing.

You can export this report as JSON or HTML and keep it as a record.
