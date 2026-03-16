import React from "react";
import type { ProofFileVerification } from "../../../../content/donate/proofLoader";

function statusLabel(status: ProofFileVerification["status"]): string {
  if (status === "pass") return "PASS";
  if (status === "fail") return "FAIL";
  if (status === "missing") return "MISSING";
  if (status === "unknown") return "PENDING";
  return "ERROR";
}

function statusClass(status: ProofFileVerification["status"]): string {
  if (status === "pass") {
    return "border-emerald-400 bg-emerald-950/30 text-emerald-300";
  }
  if (status === "fail") {
    return "border-red-700/40 bg-red-950/30 text-red-300";
  }
  if (status === "missing") {
    return "border-amber-700/40 bg-amber-950/30 text-amber-300";
  }
  if (status === "unknown") {
    return "border-[var(--ui-border-strong)] bg-[var(--ui-bg-overlay)] text-[var(--ui-text-secondary)]";
  }
  return "border-red-700/40 bg-red-950/30 text-red-300";
}

export function ProofFileTable({ checks }: { checks: ProofFileVerification[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--ui-border)] text-[var(--ui-text-secondary)]">
            <th className="px-2 py-2 font-semibold">File</th>
            <th className="px-2 py-2 font-semibold">Expected SHA-256</th>
            <th className="px-2 py-2 font-semibold">Actual SHA-256</th>
            <th className="px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.path} className="border-b border-[var(--ui-border)]">
              <td className="px-2 py-2 align-top font-mono text-xs text-[var(--ui-text-secondary)]">
                {check.path}
              </td>
              <td className="px-2 py-2 align-top font-mono text-xs text-[var(--ui-text-secondary)]">
                {check.expectedSha256}
              </td>
              <td className="px-2 py-2 align-top font-mono text-xs text-[var(--ui-text-secondary)]">
                {check.actualSha256 ?? "—"}
              </td>
              <td className="px-2 py-2 align-top">
                <span className={`ui-tag ${statusClass(check.status)}`}>
                  {statusLabel(check.status)}
                </span>
                {check.error ? (
                  <div className="mt-1 text-xs text-[var(--ui-text-muted)]">{check.error}</div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
