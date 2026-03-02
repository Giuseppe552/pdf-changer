# Donate Proof Publishing Runbook

This runbook updates the donation proof bundle used by `/donate/proof`.

## Scope
- Current proof bundle: `apps/web/public/donate-proof/v1/`
- Archive index: `apps/web/public/donate-proof/archive/index.json`
- Archive snapshots: `apps/web/public/donate-proof/archive/<proof-id>/`

## 1) Prepare canonical statement
1. Update `addresses.txt` in `apps/web/public/donate-proof/v1/`.
2. Keep fields deterministic and ordered:
   - `Proof-ID`
   - `Published-At`
   - `Valid-From`
   - `Supersedes`
   - `Revoked`
   - key block
   - addresses block (stable order)
   - verification policy/support block

## 2) Sign detached signature
Generate detached OpenPGP signature for the statement:

```bash
cd apps/web/public/donate-proof/v1
gpg --armor --detach-sign --output addresses.txt.asc addresses.txt
```

## 3) Update signing key artifact
Export the public signing key to:

```bash
cd apps/web/public/donate-proof/v1
gpg --armor --export <KEY_ID_OR_FINGERPRINT> > signing-key.asc
```

## 4) Regenerate manifest hashes
Update `manifest.v1.json` with:
- new `proofId`, `publishedAt`, `validFrom`
- key metadata (`fingerprint`, `keyId`, `algorithm`, `firstSeenAt`)
- exact `sha256` + `sizeBytes` for all listed files
- `supersedesProofId` when replacing a prior proof

## 5) Archive previous proof
1. Copy prior proof artifacts into `apps/web/public/donate-proof/archive/<old-proof-id>/`.
2. Ensure that archived folder contains:
   - `addresses.txt`
   - `addresses.txt.asc`
   - `signing-key.asc`
   - `README.txt`
   - `manifest.v1.json`
3. Update `apps/web/public/donate-proof/archive/index.json`:
   - add current proof entry first
   - keep old entries
   - keep one active key and historical key status entries
   - ensure revocations include `revocationReason`

## 6) Validate artifacts (required)
Run:

```bash
npm run validate:donate-proof -w @pdf-changer/web
```

The check must pass before merge/deploy.

## 7) Build + verify pages
Run:

```bash
npm run build:web
```

Then confirm:
- `/donate/proof` renders current proof metadata and files.
- `/donate/proof/archive` lists historical manifests and keys.
- links download the expected artifacts.

## 8) Incident / revocation handling
If a key or proof is compromised:
1. Mark affected proof `revoked: true` and set `revocationReason`.
2. Publish new proof with new key or corrected artifacts.
3. Update archive index and key status (`revoked`/`retired`).
4. Re-run validation and publish.
