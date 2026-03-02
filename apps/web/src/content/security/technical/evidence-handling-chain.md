---
title: Evidence Handling Chain
summary: Technical integrity practices for preserving document credibility while reducing exposure.
audience: [journalists, teams, whistleblowers]
riskLevel: medium
difficulty: advanced
lastReviewed: 2026-02-20
tags: [evidence, chain-of-custody, hashes, integrity]
estimatedMinutes: 9
---

# Evidence Handling Chain

Trust depends on both safety and integrity. Preserve a clear handling record for sensitive documents.

## Minimal chain model

1. Capture source context and file origin facts.
2. Compute and store input hash.
3. Apply defensive transformations (scrub) and compute output hash.
4. Record transfer events and recipients.

## Operational guidance

- Keep timestamps in one reference timezone.
- Never overwrite original evidence artifacts.
- Distinguish “analysis copy” and “distribution copy.”

## What this does not protect

- Fabricated source material.
- Recipient tampering after delivery.
- Legal admissibility requirements specific to your jurisdiction.

## Next safe steps

- Use `/scrub` and keep hash records from the scrub report.
- Read `/security/non-technical/journalist-submission-hygiene`.
