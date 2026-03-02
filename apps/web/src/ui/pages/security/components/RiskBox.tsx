import React from "react";
import { audienceToTitle, trackToTitle } from "../../../../content/security/frontmatter";
import type { SecurityMeta } from "../../../../content/security/securityIndex";

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="ui-tag">{children}</span>;
}

export function RiskBox({ article }: { article: SecurityMeta }) {
  return (
    <div className="rounded-sm border border-amber-400 bg-amber-50 p-4">
      <div className="text-base font-semibold text-amber-900">Risk profile</div>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {article.track ? <Pill>{trackToTitle(article.track)}</Pill> : <Pill>Policy</Pill>}
        <Pill>Risk: {article.riskLevel}</Pill>
        <Pill>{article.difficulty}</Pill>
        <Pill>{article.estimatedMinutes} min</Pill>
      </div>
      <div className="mt-2 text-sm text-amber-900">
        Last reviewed: {article.lastReviewed ?? "Pending"}
      </div>
      {article.audience.length ? (
        <div className="mt-2 text-sm text-amber-900">
          Audience:{" "}
          {article.audience.map((item) => audienceToTitle(item)).join(", ")}
        </div>
      ) : null}
    </div>
  );
}
