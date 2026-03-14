---
title: Residual Risk Disclosure
summary: Honest disclosure of what the VPE cannot protect against, with practical recommendations.
audience: [general-users, journalists, whistleblowers]
riskLevel: high
difficulty: intermediate
lastReviewed: 2026-03-14
tags: [vpe, risk, disclosure, extensions, os]
estimatedMinutes: 8
---

# Residual Risk Disclosure

PDF Changer's Verified Processing Environment monitors network requests, CSP violations, and DOM mutations during processing. This page describes what it cannot protect against.

## Browser extensions

**Risk: 95/100**

Browser extensions with host permissions can read page content, intercept network requests, and access the DOM regardless of any Content Security Policy. A malicious extension could silently exfiltrate your PDF data.

**What you can do:** Use a browser profile with zero extensions when processing sensitive documents. Firefox containers or a dedicated Chromium profile work well. For maximum safety, use Tor Browser.

## Operating system compromise

**Risk: 85/100**

If your operating system is compromised (malware, rootkit, keylogger), no browser-level protection matters. The OS can read process memory, capture screen content, and monitor all network traffic.

**What you can do:** Use a trusted, up-to-date operating system. For extreme sensitivity, use Tails OS booted from USB, which leaves no trace on the host machine.

## Spectre-class side channels

**Risk: 70/100**

Spectre and related microarchitectural attacks can read data across process boundaries through timing side channels. The Chromium Security Team has stated that "full Spectre mitigation is impossible in software." Site isolation helps but does not eliminate the risk.

**What you can do:** Keep your browser updated. Use site isolation (enabled by default in modern Chrome/Firefox). For extreme sensitivity, process on an air-gapped machine.

## Hardware-level threats

**Risk: 65/100**

Physical access to your device defeats all software protections. Hardware keyloggers, screen capture devices, and firmware-level implants operate below the OS.

**What you can do:** Maintain physical control of your device. For extreme sensitivity, use a dedicated, inspected device.

## DNS residual risk

**Risk: 40/100**

`X-DNS-Prefetch-Control: off` is respected by Firefox but partially ignored by Chrome for explicit `<link rel="dns-prefetch">` tags. Since PDF Changer controls all HTML and never injects dynamic DNS prefetch links, this gap is theoretical in practice.

**What you can do:** Use DNS-over-HTTPS with a trusted resolver.

## What this does not protect

This page itself is the disclosure. No in-browser mechanism can protect against the vectors listed above. The recommendations below reduce exposure but cannot eliminate these risks entirely. For maximum protection, process sensitive documents on an air-gapped machine running Tails OS.

## Recommendations by threat level

### Standard (most users)
- Use an up-to-date browser
- Check the green VPE badge after processing
- Review the audit report if concerned

### Elevated (journalists, legal professionals)
- Use a browser profile with zero extensions
- Verify the audit report before sharing processed files
- Use the DIY verification (DevTools Network tab) for independent confirmation

### Maximum (whistleblowers, high-risk sources)
- Use Tor Browser on Tails OS
- Process on an air-gapped machine
- Never process sensitive documents on a shared or managed device
- Export and retain the VPE audit report as evidence
