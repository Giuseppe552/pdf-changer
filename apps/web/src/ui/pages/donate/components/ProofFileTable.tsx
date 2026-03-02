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
    return "border-emerald-400 bg-emerald-50 text-emerald-800";
  }
  if (status === "fail") {
    return "border-red-400 bg-red-50 text-red-800";
  }
  if (status === "missing") {
    return "border-amber-400 bg-amber-50 text-amber-800";
  }
  if (status === "unknown") {
    return "border-neutral-400 bg-neutral-100 text-neutral-700";
  }
  return "border-red-400 bg-red-50 text-red-800";
}

export function ProofFileTable({ checks }: { checks: ProofFileVerification[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-neutral-700">
            <th className="px-2 py-2 font-semibold">File</th>
            <th className="px-2 py-2 font-semibold">Expected SHA-256</th>
            <th className="px-2 py-2 font-semibold">Actual SHA-256</th>
            <th className="px-2 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.path} className="border-b border-neutral-200">
              <td className="px-2 py-2 align-top font-mono text-xs text-neutral-800">
                {check.path}
              </td>
              <td className="px-2 py-2 align-top font-mono text-xs text-neutral-700">
                {check.expectedSha256}
              </td>
              <td className="px-2 py-2 align-top font-mono text-xs text-neutral-700">
                {check.actualSha256 ?? "—"}
              </td>
              <td className="px-2 py-2 align-top">
                <span className={`ui-tag ${statusClass(check.status)}`}>
                  {statusLabel(check.status)}
                </span>
                {check.error ? (
                  <div className="mt-1 text-xs text-neutral-600">{check.error}</div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
