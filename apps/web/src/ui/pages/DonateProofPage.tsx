import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Surface } from "../components/Surface";
import type { DonateProofManifestV1 } from "../../content/donate/proofManifest";
import {
  loadDonateProofManifest,
  outcomeFromFileChecks,
  verifyManifestFiles,
  type ProofFileVerification,
  type VerificationOutcome,
} from "../../content/donate/proofLoader";
import { AdvancedCommandsTabs } from "./donate/components/AdvancedCommandsTabs";
import { FailureActionsBox } from "./donate/components/FailureActionsBox";
import { KeyIdentityCard } from "./donate/components/KeyIdentityCard";
import { ProofFileTable } from "./donate/components/ProofFileTable";
import { VerifyChecklist } from "./donate/components/VerifyChecklist";

const LEGACY_FINGERPRINT = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
  .VITE_DONATE_PGP_FINGERPRINT;

function formatDate(value: string): string {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  const date = new Date(ts);
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function DonateProofPage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing" | "invalid">(
    "loading",
  );
  const [manifest, setManifest] = React.useState<DonateProofManifestV1 | null>(null);
  const [failureReason, setFailureReason] = React.useState<string | null>(null);
  const [checks, setChecks] = React.useState<ProofFileVerification[]>([]);
  const [checking, setChecking] = React.useState(false);
  const [lastBundleCheckAt, setLastBundleCheckAt] = React.useState<string | null>(null);
  const [manualFingerprintConfirmed, setManualFingerprintConfirmed] = React.useState(false);

  React.useEffect(() => {
    document.title = "Donate Address Proof · PDF Changer";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadDonateProofManifest();
      if (cancelled) return;
      if (next.status === "ok") {
        setManifest(next.manifest);
        setFailureReason(null);
        setStatus("ok");
        return;
      }
      setManifest(null);
      setFailureReason(next.reason);
      setStatus(next.status);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const bundleOutcome: VerificationOutcome = React.useMemo(
    () => outcomeFromFileChecks(checks),
    [checks],
  );

  async function runBundleCheck() {
    if (!manifest) return;
    setChecking(true);
    try {
      const nextChecks = await verifyManifestFiles(manifest);
      setChecks(nextChecks);
      setLastBundleCheckAt(new Date().toISOString());
    } finally {
      setChecking(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-neutral-200" />
        <div className="h-48 animate-pulse rounded-sm border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (status !== "ok" || !manifest) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm text-neutral-500">
            <NavLink className="hover:text-neutral-900" to="/donate">
              Donate
            </NavLink>{" "}
            / Proof
          </div>
          <h1 className="ui-title">Donate proof unavailable</h1>
          <p className="ui-subtitle max-w-3xl">
            The structured proof bundle is unavailable right now.
          </p>
        </div>
        <Card title="Fallback identity data" variant="warning">
          <div className="space-y-2 text-[15px] text-neutral-800">
            <div>
              Reason: {failureReason ?? "Unknown validation error"}
            </div>
            <div>
              Fallback fingerprint (env):{" "}
              <span className="font-mono">
                {LEGACY_FINGERPRINT ?? "NOT_CONFIGURED_SET_VITE_DONATE_PGP_FINGERPRINT"}
              </span>
            </div>
            <div>
              If unsure, do not donate until proof bundle is restored.
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const statementPath =
    manifest.files.find((item) => item.path.endsWith("addresses.txt"))?.path ??
    "/donate-proof/v1/addresses.txt";
  const signaturePath =
    manifest.files.find((item) => item.path.endsWith("addresses.txt.asc"))?.path ??
    "/donate-proof/v1/addresses.txt.asc";
  const keyPath =
    manifest.files.find((item) => item.path.endsWith("signing-key.asc"))?.path ??
    "/donate-proof/v1/signing-key.asc";
  const fingerprint = manifest.key.fingerprint;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-neutral-500">
          <NavLink className="hover:text-neutral-900" to="/donate">
            Donate
          </NavLink>{" "}
          / Proof
        </div>
        <h1 className="ui-title">Donation trust center</h1>
        <p className="ui-subtitle max-w-3xl">
          Verify donation addresses before sending funds. This page serves both
          beginner and technical verification paths.
        </p>
      </div>

      <Surface variant="emphasis">
        <div className="grid gap-2 text-[15px] text-neutral-800 md:grid-cols-4">
          <div>
            <span className="font-semibold text-neutral-900">Proof ID:</span>{" "}
            {manifest.proofId}
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Published:</span>{" "}
            {formatDate(manifest.publishedAt)}
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Valid from:</span>{" "}
            {formatDate(manifest.validFrom)}
          </div>
          <div>
            <span className="font-semibold text-neutral-900">Last bundle check:</span>{" "}
            {lastBundleCheckAt ? formatDate(lastBundleCheckAt) : "Not run yet"}
          </div>
        </div>
      </Surface>

      <Card title="Quick verify (beginner path)" variant="emphasis">
        <VerifyChecklist
          proofPath={statementPath}
          signaturePath={signaturePath}
          fingerprint={fingerprint}
          bundleOutcome={bundleOutcome}
          manualFingerprintConfirmed={manualFingerprintConfirmed}
          onManualFingerprintConfirmedChange={setManualFingerprintConfirmed}
          onRunBundleCheck={runBundleCheck}
          checking={checking}
        />
      </Card>

      <Card title="Verification files">
        <ProofFileTable checks={checks.length ? checks : manifest.files.map((item) => ({
          path: item.path,
          expectedSha256: item.sha256,
          expectedSizeBytes: item.sizeBytes,
          actualSha256: null,
          actualSizeBytes: null,
          status: "unknown",
        }))} />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[15px] text-neutral-700">
          <a className="underline" href={statementPath} target="_blank" rel="noopener noreferrer">
            Open signed statement
          </a>
          <a className="underline" href={signaturePath} target="_blank" rel="noopener noreferrer">
            Open detached signature
          </a>
          <a className="underline" href="/donate-proof/v1/manifest.v1.json" target="_blank" rel="noopener noreferrer">
            Open machine manifest
          </a>
          <a className="underline" href="/donate-proof/v1/README.txt" target="_blank" rel="noopener noreferrer">
            Read plain-language instructions
          </a>
        </div>
      </Card>

      <Card title="Key identity">
        <KeyIdentityCard
          fingerprint={manifest.key.fingerprint}
          keyId={manifest.key.keyId}
          algorithm={manifest.key.algorithm}
          firstSeenAt={formatDate(manifest.key.firstSeenAt)}
          keyPath={keyPath}
        />
      </Card>

      <Card title="Advanced verification">
        <AdvancedCommandsTabs
          statementPath={statementPath}
          signaturePath={signaturePath}
          keyPath={keyPath}
        />
      </Card>

      <Card title="If verification fails" variant="danger">
        <FailureActionsBox />
      </Card>

      <Card title="Threat model note" variant="warning">
        <div className="space-y-2 text-[15px] text-neutral-800">
          <div>
            Proof protects against silent address replacement and stale artifact
            confusion when you verify correctly.
          </div>
          <div>
            It does not protect against a compromised device, fake browser
            extensions, or phishing domains you manually trust.
          </div>
        </div>
      </Card>

      <Card title="Common scam patterns">
        <ul className="list-inside list-disc space-y-1 text-[15px] text-neutral-800">
          <li>Address from screenshots or social posts differs from signed statement.</li>
          <li>Old mirror page serves stale, superseded proof files.</li>
          <li>Clipboard malware swaps copied wallet addresses before send.</li>
          <li>Phishing domain uses similar spelling and fake status messages.</li>
        </ul>
      </Card>

      <Card title="Archive and history">
        <div className="space-y-2 text-[15px] text-neutral-800">
          <div>
            Review previous proofs, old keys, and retirement notes before large
            donations.
          </div>
          <NavLink className="underline" to="/donate/proof/archive">
            Open proof archive
          </NavLink>
        </div>
      </Card>
    </div>
  );
}
