# Using PDF Changer on Tor or Tails

This guide covers how to use PDF Changer's local tools under Tor Browser or Tails OS for maximum operational security.

## What works on Tor

All local processing tools work fully on Tor since they run entirely in your browser:

- Deep Metadata Scrubber (including Paranoid Mode)
- Flatten to Image PDF
- Visual Redaction
- EXIF Stripping
- Compress, Merge, Split, and all other local tools
- Privacy Pipeline (all local steps)

No PDF bytes are uploaded or transmitted. Processing happens in JavaScript within your browser tab.

## What does not work on Tor

- **Stripe payments**: Payment processing requires Stripe, which blocks Tor exit nodes.
- **Passkey authentication**: WebAuthn passkeys require a stable origin and may not persist across Tor sessions.
- **Cached entitlements**: Auth state uses localStorage, which Tor Browser clears on close.

**Workaround**: Use guest mode (no account required) or enable **No Trace Mode** to bypass quota tracking entirely.

## Recommended Tails workflow

1. Boot Tails and open Tor Browser.
2. Navigate to PDF Changer.
3. Enable **No Trace Mode** immediately (toggle in the header).
4. Process your documents using local tools.
5. Save output files to an encrypted persistent volume or external media.
6. Close Tails when finished. All browser state is destroyed automatically.

## No Trace Mode

No Trace Mode is designed specifically for this workflow:

- **Session-only**: The flag exists only in memory and is lost on page close.
- **Zero storage**: All `pdfchanger.*` localStorage keys are purged on enable.
- **No quotas**: Usage counters are not written or read.
- **No auth caching**: Entitlement state is not persisted.

Enable it before processing any documents. There is no recovery if you forget.

## Canvas fingerprinting

PDF Changer uses HTML5 Canvas for page rendering (PDF-to-image, flatten, redact). Canvas rendering can theoretically produce browser-fingerprint-unique output. However:

- **No network requests occur during processing.** Canvas output stays local.
- **Tor Browser includes canvas fingerprinting protection** that prompts before exposing canvas data to websites. PDF Changer processes canvas data locally and never transmits it.
- If you are concerned, Tails' Tor Browser further restricts canvas access by default.

Canvas fingerprinting is a non-concern for local-only processing.

## localStorage risks

On standard browsers, PDF Changer stores:

- Usage counters (`pdfchanger.usage.v2.*`)
- Entitlement cache (`pdfchanger.entitlement.v1`)

These leave forensic traces on the device. Mitigations:

- **Tor Browser**: Clears all site data on close (default).
- **Tails**: Destroys all non-persistent storage on shutdown.
- **No Trace Mode**: Prevents all writes and purges existing keys immediately.
- **Standard browser**: Manually clear site data or use incognito/private mode.

## Recommended tool chain for high-risk documents

For maximum protection, use the Privacy Pipeline with the "Maximum Privacy" preset:

1. Paranoid Scrub (removes metadata, JavaScript, embedded files, ICC profiles, document ID)
2. Flatten to Image at 150 DPI PNG (destroys all hidden structure, fonts, layers)

Or manually chain:

1. Enable No Trace Mode
2. Run Paranoid Scrub
3. Run Flatten to Image
4. Verify output visually
5. Save to encrypted storage
6. Close browser / shut down Tails
