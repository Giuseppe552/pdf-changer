import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import type { DonateProofArchiveIndex } from "../../content/donate/proofManifest";
import { loadDonateProofArchive } from "../../content/donate/proofLoader";

function formatDate(value: string): string {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Date(ts).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function DonateProofArchivePage() {
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing" | "invalid">(
    "loading",
  );
  const [reason, setReason] = React.useState<string | null>(null);
  const [archive, setArchive] = React.useState<DonateProofArchiveIndex | null>(null);

  React.useEffect(() => {
    document.title = "Donate Proof Archive · PDF Changer";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      const next = await loadDonateProofArchive();
      if (cancelled) return;
      if (next.status === "ok") {
        setArchive(next.archive);
        setReason(null);
        setStatus("ok");
        return;
      }
      setArchive(null);
      setReason(next.reason);
      setStatus(next.status);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-sm bg-[var(--ui-bg-overlay)]" />
        <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
      </div>
    );
  }

  if (status !== "ok" || !archive) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Proof archive unavailable</h1>
        <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-[15px] text-[var(--ui-text-secondary)] shadow-sm">
          {reason ?? "Archive index could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-[var(--ui-text-muted)]">
          <NavLink className="hover:text-[var(--ui-text)]" to="/donate">
            Donate
          </NavLink>{" "}
          /{" "}
          <NavLink className="hover:text-[var(--ui-text)]" to="/donate/proof">
            Proof
          </NavLink>{" "}
          / Archive
        </div>
        <h1 className="ui-title">Proof archive</h1>
        <p className="ui-subtitle max-w-3xl">
          Historical proof bundles, retired keys, and revocation notes for audit
          continuity.
        </p>
      </div>

      <Card title="Proof history">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                <th className="px-2 py-2 font-semibold">Proof ID</th>
                <th className="px-2 py-2 font-semibold">Published</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Manifest</th>
              </tr>
            </thead>
            <tbody>
              {archive.proofs.map((proof) => (
                <tr key={proof.proofId} className="border-b border-[var(--ui-border)]">
                  <td className="px-2 py-2 font-mono text-xs text-[var(--ui-text)]">
                    {proof.proofId}
                  </td>
                  <td className="px-2 py-2 text-[15px] text-[var(--ui-text-secondary)]">
                    {formatDate(proof.publishedAt)}
                  </td>
                  <td className="px-2 py-2 text-[15px]">
                    <span
                      className={[
                        "ui-tag",
                        proof.revoked
                          ? "border-red-700/40 bg-red-950/30 text-red-300"
                          : "border-emerald-400 bg-emerald-950/30 text-emerald-300",
                      ].join(" ")}
                    >
                      {proof.revoked ? "Revoked" : "Valid at publish"}
                    </span>
                    {proof.revocationReason ? (
                      <div className="mt-1 text-sm text-[var(--ui-text-muted)]">
                        {proof.revocationReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-[15px] text-[var(--ui-text-secondary)]">
                    <a
                      className="underline"
                      href={proof.manifestPath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open manifest
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Key history">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
                <th className="px-2 py-2 font-semibold">Fingerprint</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">First seen</th>
                <th className="px-2 py-2 font-semibold">Key</th>
              </tr>
            </thead>
            <tbody>
              {archive.keys.map((key) => (
                <tr key={`${key.fingerprint}:${key.path}`} className="border-b border-[var(--ui-border)]">
                  <td className="px-2 py-2 font-mono text-xs text-[var(--ui-text)]">
                    {key.fingerprint}
                  </td>
                  <td className="px-2 py-2 text-[15px] text-[var(--ui-text-secondary)]">
                    {key.status}
                  </td>
                  <td className="px-2 py-2 text-[15px] text-[var(--ui-text-secondary)]">
                    {formatDate(key.firstSeenAt)}
                  </td>
                  <td className="px-2 py-2 text-[15px] text-[var(--ui-text-secondary)]">
                    <a
                      className="underline"
                      href={key.path}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download key
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
