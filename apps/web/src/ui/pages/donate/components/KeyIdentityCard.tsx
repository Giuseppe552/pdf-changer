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
      <div className="grid gap-2 text-[15px] text-neutral-800 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold text-neutral-600">Fingerprint</div>
          <div className="break-all border border-neutral-300 bg-neutral-100 px-2 py-2 font-mono text-sm text-neutral-900">
            {fingerprint}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-600">Key ID</div>
          <div className="border border-neutral-300 bg-neutral-100 px-2 py-2 font-mono text-sm text-neutral-900">
            {keyId}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-600">Algorithm</div>
          <div>{algorithm}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-600">First seen</div>
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
      <div className="text-sm text-neutral-600">
        Rotation policy: old keys remain in the archive with retirement or revocation notes.
      </div>
    </div>
  );
}
