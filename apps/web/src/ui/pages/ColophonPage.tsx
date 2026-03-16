import React from "react";
import { Link } from "react-router-dom";

/* ── Data ─────────────────────────────────────────────────────────────── */

const STATS = [
  { value: "22,378", label: "lines of TypeScript" },
  { value: "283", label: "automated tests" },
  { value: "21", label: "PDF tools" },
  { value: "0", label: "server-side PDF processing" },
  { value: "500+", label: "pre-rendered pages" },
  { value: "14", label: "bundle budgets enforced" },
];

const CRYPTO = [
  {
    name: "Shamir's Secret Sharing",
    desc: "3-of-10 threshold recovery codes over GF(2⁸). Shift-and-reduce arithmetic (no lookup tables — cf. CVE-2023-25000). CRC-8 integrity per share.",
    file: "apps/api/src/shamir.ts",
  },
  {
    name: "RFC 6962 Merkle Tree",
    desc: "Domain-separated hashing (0x00 leaf / 0x01 node). Largest-power-of-2 split for odd counts. O(log n) inclusion proofs. ECDSA P-256 signed tree heads.",
    file: "apps/web/src/utils/vpe/merkleTree.ts",
  },
  {
    name: "Schwartz-Zippel Shuffle Proof",
    desc: "Verifiable permutation via product check over secp256k1 prime field. Fiat-Shamir challenge bound to seed commitment + length prefix. Soundness error ≈ 2⁻²⁴⁸.",
    file: "apps/web/src/utils/pdf/shuffleProof.ts",
  },
  {
    name: "Pedersen Commitments",
    desc: "ristretto255 (RFC 9496) — eliminates Curve25519 cofactor-8 torsion. Nothing-up-my-sleeve H generator via hash-to-curve. Information-theoretic hiding, selective disclosure.",
    file: "apps/web/src/utils/crypto/pedersen.ts",
  },
  {
    name: "ECDSA P-256 Entitlements",
    desc: "Signed offline tokens. Browser verifies with pinned public key — no API roundtrip for paid features. Works offline.",
    file: "apps/api/src/entitlement.ts",
  },
  {
    name: "WebAuthn / Passkeys",
    desc: "No passwords stored. Recovery via Shamir threshold scheme. Nothing to leak if the database is compromised.",
    file: "apps/api/src/webauthn.ts",
  },
];

const DEPS = [
  { name: "pdf-lib", version: "1.17.1", purpose: "PDF creation, modification, merge, split", audited: "widely used, not audited" },
  { name: "pdfjs-dist", version: "4.10.38", purpose: "PDF rendering (redact, flatten, export)", audited: "Mozilla project" },
  { name: "tesseract.js", version: "5.1.1", purpose: "OCR text extraction (WASM)", audited: "widely used" },
  { name: "@noble/curves", version: "2.0.1", purpose: "ristretto255 for Pedersen commitments", audited: "6 independent audits" },
  { name: "@noble/hashes", version: "2.0.1", purpose: "SHA-512, utils for noble-curves", audited: "6 independent audits" },
  { name: "@simplewebauthn/browser", version: "10.x", purpose: "WebAuthn client-side", audited: "widely used" },
  { name: "hono", version: "4.5.8", purpose: "API framework (Cloudflare Workers)", audited: "widely used" },
  { name: "stripe", version: "16.x", purpose: "Payment processing only", audited: "Stripe official SDK" },
  { name: "zod", version: "3.x", purpose: "Input validation", audited: "widely used" },
];

