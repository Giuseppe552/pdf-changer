import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AuthProvider } from "../ui/auth/AuthProvider";
import { NoTraceProvider, useNoTrace } from "./contexts/NoTraceContext";
import { Footer } from "./Footer";

const primaryNavItems: Array<{ to: string; label: string }> = [
  { to: "/scrub", label: "Scrub" },
  { to: "/tools/merge", label: "Merge" },
  { to: "/tools/split", label: "Split" },
  { to: "/tools", label: "Tools" },
  { to: "/security", label: "Security" },
  { to: "/research", label: "Research" },
];

const moreNavItems: Array<{ to: string; label: string }> = [
  { to: "/faq", label: "FAQ" },
  { to: "/blog", label: "Blog" },
  { to: "/guides", label: "Guides" },
  { to: "/pricing", label: "Pricing" },
  { to: "/donate", label: "Donate" },
  { to: "/account", label: "Account" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/refund-policy", label: "Refunds" },
  { to: "/about", label: "About" },
  { to: "/colophon", label: "How it's built" },
  { to: "/sitemap", label: "Sitemap" },
  { to: "/verify", label: "Verify" },
];

function NoTraceBanner() {
  const { isNoTrace } = useNoTrace();
  if (!isNoTrace) return null;
  return (
    <div className="border-b border-amber-700/40 bg-amber-950/40 px-4 py-2 text-center text-xs font-medium text-amber-300 mono tracking-wider uppercase">
      No Trace Mode: nothing is saved to this device
    </div>
  );
}

function NoTraceToggle() {
  const { isNoTrace, toggleNoTrace } = useNoTrace();
  return (
    <button
      onClick={toggleNoTrace}
      className={[
        "rounded-md border px-2.5 py-1.5 text-xs font-medium mono transition",
        isNoTrace
          ? "border-amber-600 bg-amber-600 text-white"
          : "border-[var(--ui-border-strong)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] hover:border-[var(--ui-text-muted)]",
      ].join(" ")}
      title={isNoTrace ? "No Trace Mode active" : "Enable No Trace Mode"}
    >
      {isNoTrace ? "No Trace ON" : "No Trace"}
    </button>
  );
}

export function AppShell() {
  return (
    <NoTraceProvider>
      <AuthProvider>
        <div className="min-h-screen text-[15px]">
          <NoTraceBanner />
          <header className="sticky top-0 z-20 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <NavLink
                to="/"
                className="group flex items-center gap-2"
              >
                <span className="mono text-sm font-semibold tracking-wide text-[var(--ui-text)] group-hover:text-[var(--ui-accent)] transition-colors">
                  PDF Changer
                </span>
              </NavLink>

              <nav className="flex flex-wrap items-center gap-1.5">
                <NoTraceToggle />
                {primaryNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                        isActive
                          ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]"
                          : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)]",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}

                <details className="relative">
                  <summary className="list-none rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)] cursor-pointer transition">
                    More
                  </summary>
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-1.5 shadow-xl shadow-black/30 z-30">
                    {moreNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          [
                            "block rounded-md px-3 py-2 text-xs transition",
                            isActive
                              ? "bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]"
                              : "text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-overlay)] hover:text-[var(--ui-text)]",
                          ].join(" ")
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </details>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-10">
            <Outlet />
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </NoTraceProvider>
  );
}
