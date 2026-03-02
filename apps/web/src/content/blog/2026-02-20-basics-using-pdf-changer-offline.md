# Using PDF Changer offline (high‑risk mode)

If you’re handling a sensitive PDF, working offline can reduce the number of network events while you scrub it. PDF Changer is designed so processing happens locally, and the scrubber can work offline after the first load.

After you’ve loaded the site once, your browser can cache the app so the scrubber keeps working offline (within local usage caps).

Offline isn’t magic. It just reduces the number of network events while you’re handling sensitive files.

## Step‑by‑step

1) Visit the site once while online (so your browser can cache the app).
2) Turn off Wi‑Fi / enable airplane mode.
3) Go to [the scrubber](/scrub).
4) Drag & drop your PDF (or click browse).
5) Scrub, review the report, download the output.

## Why this helps

Processing offline can reduce:

- accidental background requests while you work,
- exposure of “I was editing a sensitive file at this time” to network observers.

## What offline mode does not protect you from

- A compromised device (malware can still read files on your computer).
- Visible identifiers in the PDF content (names, logos, signatures).

Offline mode is one safety layer, not a guarantee.

If you haven’t yet: [device and network basics](/blog/opsec/device-and-network-basics).
