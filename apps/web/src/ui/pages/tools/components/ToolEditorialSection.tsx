import React from "react";
import { NavLink } from "react-router-dom";
import {
  getToolDefinition,
  type ToolSlug,
} from "../../../../content/tools/toolRegistry";
import {
  faqQuestion,
  FAQ_SLUGS,
  getToolEditorial,
  getRelatedTools,
} from "../../../../content/tools/toolDocs";
import { Card } from "../../../components/Card";

export function ToolEditorialSection({ slug }: { slug: ToolSlug }) {
  const editorial = getToolEditorial(slug);
  const tool = getToolDefinition(slug);
  const related = getRelatedTools(slug);
  if (!tool) return null;

  return (
    <div className="space-y-6 mt-8">
      <Card title={`How to use ${tool.name}`}>
        <ol className="list-decimal list-inside space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
          {editorial.howToSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </Card>

      <Card title="Tips">
        <ul className="list-disc list-inside space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
          {editorial.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </Card>

      <Card title="Frequently asked questions">
        {FAQ_SLUGS.map((faqSlug) => (
          <details
            key={faqSlug}
            className="border-b border-[var(--ui-border)] pb-3 mb-3 last:border-0"
          >
            <summary className="cursor-pointer text-[15px] font-medium">
              {faqQuestion(faqSlug, tool.name)}
            </summary>
            <p className="mt-2 text-[15px] text-[var(--ui-text-muted)]">
              {editorial.faq[faqSlug]}
            </p>
          </details>
        ))}
      </Card>

      <div className="rounded-sm border border-green-200 bg-green-950/30 p-4 text-sm text-green-300">
        <strong>Privacy:</strong>{" "}
        {tool.processingMode === "local"
          ? "Your files never leave your browser."
          : "Hybrid processing — cloud opt-in required."}{" "}
        <NavLink className="underline" to={`/tools/${slug}/privacy`}>
          Full privacy model
        </NavLink>
      </div>

      {related.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ui-text)] mb-3">
            Related tools
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <NavLink
                key={r.slug}
                to={`/tools/${r.slug}`}
                className="block rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4 hover:border-[var(--ui-border)]"
              >
                <div className="text-sm font-medium text-[var(--ui-text)]">
                  {r.name}
                </div>
                <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
                  {r.description}
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
