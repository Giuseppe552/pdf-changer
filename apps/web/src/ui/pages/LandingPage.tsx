import React from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../components/Button";
import {
  homeHeroTitle,
  homeHeroSummary,
  homeAudience,
  homeProofMetrics,
  homeLimits,
} from "../../content/landing/homeContent";

/* ── Inline data ──────────────────────────────────────────────────────── */

const TOOLS = [
  { name: "Scrub", desc: "Strip metadata, EXIF, hidden data", to: "/scrub", hot: true },
  { name: "Merge", desc: "Combine PDFs into one", to: "/tools/merge" },
  { name: "Split", desc: "Extract page ranges", to: "/tools/split" },
  { name: "Compress", desc: "Reduce file size", to: "/tools/compress" },
  { name: "Redact", desc: "Permanently remove content", to: "/tools/redact" },
  { name: "Flatten", desc: "Convert to images, kill structure", to: "/tools/flatten" },
  { name: "Rotate", desc: "Fix page orientation", to: "/tools/rotate" },
  { name: "OCR", desc: "Extract text from scans", to: "/tools/ocr" },
  { name: "Sign", desc: "Visual signature overlay", to: "/tools/sign" },
  { name: "Watermark", desc: "Brand pages with text overlay", to: "/tools/watermark" },
];

const VPE_STEPS = [
  { label: "Sandboxed iframe", detail: "connect-src 'none' — physically cannot make outbound connections" },
  { label: "3 concurrent monitors", detail: "PerformanceObserver · CSP listener · MutationObserver" },
  { label: "WebRTC patched", detail: "ICE candidates blocked to prevent IP leaks" },
  { label: "HMAC chain", detail: "Tamper-evident log — alter one event, every subsequent hash breaks" },
  { label: "SHA-256 hashes", detail: "Input and output fingerprinted for audit trail" },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="space-y-16">
      <Hero />
      <Metrics />
      <ToolGrid />
      <VpeExplainer />
      <Audience />
      <Limitations />
      <BottomCta />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="space-y-6">
      {/* Tag line */}
      <div className="mono text-xs tracking-wider uppercase text-[var(--ui-accent)]">
        Open source &middot; Browser-only &middot; Cryptographically verified
      </div>

      <h1 className="max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight text-[var(--ui-text)] md:text-5xl">
        {homeHeroTitle}
      </h1>

      <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--ui-text-secondary)]">
        {homeHeroSummary}
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <NavLink to="/scrub">
          <Button>Open scrubber</Button>
        </NavLink>
        <NavLink to="/tools">
          <Button variant="secondary">All 21 tools</Button>
        </NavLink>
        <a
          href="https://github.com/Giuseppe552/pdf-changer"
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] transition-colors"
        >
          view source &rarr;
        </a>
      </div>
    </section>
  );
}

/* ── Metrics strip ────────────────────────────────────────────────────── */

function Metrics() {
  return (
    <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-border)] md:grid-cols-4">
      {homeProofMetrics.map((m) => (
        <div key={m.label} className="bg-[var(--ui-bg-raised)] px-5 py-5">
          <div className="mono text-2xl font-bold tabular-nums text-[var(--ui-text)]">{m.value}</div>
          <div className="mt-1 mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)]">{m.label}</div>
          <div className="mt-1 text-xs text-[var(--ui-text-muted)]">{m.note}</div>
        </div>
      ))}
    </section>
  );
}

/* ── Tool grid ────────────────────────────────────────────────────────── */

function ToolGrid() {
  return (
    <section>
      <SectionHead label="Tools" title="Pick a tool, drop a PDF." />
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <NavLink
            key={t.name}
            to={t.to}
            className="group flex items-start gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-4 py-3.5 transition-colors hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-bg-overlay)]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--ui-text)] group-hover:text-[var(--ui-accent)] transition-colors">
                  {t.name}
                </span>
                {t.hot && (
                  <span className="mono rounded bg-[var(--ui-accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--ui-accent)]">
                    popular
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-[var(--ui-text-muted)]">{t.desc}</div>
            </div>
            <span className="mt-0.5 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)] transition-colors">&rarr;</span>
          </NavLink>
        ))}
      </div>
      <NavLink
        to="/tools"
        className="mt-3 inline-block mono text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors"
      >
        See all 21 tools &rarr;
      </NavLink>
    </section>
  );
}

/* ── VPE explainer ────────────────────────────────────────────────────── */

function VpeExplainer() {
  return (
    <section>
      <SectionHead
        label="Verified Processing"
        title="Cryptographic proof, not a pinky promise."
      />
      <p className="mt-2 max-w-2xl text-sm text-[var(--ui-text-secondary)]">
        Every operation runs inside a sandboxed environment with network access disabled at the browser level.
        Three monitors watch for exfiltration attempts. The result is a tamper-evident audit log you can verify independently.
      </p>

      <div className="mt-6 space-y-px overflow-hidden rounded-lg border border-[var(--ui-border)]">
        {VPE_STEPS.map((step, i) => (
          <div key={step.label} className="flex gap-4 bg-[var(--ui-bg-raised)] px-5 py-3.5">
            <span className="mono text-xs text-[var(--ui-text-muted)] tabular-nums w-5 shrink-0 text-right pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="text-sm font-medium text-[var(--ui-text)]">{step.label}</span>
              <span className="ml-2 text-xs text-[var(--ui-text-muted)]">{step.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <NavLink
        to="/security"
        className="mt-3 inline-block mono text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors"
      >
        Full security model &rarr;
      </NavLink>
    </section>
  );
}

/* ── Audience ─────────────────────────────────────────────────────────── */

function Audience() {
  return (
    <section>
      <SectionHead label="Who this is for" />
      <ul className="mt-4 space-y-2">
        {homeAudience.map((a) => (
          <li key={a} className="flex items-start gap-3 text-sm text-[var(--ui-text-secondary)]">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)] shrink-0" />
            {a}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Limitations ──────────────────────────────────────────────────────── */

function Limitations() {
  return (
    <section className="rounded-lg border border-amber-700/30 bg-amber-950/20 px-5 py-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="mono text-xs font-medium text-[var(--ui-warn)]">HONEST LIMITATIONS</span>
      </div>
      <ul className="space-y-2">
        {homeLimits.map((l) => (
          <li key={l} className="flex items-start gap-3 text-sm text-amber-200/70">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-warn)]/50 shrink-0" />
            {l}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Bottom CTA ───────────────────────────────────────────────────────── */

function BottomCta() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-5 py-5">
      <div>
        <div className="text-sm font-medium text-[var(--ui-text)]">Start with one PDF.</div>
        <div className="mt-0.5 text-xs text-[var(--ui-text-muted)]">
          No account needed. No files uploaded. Ever.
        </div>
      </div>
      <NavLink to="/scrub">
        <Button>Open scrubber</Button>
      </NavLink>
    </section>
  );
}

/* ── Shared ────────────────────────────────────────────────────────────── */

function SectionHead({ label, title }: { label: string; title?: string }) {
  return (
    <div>
      <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)]">{label}</div>
      {title && (
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-text)]">{title}</h2>
      )}
    </div>
  );
}
