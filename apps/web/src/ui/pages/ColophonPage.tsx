import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Surface } from "../components/Surface";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-sm border border-neutral-200 bg-white p-4">
      <div className="text-2xl font-semibold text-neutral-900">{value}</div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

export function ColophonPage() {
  React.useEffect(() => {
    document.title = "How it's built · PDF Changer";
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          How it's built
        </h1>
        <p className="text-lg text-neutral-700 max-w-3xl">
          PDF Changer is a solo project. I built it to learn, to solve my own
          problem, and to see how far I could push browser-based document
          processing. This page is the honest breakdown of what's under the hood.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat value="~19k" label="lines of TypeScript" />
        <Stat value="125" label="automated tests" />
        <Stat value="500+" label="pre-rendered pages" />
        <Stat value="14" label="bundle size budgets" />
      </div>

      <Section title="The stack">
        <Card>
          <div className="grid gap-4 md:grid-cols-2 text-[15px] text-neutral-700">
            <div className="space-y-2">
              <div className="font-semibold text-neutral-900">Frontend</div>
              <ul className="list-inside list-disc space-y-1">
                <li>React 19 + React Router (SPA)</li>
                <li>Tailwind CSS (utility-first, no component library)</li>
                <li>Vite (build tooling + dev server)</li>
                <li>Workbox (service worker for offline use)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-neutral-900">PDF processing</div>
              <ul className="list-inside list-disc space-y-1">
                <li>pdf-lib (create, modify, merge, split)</li>
                <li>PDF.js (rendering for redact, flatten, export)</li>
                <li>Tesseract.js (OCR text extraction)</li>
                <li>Web Crypto API (SHA-256, HMAC, ECDSA)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-neutral-900">Infrastructure</div>
              <ul className="list-inside list-disc space-y-1">
                <li>Cloudflare Pages (hosting, headers, CDN)</li>
                <li>Stripe (payments, no custom billing)</li>
                <li>WebAuthn passkeys (no passwords stored)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-neutral-900">Quality</div>
              <ul className="list-inside list-disc space-y-1">
                <li>Vitest (125 tests across 31 files)</li>
                <li>TypeScript strict mode throughout</li>
                <li>Bundle budget enforcement (14 limits)</li>
                <li>Content validation pipeline (5 scripts)</li>
              </ul>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="The interesting problems">
        <div className="space-y-4">
          <Card title="Verified Processing Environment">
            <div className="space-y-3 text-[15px] text-neutral-700">
              <p>
                "We don't upload your files" is easy to say. Proving it is harder.
                I built a system that wraps every PDF operation in three concurrent
                monitors: a PerformanceObserver watching all network requests, a CSP
                violation listener catching blocked exfiltration attempts, and a
                MutationObserver detecting injected scripts or tracking pixels.
              </p>
              <p>
                WebRTC is monkey-patched during processing to prevent IP leaks via
                ICE candidates. The sandbox iframe runs with an opaque origin and a
                CSP that blocks all outbound connections. After processing, the system
                produces a tamper-evident audit report with HMAC-chained entries and
                SHA-256 hashes of input and output.
              </p>
              <p>
                The green shield badge on every tool result is the summary. Click
                "Details" for the full report, or export it as JSON for programmatic
                verification.
              </p>
              <p className="text-sm text-neutral-500">
                Threat model based on analysis of 45+ browser exfiltration vectors.{" "}
                <Link to="/security/technical/verified-processing-environment" className="underline">
                  Full architecture doc
                </Link>{" · "}
                <Link to="/security/technical/csp-exfiltration-analysis" className="underline">
                  Vector analysis
                </Link>
              </p>
            </div>
          </Card>

          <Card title="Steganography detection">
            <div className="space-y-3 text-[15px] text-neutral-700">
              <p>
                Most printers embed invisible yellow tracking dots (Machine
                Identification Code) that encode the printer serial number, date,
                and time. If you scan a printed document back to PDF, those dots
                survive. The scrubber includes a heuristic detector that renders
                pages at high resolution and scans margin areas for yellow pixel
                patterns matching known MIC grids.
              </p>
              <p>
                It's not perfect — it's a heuristic, not a decoder. But it warns
                you when the pattern confidence is medium or high, so you can
                flatten the document to destroy the dots entirely.
              </p>
            </div>
          </Card>

          <Card title="Structure randomization">
            <div className="space-y-3 text-[15px] text-neutral-700">
              <p>
                PDFs have internal object ordering. If every output from this tool
                had identical structure, that structure itself becomes a fingerprint
                — "this document was processed by PDF Changer." To prevent this,
                the paranoid scrub mode shuffles the internal object insertion order
                using Fisher-Yates. Two identical inputs produce visually identical
                but structurally different outputs.
              </p>
            </div>
          </Card>

          <Card title="2,900-line build plugin">
            <div className="space-y-3 text-[15px] text-neutral-700">
              <p>
                The static site generation isn't a framework — it's a custom Vite
                plugin that pre-renders 500+ pages at build time. It parses markdown,
                generates JSON-LD structured data (Article, FAQPage, BreadcrumbList,
                WebApplication), builds the sitemap, generates RSS, creates the
                sandboxed processing iframe, and enforces CSP headers. Blog posts,
                FAQ entries, security articles, tool documentation, and guide pages
                all go through this pipeline.
              </p>
              <p>
                The build also runs five content validation scripts: security content
                (checks for prohibited phrases like "how to commit fraud"), tool
                registry validation, copy quality analysis, tool documentation
                completeness, and donation proof cryptographic verification.
              </p>
            </div>
          </Card>

          <Card title="Font fingerprinting">
            <div className="space-y-3 text-[15px] text-neutral-700">
              <p>
                When you create a PDF with a custom font, the authoring tool embeds
                a font subset — only the characters you used. These subsets get
                randomly generated prefixes (like <code className="text-sm bg-neutral-100 px-1 rounded">ABCDEF+Helvetica</code>).
                The prefix is unique to that specific export from that specific
                machine. The scrubber detects these subsets and warns you, with a
                link to the flatten tool which destroys all font data by converting
                pages to images.
              </p>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="How competitors do it">
        <Card>
          <div className="space-y-3 text-[15px] text-neutral-700">
            <p>
              Every major free PDF tool — iLovePDF, Smallpdf, PDF24, Adobe Acrobat
              Online — uploads your document to their servers for processing. Some
              claim to delete files after an hour; some don't say. Either way, your
              document leaves your device, crosses the network, and sits on someone
              else's infrastructure.
            </p>
            <p>
              PDF Changer processes everything in a sandboxed iframe inside your
              browser tab. The iframe's Content Security Policy blocks all outbound
              connections. Three monitors verify that nothing leaked. The difference
              isn't just a privacy policy — it's a fundamentally different
              architecture.
            </p>
          </div>
        </Card>
      </Section>

      <Section title="Try it">
        <div className="grid gap-3 md:grid-cols-3">
          <Card compact>
            <Link to="/verify" className="underline text-[15px] font-semibold text-neutral-900">
              Run the live audit
            </Link>
            <p className="mt-1 text-sm text-neutral-600">
              Process a sample PDF and watch three monitors prove zero data left
              your browser.
            </p>
          </Card>
          <Card compact>
            <Link to="/scrub" className="underline text-[15px] font-semibold text-neutral-900">
              Scrub a real file
            </Link>
            <p className="mt-1 text-sm text-neutral-600">
              Drop in a PDF and see the full report — metadata stripped, hashes
              computed, audit badge attached.
            </p>
          </Card>
          <Card compact>
            <Link to="/security" className="underline text-[15px] font-semibold text-neutral-900">
              Read the security docs
            </Link>
            <p className="mt-1 text-sm text-neutral-600">
              Threat models, exfiltration analysis, and residual risk disclosures.
            </p>
          </Card>
        </div>
      </Section>

      <div className="rounded-sm border border-neutral-200 bg-white p-5">
        <div className="space-y-1">
          <div className="text-sm text-neutral-500">
            Built by{" "}
            <span className="font-semibold text-neutral-900">Giuseppe Giona</span>
          </div>
          <div className="text-sm text-neutral-500">
            Source available on request for technical review.
          </div>
        </div>
      </div>
    </div>
  );
}
