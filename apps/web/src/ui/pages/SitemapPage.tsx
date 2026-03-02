import React from "react";
import { NavLink } from "react-router-dom";
import { contentEntries, slugToTitle } from "../../content/contentIndex";
import { slugToTitle as blogSlugToTitle } from "../../content/blog/blogIndex";
import {
  slugToSecurityTitle,
  trackToTitle,
} from "../../content/security/frontmatter";
import { securityRouteEntries } from "../../content/security/securityIndex";
import {
  faqEntries as faqRouteEntries,
  slugToFaqTitle,
  topicToTitle as faqTopicToTitle,
} from "../../content/faq/faqIndex";
import { toolDocPages } from "../../content/tools/toolDocs";

type SiteLink = { to: string; label: string; description?: string };

const coreLinks: SiteLink[] = [
  { to: "/", label: "Home" },
  { to: "/scrub", label: "Deep scrubber" },
  { to: "/tools", label: "Toolbox" },
  { to: "/faq", label: "FAQ hub" },
  { to: "/blog", label: "Blog" },
  { to: "/donate", label: "Donate" },
  { to: "/pricing", label: "Pricing" },
  { to: "/account", label: "Account" },
  { to: "/security", label: "Security" },
  { to: "/privacy", label: "Privacy summary" },
];

function canonicalContentRoute(section: string, slug: string): string {
  if (section === "legal") {
    if (slug === "privacy-policy") return "/privacy-policy";
    if (slug === "terms") return "/terms";
    if (slug === "refund-policy") return "/refund-policy";
  }
  if (section === "guides") return `/guides/${slug}`;
  if (section === "resources") {
    if (slug === "faq") return "/faq";
  }
  if (section === "blog") {
    const m = slug.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-(.+)$/);
    if (m) return `/blog/${m[2]}/${m[3]}`;
  }
  return `/content/${section}/${slug}`;
}

export function SitemapPage() {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const groups = new Map<string, Array<{ to: string; label: string }>>();
  for (const entry of contentEntries) {
    const to = canonicalContentRoute(entry.section, entry.slug);
    let label = slugToTitle(entry.slug);
    if (entry.section === "blog") {
      const m = entry.slug.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9]+)-(.+)$/);
      if (m) label = blogSlugToTitle(m[3]);
    }
    if (q && !to.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get(entry.section) ?? [];
    arr.push({ to, label });
    groups.set(entry.section, arr);
  }

  for (const entry of faqRouteEntries) {
    const to = entry.route;
    const label = `${faqTopicToTitle(entry.topic)}: ${slugToFaqTitle(entry.slug)}`;
    if (q && !to.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("faq") ?? [];
    arr.push({ to, label });
    groups.set("faq", arr);
  }

  for (const entry of securityRouteEntries) {
    const to = entry.route;
    let label = "Security policy";
    if (entry.section === "non-technical") {
      label = `${trackToTitle(entry.section)}: ${slugToSecurityTitle(entry.slug)}`;
    }
    if (entry.section === "technical") {
      label = `${trackToTitle(entry.section)}: ${slugToSecurityTitle(entry.slug)}`;
    }
    if (entry.section === "policy") {
      label = "Defensive-only security policy";
    }
    if (q && !to.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("security") ?? [];
    arr.push({ to, label });
    groups.set("security", arr);
  }

  const securityTrackPages: SiteLink[] = [
    { to: "/security/non-technical", label: "Security track: Non-Technical" },
    { to: "/security/technical", label: "Security track: Technical" },
  ];
  for (const link of securityTrackPages) {
    if (q && !link.to.toLowerCase().includes(q) && !link.label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("security") ?? [];
    arr.push({ to: link.to, label: link.label });
    groups.set("security", arr);
  }

  const donatePages: SiteLink[] = [
    { to: "/donate", label: "Donate" },
    { to: "/donate/proof", label: "Donate address proof" },
    { to: "/donate/proof/archive", label: "Donate proof archive" },
    { to: "/donate/transparency", label: "Donate transparency" },
  ];
  for (const link of donatePages) {
    if (q && !link.to.toLowerCase().includes(q) && !link.label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("donate") ?? [];
    arr.push({ to: link.to, label: link.label });
    groups.set("donate", arr);
  }

  for (const page of toolDocPages) {
    const to = page.route;
    const label = page.title;
    if (q && !to.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("tools") ?? [];
    arr.push({ to, label });
    groups.set("tools", arr);
  }

  const faqTopics = Array.from(new Set(faqRouteEntries.map((entry) => entry.topic))).sort();
  for (const faqTopic of faqTopics) {
    const to = `/faq/${faqTopic}`;
    const label = `${faqTopicToTitle(faqTopic)} (topic)`;
    if (q && !to.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
      continue;
    }
    const arr = groups.get("faq") ?? [];
    arr.push({ to, label });
    groups.set("faq", arr);
  }

  for (const [k, v] of groups.entries()) {
    v.sort((a, b) => a.label.localeCompare(b.label));
    groups.set(k, v);
  }

  function sectionTitle(section: string): string {
    if (section === "legal") return "Legal";
    if (section === "guides") return "Guides";
    if (section === "resources") return "Resources";
    if (section === "blog") return "Blog";
    if (section === "faq") return "FAQ";
    if (section === "security") return "Security";
    if (section === "donate") return "Donate";
    if (section === "tools") return "Tools";
    return section;
  }

  function Section({ title, links }: { title: string; links: SiteLink[] }) {
    const filtered = q
      ? links.filter(
          (l) =>
            l.label.toLowerCase().includes(q) || l.to.toLowerCase().includes(q),
        )
      : links;

    if (!filtered.length) return null;
    return (
      <div className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        <ul className="mt-3 space-y-2 text-sm">
          {filtered.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className="text-neutral-700 hover:text-neutral-950"
              >
                {l.label}
              </NavLink>
              {l.description ? (
                <div className="text-xs text-neutral-500">{l.description}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sitemap</h1>
          <div className="text-sm text-neutral-600">
            Everything we publish, in one place.
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages…"
          className="w-full max-w-xs rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Core" links={coreLinks} />
        <Section
          title="More"
          links={[
            { to: "/privacy-policy", label: "Privacy policy" },
            { to: "/terms", label: "Terms" },
            { to: "/refund-policy", label: "Refund policy" },
            { to: "/guides", label: "Guides index" },
            { to: "/blog", label: "Blog" },
            { to: "/faq", label: "FAQ" },
            { to: "/security", label: "Security hub" },
            { to: "/security/non-technical", label: "Security non-technical track" },
            { to: "/security/technical", label: "Security technical track" },
            { to: "/security/policy", label: "Security policy" },
            { to: "/donate", label: "Donate" },
            { to: "/tools", label: "Tools hub" },
            { to: "/donate/proof", label: "Donate address proof" },
            { to: "/donate/proof/archive", label: "Donate proof archive" },
            { to: "/donate/transparency", label: "Donate transparency" },
            { to: "/newsletter", label: "Newsletter" },
            { to: "/contact", label: "Contact" },
            { to: "/status", label: "Status" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from(groups.entries()).map(([section, links]) => (
          <div
            key={section}
            className="rounded-sm border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="text-sm font-semibold text-neutral-900">
              {sectionTitle(section)}
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className="text-neutral-700 hover:text-neutral-950"
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
