---
title: Threat Modeling Workflow
summary: A practical model for deciding which controls matter for your document-sharing risk.
audience: [whistleblowers, journalists, teams]
riskLevel: high
difficulty: advanced
lastReviewed: 2026-02-20
tags: [threat-model, opsec, workflow, risk]
estimatedMinutes: 10
---

# Threat Modeling Workflow

Threat modeling is about prioritization. You are choosing which failures would hurt most and reducing those first.

## Workflow

1. Define adversaries and realistic capabilities.
2. Map assets: source docs, communications, accounts, devices.
3. Map exposure points: network, endpoints, recipients, archives.
4. Choose controls with highest risk-reduction per effort.

## Control selection principle

Pick controls that are:

- repeatable under stress,
- easy to verify after execution,
- hard to accidentally bypass.

## What this does not protect

- Unknown unknowns or zero-day compromise.
- Physical coercion or insider compromise.
- Legal compulsion risks.

## Next safe steps

- Read `/security/technical/endpoint-and-browser-leakage-model`.
- Read `/security/policy`.
