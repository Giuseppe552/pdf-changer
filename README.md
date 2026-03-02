# pdf changer

Browser-based PDF toolkit. All processing runs client-side — your files never leave the device.

## why

Every online PDF tool uploads your files to someone else's server. That's fine for a homework assignment, not for tax returns, contracts, or medical records. pdf changer runs everything in-browser using pdf-lib, pdfjs-dist, and tesseract.js. The backend only handles auth and billing — it never sees a PDF byte.

## what it does

**metadata scrubber** — strips EXIF, IPTC, ICC profiles, embedded JavaScript, font subset fingerprints, and printer tracking dots (steganography). paranoid mode also randomizes document structure so the tool itself can't be fingerprinted from its output.

**15 PDF tools** — merge, split, compress, rotate, crop, flatten, redact, OCR, watermark, sign, fill forms, image conversion, page numbers, encrypt, unlock. all local, all offline-capable.

**pipeline** — chain operations together. scrub → flatten → compress in one pass.

## stack

| layer | tech |
|-------|------|
| frontend | react 18, vite, tailwind, PWA |
| pdf processing | pdf-lib, pdfjs-dist, tesseract.js (WASM) |
| backend | hono on cloudflare workers |
| database | cloudflare D1 (sqlite at the edge) |
| auth | passkeys via WebAuthn, recovery codes |
| billing | stripe subscriptions |
| deploy | cloudflare pages + workers |

## architecture

```
apps/
  web/     — PWA. all PDF processing happens here. ~16k lines TS.
  api/     — auth + billing only. no file handling. ~1.2k lines TS.
packages/
  shared/  — TypeScript types shared between apps
```

The web app is a PWA — once loaded, it works offline. Usage quotas are tracked client-side for guest/free tiers. Paid users get an ECDSA-signed entitlement token that's verified in the browser with no network roundtrip.

The API is stateless. Sessions are HMAC-SHA256 signed cookies (no session store needed). Rate limiting uses the Cloudflare Cache API as a counter.

## interesting bits

**byte-level metadata stripping** — pdf-lib doesn't expose raw embedded streams, so `exifStrip.ts` scans for JPEG SOI markers and PNG magic bytes in the raw PDF buffer, then excises APP segments and metadata chunks at the byte level.

**steganography detection** — scans rendered pages for Machine Identification Code (yellow dot) patterns that printers embed to fingerprint printed documents.

**font fingerprint detection** — PDF viewers embed font subsets with prefixes like `ABCDEF+TimesNewRoman`. These prefixes are unique per document and can be used to trace a PDF back to its source. The scrubber catches and reports them.

**structure randomization** — after flattening, page object IDs and ordering are shuffled so two identical inputs produce structurally different (but visually identical) outputs. Prevents fingerprinting by output structure.

**offline entitlements** — paid status is represented as an ECDSA P-256 signed token. The browser verifies it locally against a public key — no API call needed after initial login.

**passkey auth** — no passwords. WebAuthn registration with 10 one-time recovery codes (SHA-256 hashed with pepper, consumed on use).

## local dev

```sh
npm install

# api
cp apps/api/.dev.vars.example apps/api/.dev.vars
npx wrangler d1 create pdf-changer
npx wrangler d1 migrations apply pdf-changer --local --cwd apps/api
npm run dev:api

# web
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

Optional: generate entitlement signing keys for offline paid gating:

```sh
node scripts/gen-entitlement-keys.mjs
# add ENTITLEMENT_PRIVATE_JWK to apps/api/.dev.vars
# add VITE_ENTITLEMENT_PUBLIC_JWK to apps/web/.env
```

## deploy

- **web**: Cloudflare Pages (`npm run build:web`)
- **api**: Cloudflare Workers (`wrangler deploy` from `apps/api`)
- **CSP**: `apps/web/public/_headers` — add your API domain to `connect-src` if using a custom domain

## tests

```sh
npm test              # everything
cd apps/api && npm test   # api
cd apps/web && npm test   # web
```

## privacy

- No analytics, no trackers
- No third-party CDNs
- No PDF uploads — bytes stay on-device
- Backend is auth and billing only
