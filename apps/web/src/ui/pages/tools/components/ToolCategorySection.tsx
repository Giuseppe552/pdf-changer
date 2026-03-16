import React from "react";
import {
  categoryLabel,
  type ToolCategory,
  type ToolDefinition,
} from "../../../../content/tools/toolRegistry";
import { ToolCard } from "./ToolCard";

export function ToolCategorySection({
  category,
  tools,
}: {
  category: ToolCategory;
  tools: ToolDefinition[];
}) {
  if (!tools.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--ui-text)]">
        {categoryLabel(category)}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
}

