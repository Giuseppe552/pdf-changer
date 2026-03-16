import React from "react";
import { Button } from "../../../components/Button";

export function KeyIdentityCard({
  fingerprint,
  keyId,
  algorithm,
  firstSeenAt,
  keyPath,
}: {
  fingerprint: string;
  keyId: string;
  algorithm: string;
  firstSeenAt: string;
  keyPath: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)] md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Fingerprint</div>
          <div className="break-all border border-[var(--ui-border)] bg-[var(--ui-bg-overlay)] px-2 py-2 font-mono text-sm text-[var(--ui-text)]">
            {fingerprint}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Key ID</div>
          <div className="border border-[var(--ui-border)] bg-[var(--ui-bg-overlay)] px-2 py-2 font-mono text-sm text-[var(--ui-text)]">
            {keyId}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--ui-text-muted)]">Algorithm</div>
          <div>{algorithm}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--ui-text-muted)]">First seen</div>
          <div>{firstSeenAt}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={keyPath} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="md">
            Download signing key
          </Button>
        </a>
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigator.clipboard.writeText(fingerprint)}
        >
          Copy fingerprint
        </Button>
      </div>
      <div className="text-sm text-[var(--ui-text-muted)]">
        Rotation policy: old keys remain in the archive with retirement or revocation notes.
      </div>
    </div>
  );
}
