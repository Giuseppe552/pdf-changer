import React from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { Surface } from "../../components/Surface";
import { blogPosts } from "../../../content/blog/blogIndex";

function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BlogIndexPage() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [sort, setSort] = React.useState<"newest" | "oldest" | "title">("newest");
  const params = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "Blog Hub · PDF Changer";
  }, []);

  const categories = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of blogPosts) {
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }
    const items = Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: titleCase(value),
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      {
        value: "all",
        label: "All",
        count: blogPosts.length,
      },
      ...items,
    ];
  }, []);

  React.useEffect(() => {
    const fromParam = (params.category ?? "").trim();
    if (!fromParam) {
      if (category !== "all") setCategory("all");
      return;
    }
    if (!categories.some((item) => item.value === fromParam)) return;
    if (fromParam !== category) setCategory(fromParam);
  }, [category, categories, params.category]);

  function chooseCategory(next: string) {
    setCategory(next);
    if (next === "all") navigate("/blog", { replace: true });
    else navigate(`/blog/${next}`, { replace: true });
  }

  const q = query.trim().toLowerCase();
  const filtered = blogPosts.filter((post) => {
    if (category !== "all" && post.category !== category) return false;
    if (!q) return true;
    return (
      post.title.toLowerCase().includes(q) ||
      post.teaser.toLowerCase().includes(q) ||
      post.slug.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q)
    );
  });

  const sorted = React.useMemo(() => {
    const next = [...filtered];
    if (sort === "title") {
      next.sort((a, b) => a.title.localeCompare(b.title));
      return next;
    }
    next.sort((a, b) => {
      if (a.date === b.date) return a.title.localeCompare(b.title);
      const delta = a.date < b.date ? -1 : 1;
      return sort === "oldest" ? delta : -delta;
    });
    return next;
  }, [filtered, sort]);

  const featuredByCategory = React.useMemo(() => {
    const map = new Map<string, typeof blogPosts>();
    for (const post of blogPosts) {
      const arr = map.get(post.category) ?? [];
      arr.push(post);
      map.set(post.category, arr);
    }
    return Array.from(map.entries())
      .map(([topic, items]) => ({
        topic,
        items: [...items].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3),
      }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Blog Hub</h1>
        <p className="ui-subtitle max-w-3xl">
          Daily-read security guidance focused on anonymity, document risk, and
          safer submissions. Calm language, strict defaults, and practical steps.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-neutral-800">
          Read this hub like a handbook: start with basics, then move by topic.
        </div>
      </Surface>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {categories.map((item) => (
          <button
            key={item.value}
            onClick={() => chooseCategory(item.value)}
            className={[
              "shrink-0 rounded-sm border px-3 py-2 text-sm font-semibold transition",
              category === item.value
                ? "border-blue-800 bg-blue-800 text-white"
                : "border-neutral-400 bg-white text-neutral-700 hover:border-neutral-500 hover:text-neutral-900",
            ].join(" ")}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Start here">
          <ul className="list-inside list-disc space-y-2 text-[15px] text-neutral-700">
            <li>
              <NavLink className="underline" to="/blog/basics/anonymity-101">
                Anonymity 101
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/blog/opsec/device-and-network-basics">
                Device + network basics
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/scrub">
                Use the scrubber (on‑device)
              </NavLink>
            </li>
          </ul>
        </Card>

        <Card title="Filter and sort">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-600">
                Category
              </div>
              <select
                value={category}
                onChange={(e) => chooseCategory(e.target.value)}
                className="ui-select"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-600">Search</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                className="ui-input"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-neutral-600">Sort</div>
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as "newest" | "oldest" | "title")
                }
                className="ui-select"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {featuredByCategory.map((group) => (
          <Card
            key={group.topic}
            title={`${titleCase(group.topic)} (${group.items.length})`}
            footer={
              <NavLink className="text-sm underline" to={`/blog/${group.topic}`}>
                Open {titleCase(group.topic)} archive
              </NavLink>
            }
          >
            <ul className="list-inside list-disc space-y-2 text-neutral-700">
              {group.items.map((post) => (
                <li key={post.route}>
                  <NavLink className="underline" to={post.route}>
                    {post.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">All posts</h2>
        <p className="text-[15px] text-neutral-600">
          {sorted.length} result{sorted.length === 1 ? "" : "s"}{category !== "all" ? ` in ${titleCase(category)}` : ""}.
        </p>
      </div>

      <div className="space-y-3">
        {sorted.map((post) => (
          <NavLink
            key={post.route}
            to={post.route}
            className="group block rounded-sm border border-neutral-300 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {titleCase(post.category)}
              </div>
              <div className="text-sm text-neutral-500">
                {post.date} · {post.readingMinutes} min read
              </div>
            </div>
            <h3 className="mt-2 text-base font-semibold text-neutral-900 group-hover:text-neutral-950">
              {post.title}
            </h3>
            <p className="mt-1 text-[15px] text-neutral-600">{post.teaser}</p>
          </NavLink>
        ))}
        {!sorted.length ? (
          <div className="rounded-sm border border-neutral-200 bg-white p-6 text-[15px] text-neutral-700 shadow-sm">
            No posts found.
          </div>
        ) : null}
      </div>
    </div>
  );
}
