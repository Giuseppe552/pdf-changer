---
title: Network Model Limits
summary: Where network privacy controls help and where they do not in document-sharing workflows.
audience: [teams, whistleblowers, journalists]
riskLevel: high
difficulty: intermediate
lastReviewed: 2026-02-20
tags: [network, vpn, tor, threat-model]
estimatedMinutes: 8
---

# Network Model Limits

Network controls reduce some signals, but they are not identity erasers. Treat them as one layer, not the whole model.

## What network controls can reduce

- Direct source IP visibility to destination services.
- Some traffic correlation by local network observers.
- Repeated pattern exposure when correctly combined with workflow controls.

## What they cannot fix

- Identity leaks in document content or account credentials.
- Browser/session fingerprinting from unsafe endpoint setup.
- Recipient-side exposure once content is shared.

## What this does not protect

- Compromised devices.
- Operational mistakes like account reuse.
- Legal process targeting service providers.

## Next safe steps

- Read `/faq/network-opsec/does-a-vpn-make-me-anonymous`.
- Read `/faq/network-opsec/should-i-use-tor-for-submissions`.