const TEST_BREAKDOWN = [
  { area: "GF(256) arithmetic", count: 9, note: "Exhaustive inverse check (all 255 elements), AES test vectors" },
  { area: "Shamir split/reconstruct", count: 14, note: "All C(5,3) subsets, k-1 security, encoding round-trip" },
  { area: "Merkle tree", count: 32, note: "Domain separation attack, odd leaf counts 1-32, inclusion proof verification" },
  { area: "Shuffle proof", count: 16, note: "Non-permutation rejection, Fiat-Shamir determinism, Math.random not called" },
  { area: "Pedersen commitments", count: 18, note: "Homomorphic property, nonce reuse detection, generator validation" },
  { area: "HMAC / SHA-256 / AES-GCM", count: 17, note: "Round-trip, determinism, timing-safe comparison" },
  { area: "Session / cookies", count: 4, note: "Signing, verification, expiry" },
  { area: "Entitlement tokens", count: 4, note: "ECDSA P-256 sign/verify" },
  { area: "PDF operations", count: 134, note: "Scrub, flatten, EXIF strip, font detect, redact, sign, crop, etc." },
  { area: "VPE monitors", count: 6, note: "CSP listener, DOM mutation, WebRTC patch" },
  { area: "UI components", count: 5, note: "Term tooltips" },
];

const KNOWN_GAPS = [
  "No E2E browser tests. Unit and integration only. Tool UIs are untested.",
  "No production monitoring or error alerting.",
  "MIC decoder only covers Xerox DocuColor. HP, Canon, Brother not implemented.",
  "Large PDFs (100+ pages) hit browser memory limits. Flatten/redact cap at 200.",
  "Signed tree heads are self-attested (ephemeral key). Not third-party verifiable.",
  "JSON-LD structured data not validated against Google's rich results test.",
];

/* ── Page ─────────────────────────────────────────────────────────────── */

