import React from "react";
import { NavLink, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getToolCollectionPage,
  getToolFaqPage,
  getToolHowToPage,
  getToolPrivacyPage,
  getToolTroubleshootingPage,
  getToolUseCasePage,
  type ToolDocPage as ToolDocPageModel,
} from "../../../content/tools/toolDocs";
import { Card } from "../../components/Card";

type ToolDocMode =
  | "how-to"
  | "privacy"
  | "use-case"
  | "faq"
  | "collection"
  | "troubleshooting";

function resolveDoc(mode: ToolDocMode, params: Record<string, string | undefined>): ToolDocPageModel | null {
  const slug = params.slug ?? "";
  switch (mode) {
    case "how-to":
      return getToolHowToPage(slug);
    case "privacy":
      return getToolPrivacyPage(slug);
    case "use-case":
      return getToolUseCasePage(slug, params.useCaseSlug ?? "");
    case "faq":
      return getToolFaqPage(slug, params.faqSlug ?? "");
    case "collection":
      return getToolCollectionPage(params.collectionSlug ?? "");
    case "troubleshooting":
      return getToolTroubleshootingPage(slug);
    default:
      return null;
  }
}

export function ToolDocPage({ mode }: { mode: ToolDocMode }) {
  const params = useParams();
  const doc = resolveDoc(mode, params);

  React.useEffect(() => {
    document.title = `${doc?.title ?? "Tool Document"} · PDF Changer`;
  }, [doc?.title]);

  if (!doc) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Tool document not found</h1>
        <Card title="Missing route">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            This tools documentation page is unavailable.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="text-sm text-[var(--ui-text-muted)]">
          <NavLink className="hover:text-[var(--ui-text)]" to="/tools">
            Tools
          </NavLink>{" "}
          / {doc.title}
        </div>
        <h1 className="ui-title">{doc.title}</h1>
        <p className="ui-subtitle max-w-3xl">{doc.description}</p>
      </div>

      {doc.tool ? (
        <Card title="Related links">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-[var(--ui-text-secondary)]">
            <NavLink className="underline" to={`/tools/${doc.tool.slug}`}>
              Open tool
            </NavLink>
            <NavLink className="underline" to={`/tools/${doc.tool.slug}/how-to`}>
              How-to
            </NavLink>
            <NavLink className="underline" to={`/tools/${doc.tool.slug}/privacy`}>
              Privacy
            </NavLink>
            <NavLink className="underline" to="/security">
              Security hub
            </NavLink>
          </div>
        </Card>
      ) : null}

      <Card>
        <article className="prose prose-invert max-w-none text-base">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.markdown}</ReactMarkdown>
        </article>
      </Card>
    </div>
  );
}

