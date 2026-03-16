import React from "react";
import { NavLink } from "react-router-dom";
import {
  gaTools,
  labTools,
  toolCategories,
  toolsByCategory,
} from "../../../content/tools/toolRegistry";
import { toolCollections } from "../../../content/tools/toolDocs";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Surface } from "../../components/Surface";
import { usageSnapshot } from "../../../utils/usageV2";
import { ToolCard } from "./components/ToolCard";
import { ToolCategorySection } from "./components/ToolCategorySection";
import { UsageMeter } from "./components/UsageMeter";

const PERSONA_PATHS: Array<{ label: string; to: string; blurb: string }> = [
  {
    label: "Office workers",
    to: "/tools/collections/office-daily",
    blurb: "Daily document clean-up, editing, and format conversion.",
  },
  {
    label: "General users",
    to: "/tools/collections/conversion-pack",
    blurb: "Simple conversions and page changes without account friction.",
  },
  {
    label: "Journalists/supporters",
    to: "/tools/collections/safe-sharing",
    blurb: "Safer sharing workflow with scrub-first defaults.",
  },
];

export function ToolsHubPage() {
  const { me } = useAuth();
  const snapshot = usageSnapshot(me);
  const launchTools = gaTools();
  const featured = launchTools.filter((tool) => tool.featured);
  const labs = labTools();

  React.useEffect(() => {
    document.title = "Tools Hub · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Tools Hub</h1>
        <p className="ui-subtitle max-w-3xl">
          Privacy-first PDF productivity tools for everyday computer work.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-text-secondary)]">
          On-device by default, no PDF uploads for local tools, and no analytics trackers.
          Only fully functional tools appear in the main lists.
        </div>
      </Surface>

      <UsageMeter snapshot={snapshot} title="Your monthly tool quota" />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ui-text)]">Quick actions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {featured.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {toolCategories.map((category) => (
        <ToolCategorySection
          key={category}
          category={category}
          tools={toolsByCategory(category).filter((tool) => tool.status === "ga")}
        />
      ))}

      <Card title="Who this is for">
        <div className="grid gap-3 md:grid-cols-3">
          {PERSONA_PATHS.map((persona) => (
            <div key={persona.label} className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div className="text-base font-semibold text-[var(--ui-text)]">{persona.label}</div>
              <div className="mt-2 text-[15px] text-[var(--ui-text-secondary)]">{persona.blurb}</div>
              <NavLink className="mt-3 inline-block underline text-sm text-[var(--ui-text-secondary)]" to={persona.to}>
                Open workflow
              </NavLink>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Daily workflows">
        <div className="grid gap-3 md:grid-cols-3">
          {toolCollections.map((collection) => (
            <div key={collection.slug} className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-4">
              <div className="text-base font-semibold text-[var(--ui-text)]">{collection.title}</div>
              <div className="mt-2 text-[15px] text-[var(--ui-text-secondary)]">{collection.description}</div>
              <NavLink className="mt-3 inline-block underline text-sm text-[var(--ui-text-secondary)]" to={`/tools/collections/${collection.slug}`}>
                View collection
              </NavLink>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Limits and trust notes" variant="warning">
        <ul className="list-inside list-disc space-y-2 text-[15px] text-[var(--ui-text-secondary)]">
          <li>Guest: 40 actions/month (device-local, resets monthly).</li>
          <li>Free account: 600 actions/month, including 150 heavy actions.</li>
          <li>Paid plan: unlimited workflows and future batch features.</li>
          <li>No tool guarantees legal anonymity or endpoint safety.</li>
        </ul>
      </Card>

      <Card title="Labs / Beta tools" className="scroll-mt-28" >
        <div id="labs" />
        <div className="space-y-3">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            These routes are visible for transparency, not positioned as daily-driver features.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {labs.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </Card>

      <Surface compact>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            Keep this free hub sustainable through donations or upgrade for workflow scale.
          </div>
          <div className="flex flex-wrap gap-2">
            <NavLink to="/donate">
              <Button variant="secondary">Support free tools</Button>
            </NavLink>
            <NavLink to="/pricing">
              <Button>View paid workflow plan</Button>
            </NavLink>
          </div>
        </div>
      </Surface>
    </div>
  );
}
