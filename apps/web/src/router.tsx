import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { BlogIndexPage } from "./ui/pages/blog/BlogIndexPage";
import { LandingPage } from "./ui/pages/LandingPage";
import { NotFoundPage } from "./ui/pages/NotFoundPage";
import { RouteErrorPage } from "./ui/pages/RouteErrorPage";
import { lazyNamed, withSuspense } from "./ui/routing/lazyRoute";

const ScrubberPageLazy = lazyNamed(
  () => import("./ui/pages/ScrubberPage"),
  "ScrubberPage",
);
const BlogPostPageLazy = lazyNamed(
  () => import("./ui/pages/blog/BlogPostPage"),
  "BlogPostPage",
);
const FaqHubPageLazy = lazyNamed(
  () => import("./ui/pages/faq/FaqHubPage"),
  "FaqHubPage",
);
const FaqTopicPageLazy = lazyNamed(
  () => import("./ui/pages/faq/FaqTopicPage"),
  "FaqTopicPage",
);
const FaqQuestionPageLazy = lazyNamed(
  () => import("./ui/pages/faq/FaqQuestionPage"),
  "FaqQuestionPage",
);
const PricingPageLazy = lazyNamed(() => import("./ui/pages/PricingPage"), "PricingPage");
const AccountPageLazy = lazyNamed(() => import("./ui/pages/AccountPage"), "AccountPage");
const SecurityPageLazy = lazyNamed(
  () => import("./ui/pages/SecurityPage"),
  "SecurityPage",
);
const SecurityTrackPageLazy = lazyNamed(
  () => import("./ui/pages/security/SecurityTrackPage"),
  "SecurityTrackPage",
);
const SecurityArticlePageLazy = lazyNamed(
  () => import("./ui/pages/security/SecurityArticlePage"),
  "SecurityArticlePage",
);
const SecurityPolicyPageLazy = lazyNamed(
  () => import("./ui/pages/security/SecurityArticlePage"),
  "SecurityPolicyPage",
);
const PrivacyPageLazy = lazyNamed(() => import("./ui/pages/PrivacyPage"), "PrivacyPage");
const DonatePageLazy = lazyNamed(() => import("./ui/pages/DonatePage"), "DonatePage");
const DonateProofPageLazy = lazyNamed(
  () => import("./ui/pages/DonateProofPage"),
  "DonateProofPage",
);
const DonateProofArchivePageLazy = lazyNamed(
  () => import("./ui/pages/DonateProofArchivePage"),
  "DonateProofArchivePage",
);
const MarkdownContentPageLazy = lazyNamed(
  () => import("./ui/pages/content/MarkdownContentPage"),
  "MarkdownContentPage",
);
const MarkdownRoutePageLazy = lazyNamed(
  () => import("./ui/pages/content/MarkdownContentPage"),
  "MarkdownRoutePage",
);
const GuidesIndexPageLazy = lazyNamed(
  () => import("./ui/pages/GuidesIndexPage"),
  "GuidesIndexPage",
);
const GuidePageLazy = lazyNamed(() => import("./ui/pages/GuidePage"), "GuidePage");
const SitemapPageLazy = lazyNamed(
  () => import("./ui/pages/SitemapPage"),
  "SitemapPage",
);
const StatusPageLazy = lazyNamed(() => import("./ui/pages/StatusPage"), "StatusPage");
const AboutPageLazy = lazyNamed(() => import("./ui/pages/AboutPage"), "AboutPage");
const ColophonPageLazy = lazyNamed(() => import("./ui/pages/ColophonPage"), "ColophonPage");
const VerifyPageLazy = lazyNamed(() => import("./ui/pages/VerifyPage"), "VerifyPage");
const NewsletterPageLazy = lazyNamed(
  () => import("./ui/pages/NewsletterPage"),
  "NewsletterPage",
);
const ContactPageLazy = lazyNamed(() => import("./ui/pages/ContactPage"), "ContactPage");
const ToolsLayoutLazy = lazyNamed(
  () => import("./ui/pages/tools/ToolsLayout"),
  "ToolsLayout",
);
const ToolsHubPageLazy = lazyNamed(
  () => import("./ui/pages/tools/ToolsHubPage"),
  "ToolsHubPage",
);
const ToolDocPageLazy = lazyNamed(
  () => import("./ui/pages/tools/ToolDocPage"),
  "ToolDocPage",
);
const MergeToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/MergeToolPage"),
  "MergeToolPage",
);
const SplitToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/SplitToolPage"),
  "SplitToolPage",
);
const PageEditorToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/PageEditorToolPage"),
  "PageEditorToolPage",
);
const CompressToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/CompressToolPage"),
  "CompressToolPage",
);
const ImageToPdfToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/ImageToPdfToolPage"),
  "ImageToPdfToolPage",
);
const PdfToImageToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/PdfToImageToolPage"),
  "PdfToImageToolPage",
);
const WatermarkToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/WatermarkToolPage"),
  "WatermarkToolPage",
);
const PageNumbersToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/PageNumbersToolPage"),
  "PageNumbersToolPage",
);
const RemovePagesToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/RemovePagesToolPage"),
  "RemovePagesToolPage",
);
const ProtectToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/ProtectToolPage"),
  "ProtectToolPage",
);
const UnlockToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/UnlockToolPage"),
  "UnlockToolPage",
);
const FlattenToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/FlattenToolPage"),
  "FlattenToolPage",
);
const RedactToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/RedactToolPage"),
  "RedactToolPage",
);
const PiiDetectToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/PiiDetectToolPage"),
  "PiiDetectToolPage",
);
const PipelineToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/PipelineToolPage"),
  "PipelineToolPage",
);
const RotateToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/RotateToolPage"),
  "RotateToolPage",
);
const CropToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/CropToolPage"),
  "CropToolPage",
);
const SignToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/SignToolPage"),
  "SignToolPage",
);
const FillFormToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/FillFormToolPage"),
  "FillFormToolPage",
);
const OcrToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/OcrToolPage"),
  "OcrToolPage",
);
const AnalyzeToolPageLazy = lazyNamed(
  () => import("./ui/pages/tools/AnalyzeToolPage"),
  "AnalyzeToolPage",
);
const ResearchHubPageLazy = lazyNamed(
  () => import("./ui/pages/research/ResearchHubPage"),
  "ResearchHubPage",
);
const ResearchArticlePageLazy = lazyNamed(
  () => import("./ui/pages/research/ResearchArticlePage"),
  "ResearchArticlePage",
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "scrub", element: withSuspense(<ScrubberPageLazy />) },
      { path: "pricing", element: withSuspense(<PricingPageLazy />) },
      { path: "account", element: withSuspense(<AccountPageLazy />) },
      { path: "security", element: withSuspense(<SecurityPageLazy />) },
      { path: "security/policy", element: withSuspense(<SecurityPolicyPageLazy />) },
      { path: "security/:track", element: withSuspense(<SecurityTrackPageLazy />) },
      {
        path: "security/:track/:slug",
        element: withSuspense(<SecurityArticlePageLazy />),
      },
      { path: "donate", element: withSuspense(<DonatePageLazy />) },
      { path: "donate/proof", element: withSuspense(<DonateProofPageLazy />) },
      {
        path: "donate/proof/archive",
        element: withSuspense(<DonateProofArchivePageLazy />),
      },
      { path: "privacy", element: withSuspense(<PrivacyPageLazy />) },
      {
        path: "privacy-policy",
        element: withSuspense(
          <MarkdownContentPageLazy section="legal" slug="privacy-policy" />,
        ),
      },
      {
        path: "terms",
        element: withSuspense(<MarkdownContentPageLazy section="legal" slug="terms" />),
      },
      {
        path: "refund-policy",
        element: withSuspense(
          <MarkdownContentPageLazy section="legal" slug="refund-policy" />,
        ),
      },
      {
        path: "acceptable-use",
        element: withSuspense(
          <MarkdownContentPageLazy section="legal" slug="acceptable-use" />,
        ),
      },
      { path: "faq", element: withSuspense(<FaqHubPageLazy />) },
      { path: "faq/:topic", element: withSuspense(<FaqTopicPageLazy />) },
      { path: "faq/:topic/:slug", element: withSuspense(<FaqQuestionPageLazy />) },
      { path: "blog", element: <BlogIndexPage /> },
      { path: "blog/:category", element: <BlogIndexPage /> },
      { path: "blog/:category/:slug", element: withSuspense(<BlogPostPageLazy />) },
      { path: "guides", element: withSuspense(<GuidesIndexPageLazy />) },
      { path: "guides/:slug", element: withSuspense(<GuidePageLazy />) },
      { path: "sitemap", element: withSuspense(<SitemapPageLazy />) },
      { path: "status", element: withSuspense(<StatusPageLazy />) },
      { path: "about", element: withSuspense(<AboutPageLazy />) },
      { path: "colophon", element: withSuspense(<ColophonPageLazy />) },
      { path: "verify", element: withSuspense(<VerifyPageLazy />) },
      { path: "newsletter", element: withSuspense(<NewsletterPageLazy />) },
      { path: "contact", element: withSuspense(<ContactPageLazy />) },
      { path: "research", element: withSuspense(<ResearchHubPageLazy />) },
      {
        path: "research/:slug",
        element: withSuspense(<ResearchArticlePageLazy />),
      },
      { path: "content/:section/:slug", element: withSuspense(<MarkdownRoutePageLazy />) },
      {
        path: "tools",
        element: withSuspense(<ToolsLayoutLazy />),
        children: [
          { index: true, element: withSuspense(<ToolsHubPageLazy />) },
          {
            path: "collections/:collectionSlug",
            element: withSuspense(<ToolDocPageLazy mode="collection" />),
          },
          {
            path: ":slug/how-to",
            element: withSuspense(<ToolDocPageLazy mode="how-to" />),
          },
          {
            path: ":slug/privacy",
            element: withSuspense(<ToolDocPageLazy mode="privacy" />),
          },
          {
            path: ":slug/troubleshooting",
            element: withSuspense(<ToolDocPageLazy mode="troubleshooting" />),
          },
          {
            path: ":slug/use-cases/:useCaseSlug",
            element: withSuspense(<ToolDocPageLazy mode="use-case" />),
          },
          {
            path: ":slug/faq/:faqSlug",
            element: withSuspense(<ToolDocPageLazy mode="faq" />),
          },
          { path: "scrub", element: withSuspense(<ScrubberPageLazy />) },
          { path: "merge", element: withSuspense(<MergeToolPageLazy />) },
          { path: "split", element: withSuspense(<SplitToolPageLazy />) },
          { path: "editor", element: withSuspense(<PageEditorToolPageLazy />) },
          { path: "compress", element: withSuspense(<CompressToolPageLazy />) },
          {
            path: "image-to-pdf",
            element: withSuspense(<ImageToPdfToolPageLazy />),
          },
          {
            path: "pdf-to-image",
            element: withSuspense(<PdfToImageToolPageLazy />),
          },
          { path: "watermark", element: withSuspense(<WatermarkToolPageLazy />) },
          {
            path: "page-numbers",
            element: withSuspense(<PageNumbersToolPageLazy />),
          },
          {
            path: "remove-pages",
            element: withSuspense(<RemovePagesToolPageLazy />),
          },
          { path: "protect", element: withSuspense(<ProtectToolPageLazy />) },
          { path: "unlock", element: withSuspense(<UnlockToolPageLazy />) },
          { path: "flatten", element: withSuspense(<FlattenToolPageLazy />) },
          { path: "redact", element: withSuspense(<RedactToolPageLazy />) },
          { path: "pii-detect", element: withSuspense(<PiiDetectToolPageLazy />) },
          { path: "pipeline", element: withSuspense(<PipelineToolPageLazy />) },
          { path: "rotate", element: withSuspense(<RotateToolPageLazy />) },
          { path: "crop", element: withSuspense(<CropToolPageLazy />) },
          { path: "sign", element: withSuspense(<SignToolPageLazy />) },
          {
            path: "fill-form",
            element: withSuspense(<FillFormToolPageLazy />),
          },
          { path: "ocr", element: withSuspense(<OcrToolPageLazy />) },
          { path: "analyze", element: withSuspense(<AnalyzeToolPageLazy />) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
