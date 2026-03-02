import React from "react";
import { Button } from "../../../components/Button";
import type { VerificationOutcome } from "../../../../content/donate/proofLoader";

function OutcomeBadge({ outcome }: { outcome: VerificationOutcome }) {
  if (outcome === "pass") {
    return (
      <span className="ui-tag border-emerald-400 bg-emerald-50 text-emerald-800">
        PASS
      </span>
    );
  }
  if (outcome === "fail") {
    return (
      <span className="ui-tag border-red-400 bg-red-50 text-red-800">
        FAIL
      </span>
    );
  }
  return <span className="ui-tag">UNKNOWN</span>;
}

export function VerifyChecklist({
  proofPath,
  signaturePath,
  fingerprint,
  bundleOutcome,
  manualFingerprintConfirmed,
  onManualFingerprintConfirmedChange,
  onRunBundleCheck,
  checking,
}: {
  proofPath: string;
  signaturePath: string;
  fingerprint: string;
  bundleOutcome: VerificationOutcome;
  manualFingerprintConfirmed: boolean;
  onManualFingerprintConfirmedChange: (next: boolean) => void;
  onRunBundleCheck: () => void;
  checking: boolean;
}) {
  const command = `gpg --verify ${signaturePath.replace(/^\//, "")} ${proofPath.replace(/^\//, "")}`;
  const finalDecision =
    bundleOutcome === "pass" && manualFingerprintConfirmed ? "pass" : bundleOutcome === "fail" ? "fail" : "unknown";

  return (
    <div className="space-y-4">
      <div className="text-base text-neutral-800">
        Quick verify in 3 steps:
      </div>
      <ol className="list-inside list-decimal space-y-3 text-[15px] text-neutral-800">
        <li>
          Download <code>{proofPath}</code> and <code>{signaturePath}</code>.
        </li>
        <li>
          Run signature check in terminal:
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-sm border border-neutral-300 bg-neutral-100 px-2 py-1 text-sm text-neutral-900">
              {command}
            </code>
            <Button
              size="md"
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(command)}
            >
              Copy command
            </Button>
          </div>
          <div className="mt-1 text-sm text-neutral-600">
            Expected: good signature from the pinned key.
          </div>
        </li>
        <li>
          Confirm key fingerprint equals:
          <div className="mt-1 break-all border border-neutral-300 bg-neutral-100 px-2 py-2 font-mono text-sm text-neutral-900">
            {fingerprint}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={manualFingerprintConfirmed}
              onChange={(event) => onManualFingerprintConfirmedChange(event.target.checked)}
            />
            I confirmed the fingerprint matches exactly.
          </label>
        </li>
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onRunBundleCheck} disabled={checking}>
          {checking ? "Checking bundle…" : "Run bundle integrity check"}
        </Button>
        <div className="text-sm text-neutral-700">Bundle:</div>
        <OutcomeBadge outcome={bundleOutcome} />
        <div className="text-sm text-neutral-700">Fingerprint:</div>
        <OutcomeBadge outcome={manualFingerprintConfirmed ? "pass" : "unknown"} />
      </div>
      <div className="space-y-1 text-sm text-neutral-600">
        <div>
          Final trust decision: require both a passing bundle check and a
          confirmed fingerprint.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-700">Result:</span>
          <OutcomeBadge outcome={finalDecision} />
          <span className="text-neutral-700">
            {finalDecision === "pass"
              ? "Safe to proceed with donation."
              : finalDecision === "fail"
                ? "Stop and do not send funds."
                : "Still unverified."}
          </span>
        </div>
      </div>
    </div>
  );
}