export function ColophonPage() {
  React.useEffect(() => {
    document.title = "How it's built · PDF Changer";
  }, []);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <div>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-accent)] mb-3">
          Engineering
        </div>
        <h1 className="text-3xl font-bold tracking-tight">How it&apos;s built</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ui-text-secondary)] leading-relaxed">
          Solo project. MIT licensed. This page is the honest technical breakdown — what works,
          what doesn&apos;t, what&apos;s tested, and what isn&apos;t.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://github.com/Giuseppe552/pdf-changer"
            target="_blank"
            rel="noreferrer"
            className="mono text-xs text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] transition-colors"
          >
            source on github &rarr;
          </a>
          <Link to="/security" className="mono text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] transition-colors">
            security model &rarr;
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-border)] sm:grid-cols-3 md:grid-cols-6">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[var(--ui-bg-raised)] px-4 py-4">
            <div className="mono text-xl font-bold tabular-nums text-[var(--ui-text)]">{s.value}</div>
            <div className="mt-0.5 mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cryptography */}
      <Sec label="Cryptography" title="What's under the hood">
        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--ui-border)]">
          {CRYPTO.map((c) => (
            <div key={c.name} className="bg-[var(--ui-bg-raised)] px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--ui-text)]">{c.name}</div>
                  <div className="mt-1 text-xs text-[var(--ui-text-secondary)] leading-relaxed">{c.desc}</div>
                </div>
                <div className="mono text-[10px] text-[var(--ui-text-muted)] shrink-0 whitespace-nowrap">{c.file}</div>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      {/* Dependencies */}
      <Sec label="Dependencies" title="What this project imports">
        <div className="overflow-x-auto rounded-lg border border-[var(--ui-border)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--ui-border)] bg-[var(--ui-bg-overlay)]">
                <th className="px-4 py-2.5 text-left mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)] font-medium">Package</th>
                <th className="px-4 py-2.5 text-left mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)] font-medium">Version</th>
                <th className="px-4 py-2.5 text-left mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)] font-medium">Purpose</th>
                <th className="px-4 py-2.5 text-left mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)] font-medium">Audit status</th>
              </tr>
            </thead>
            <tbody>
              {DEPS.map((d) => (
                <tr key={d.name} className="border-b border-[var(--ui-border)] bg-[var(--ui-bg-raised)]">
                  <td className="px-4 py-2.5 mono text-[var(--ui-text)]">{d.name}</td>
                  <td className="px-4 py-2.5 mono text-[var(--ui-text-muted)]">{d.version}</td>
                  <td className="px-4 py-2.5 text-[var(--ui-text-secondary)]">{d.purpose}</td>
                  <td className="px-4 py-2.5 text-[var(--ui-text-muted)]">{d.audited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 mono text-[10px] text-[var(--ui-text-muted)]">
          All crypto primitives use Web Crypto API (browser-native) except ristretto255 which uses @noble/curves (6 independent audits).
        </p>
      </Sec>

      {/* Test coverage */}
      <Sec label="Test Coverage" title="283 tests — here's what they cover">
        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--ui-border)]">
          {TEST_BREAKDOWN.map((t) => (
            <div key={t.area} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 bg-[var(--ui-bg-raised)] px-5 py-3">
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <span className="mono text-xs tabular-nums text-[var(--ui-accent)] w-6 text-right">{t.count}</span>
                <span className="text-xs font-medium text-[var(--ui-text)]">{t.area}</span>
              </div>
              <span className="text-xs text-[var(--ui-text-muted)]">{t.note}</span>
            </div>
          ))}
        </div>
      </Sec>

      {/* Known gaps */}
      <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 px-5 py-5">
        <div className="mono text-xs font-medium text-[var(--ui-warn)] mb-3 tracking-wider uppercase">
          Known gaps
        </div>
        <ul className="space-y-2">
          {KNOWN_GAPS.map((g) => (
            <li key={g} className="flex items-start gap-3 text-xs text-amber-200/70">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-warn)]/50 shrink-0" />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* Architecture */}
      <Sec label="Architecture" title="How the pieces fit together">
        <div className="space-y-2">
          <Layer color="var(--ui-accent)" label="Browser" desc="React SPA · pdf-lib · PDF.js · Tesseract.js · Web Crypto · 20.8k lines" />
          <Layer color="#a78bfa" label="VPE Sandbox" desc="iframe · connect-src 'none' · PerformanceObserver · CSP listener · MutationObserver · WebRTC patch" />
          <Layer color="var(--ui-accent)" label="Service Worker" desc="Workbox · offline cache · entitlement verification · PWA" />
          <Layer color="#f59e0b" label="Edge API" desc="Hono · Cloudflare Workers · D1 (SQLite) · WebAuthn · Stripe · ECDSA tokens · 1.6k lines" />
        </div>
        <div className="mt-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-4">
          <div className="mono text-[10px] tracking-wider uppercase text-[var(--ui-text-muted)] mb-2">Repo layout</div>
          <pre className="text-xs text-[var(--ui-text-secondary)] mono leading-relaxed whitespace-pre">{`apps/
  web/     ~20.8k lines  all PDF processing, VPE, SSG, content
  api/     ~1.6k lines   auth, billing, entitlements (no PDF bytes)
packages/
  shared/  types shared between apps`}</pre>
        </div>
      </Sec>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-4">
        <div>
          <div className="text-sm text-[var(--ui-text)]">Built by Giuseppe Giona</div>
          <div className="mono text-[10px] text-[var(--ui-text-muted)]">MIT licensed · open source · solo project</div>
        </div>
        <a
          href="https://github.com/Giuseppe552/pdf-changer"
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] transition-colors"
        >
          github.com/Giuseppe552/pdf-changer &rarr;
        </a>
      </div>
    </div>
  );
}

/* ── Shared components ────────────────────────────────────────────────── */

function Sec({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-1">{label}</div>
      <h2 className="text-xl font-semibold tracking-tight text-[var(--ui-text)] mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Layer({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="relative rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 py-3 pl-6">
        <span className="text-sm font-medium sm:w-36 shrink-0" style={{ color }}>{label}</span>
        <span className="text-xs text-[var(--ui-text-muted)] mono">{desc}</span>
      </div>
    </div>
  );
}
