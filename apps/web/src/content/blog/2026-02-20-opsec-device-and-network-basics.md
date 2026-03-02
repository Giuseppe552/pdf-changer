# Device and network basics (non‑technical)

You can scrub a PDF perfectly and still get identified because of **where** and **how** you did it. Most “anonymity failures” come from the **device** or the **network**, not from PDF metadata.

This is a practical checklist for non‑technical people. Calm on purpose — fewer steps means fewer mistakes.

## 1) Avoid work devices and work accounts

If possible, **don’t use a work laptop/phone**, and don’t use a work‑managed browser profile/account.

Why it matters:

- Work devices may have monitoring, management, or backups you don’t control.
- Even if you scrub a document perfectly, the *device* can still reveal you.

## 2) Avoid work networks

If possible, don’t use your employer’s Wi‑Fi or VPN to access sensitive sites.

Why it matters:

- Networks often have logs and monitoring independent of the website you’re visiting.

## 3) Reduce “cloud surprises”

Before you handle sensitive files, take a minute to reduce accidental syncing:

- Turn off auto‑backup/sync for the folder where files land (cloud drive apps).
- Be careful with messaging apps that automatically upload “files” to their servers.

Why it matters:

- Your threat model may include *your own cloud account* being accessed or audited.

## 4) Keep it offline when you can

After you’ve loaded PDF Changer once, you can often use it offline (PWA/app cache).

Why it matters:

- Processing offline can reduce accidental network exposure while you work.

Step‑by‑step: [offline mode walkthrough](/blog/basics/using-pdf-changer-offline).

## 5) Don’t forget the obvious

These sound silly. They’re also common:

- Don’t include your name in the **filename** you share.
- Don’t screenshot with a visible username/desktop background that identifies you.
- Don’t edit a PDF in a tool that adds identifying “Producer/Creator” stamps.

## What we can and can’t do

PDF Changer helps with the **document layer** (metadata + interactive elements). It can’t protect you from:

- a compromised device,
- monitoring on a managed device/network,
- visible identifiers inside the content.

If you haven’t read it yet: [Anonymity 101](/blog/basics/anonymity-101).
