import React from "react";
import { NavLink, useParams } from "react-router-dom";
import { getToolDefinition, type ToolSlug } from "../../../content/tools/toolRegistry";
import { canUseTool, usageSnapshot } from "../../../utils/usageV2";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { ScrubberPage } from "../ScrubberPage";
import { CompressToolPage } from "./CompressToolPage";
import { ImageToPdfToolPage } from "./ImageToPdfToolPage";
import { MergeToolPage } from "./MergeToolPage";
import { PageNumbersToolPage } from "./PageNumbersToolPage";
import { PageEditorToolPage } from "./PageEditorToolPage";
import { PdfToImageToolPage } from "./PdfToImageToolPage";
import { ProtectToolPage } from "./ProtectToolPage";
import { RemovePagesToolPage } from "./RemovePagesToolPage";
import { SplitToolPage } from "./SplitToolPage";
import { UnlockToolPage } from "./UnlockToolPage";
import { WatermarkToolPage } from "./WatermarkToolPage";
import { FlattenToolPage } from "./FlattenToolPage";
import { RedactToolPage } from "./RedactToolPage";
import { PipelineToolPage } from "./PipelineToolPage";
import { RotateToolPage } from "./RotateToolPage";
import { CropToolPage } from "./CropToolPage";
import { SignToolPage } from "./SignToolPage";
import { FillFormToolPage } from "./FillFormToolPage";
import { OcrToolPage } from "./OcrToolPage";
import { ToolLimitNotice } from "./components/ToolLimitNotice";
import { ToolEditorialSection } from "./components/ToolEditorialSection";
import { UsageMeter } from "./components/UsageMeter";

function toolComponent(slug: ToolSlug): React.ReactNode {
  switch (slug) {
    case "scrub":
      return <ScrubberPage />;
    case "merge":
      return <MergeToolPage />;
    case "split":
      return <SplitToolPage />;
    case "editor":
      return <PageEditorToolPage />;
    case "compress":
      return <CompressToolPage />;
    case "image-to-pdf":
      return <ImageToPdfToolPage />;
    case "pdf-to-image":
      return <PdfToImageToolPage />;
    case "watermark":
      return <WatermarkToolPage />;
    case "page-numbers":
      return <PageNumbersToolPage />;
    case "protect":
      return <ProtectToolPage />;
    case "unlock":
      return <UnlockToolPage />;
    case "remove-pages":
      return <RemovePagesToolPage />;
    case "flatten":
      return <FlattenToolPage />;
    case "redact":
      return <RedactToolPage />;
    case "pipeline":
      return <PipelineToolPage />;
    case "rotate":
      return <RotateToolPage />;
    case "crop":
      return <CropToolPage />;
    case "sign":
      return <SignToolPage />;
    case "fill-form":
      return <FillFormToolPage />;
    case "ocr":
      return <OcrToolPage />;
    default:
      return null;
  }
}

export function ToolRunnerPage() {
  const { slug = "" } = useParams();
  const { me } = useAuth();
  const tool = getToolDefinition(slug);

  const pageTitle = tool ? `${tool.name} · PDF Changer` : "Tool not found · PDF Changer";
  React.useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (!tool) {
    return (
      <div className="space-y-4">
        <h1 className="ui-title">Tool not found</h1>
        <Card title="Unknown tool">
          <div className="text-[15px] text-neutral-700">
            Open the <NavLink className="underline" to="/tools">Tools Hub</NavLink> to choose a valid route.
          </div>
        </Card>
      </div>
    );
  }

  const snapshot = usageSnapshot(me, tool.slug);
  const allowed = canUseTool(me, tool.slug);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="text-sm text-neutral-500">
          <NavLink className="hover:text-neutral-900" to="/tools">
            Tools
          </NavLink>{" "}
          / {tool.name}
        </div>
        <h1 className="ui-title">{tool.name}</h1>
        <p className="ui-subtitle max-w-3xl">{tool.description}</p>
      </div>

      <Card title="Docs and workflow">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-neutral-800">
          <NavLink className="underline" to={`/tools/${tool.slug}/how-to`}>
            How-to
          </NavLink>
          <NavLink className="underline" to={`/tools/${tool.slug}/privacy`}>
            Privacy + limits
          </NavLink>
          <NavLink className="underline" to={`/tools/${tool.slug}/troubleshooting`}>
            Troubleshooting
          </NavLink>
          <NavLink className="underline" to="/security">
            Security Hub
          </NavLink>
        </div>
      </Card>

      <UsageMeter snapshot={snapshot} title="Quota for this tool" />

      {!allowed ? (
        <ToolLimitNotice message="This tool cannot run until the monthly quota resets or plan is upgraded." />
      ) : null}

      {toolComponent(tool.slug)}

      <ToolEditorialSection slug={tool.slug} />
    </div>
  );
}
