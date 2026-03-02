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
        <ol className="list-decimal list-inside space-y-2 text-[15px] text-neutral-700">
          {editorial.howToSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </Card>

      <Card title="Tips">
        <ul className="list-disc list-inside space-y-1 text-[15px] text-neutral-700">
          {editorial.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </Card>

      <Card title="Frequently asked questions">
        {FAQ_SLUGS.map((faqSlug) => (
          <details
            key={faqSlug}
            className="border-b border-neutral-100 pb-3 mb-3 last:border-0"
          >
            <summary className="cursor-pointer text-[15px] font-medium">
              {faqQuestion(faqSlug, tool.name)}
            </summary>
            <p className="mt-2 text-[15px] text-neutral-600">
              {editorial.faq[faqSlug]}
            </p>
          </details>
        ))}
      </Card>

      <div className="rounded-sm border border-green-200 bg-green-50 p-4 text-sm text-green-900">
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
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">
            Related tools
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <NavLink
                key={r.slug}
                to={`/tools/${r.slug}`}
                className="block rounded-sm border border-neutral-200 bg-white p-4 hover:border-neutral-300"
              >
                <div className="text-sm font-medium text-neutral-900">
                  {r.name}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
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
