import { useParams } from "react-router-dom";
import { MarkdownContentPage } from "./content/MarkdownContentPage";

export function GuidePage() {
  const params = useParams();
  const slug = (params.slug ?? "").trim();
  return <MarkdownContentPage section="guides" slug={slug} />;
}

