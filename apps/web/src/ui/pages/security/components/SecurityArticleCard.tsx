import React from "react";
import { NavLink } from "react-router-dom";
import {
  audienceToTitle,
  trackToTitle,
} from "../../../../content/security/frontmatter";
import type { SecurityMeta } from "../../../../content/security/securityIndex";

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="ui-tag">{children}</span>;
}

export function SecurityArticleCard({ article }: { article: SecurityMeta }) {
  return (
    <NavLink
      to={article.route}
      className="group block rounded-sm border border-neutral-300 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {article.track ? (
            <Pill>{trackToTitle(article.track)}</Pill>
          ) : (
            <Pill>Policy</Pill>
          )}
          <Pill>Risk: {article.riskLevel}</Pill>
          <Pill>{article.difficulty}</Pill>
        </div>
        <div className="text-sm text-neutral-500">
          {article.lastReviewed ?? "Review date pending"} · {article.estimatedMinutes} min
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-neutral-900 group-hover:text-neutral-950">
        {article.title}
      </h3>
      <p className="mt-1 text-[15px] text-neutral-600">{article.summary}</p>
      {article.audience.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {article.audience.slice(0, 4).map((audience) => (
            <Pill key={audience}>{audienceToTitle(audience)}</Pill>
          ))}
        </div>
      ) : null}
    </NavLink>
  );
}
