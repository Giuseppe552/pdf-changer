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
];

const moreNavItems: Array<{ to: string; label: string }> = [
  { to: "/faq", label: "FAQ" },
  { to: "/blog", label: "Blog" },
  { to: "/guides", label: "Guides" },
  { to: "/pricing", label: "Pricing" },
  { to: "/donate", label: "Donate" },
  { to: "/account", label: "Account" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms" },
  { to: "/refund-policy", label: "Refunds" },
  { to: "/about", label: "About" },
  { to: "/colophon", label: "How it's built" },
  { to: "/verify", label: "Verify" },
];

function NoTraceBanner() {
  const { isNoTrace } = useNoTrace();
  if (!isNoTrace) return null;
  return (
    <div className="border-b border-amber-400 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
      No Trace Mode: nothing is saved to this device.
    </div>
  );
}

function NoTraceToggle() {
  const { isNoTrace, toggleNoTrace } = useNoTrace();
  return (
    <button
      onClick={toggleNoTrace}
      className={[
        "rounded-sm border px-3 py-2 text-sm font-semibold transition",
        isNoTrace
          ? "border-amber-600 bg-amber-600 text-white"
          : "border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100",
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
        <div className="min-h-screen bg-neutral-50 text-base">
          <NoTraceBanner />
          <header className="sticky top-0 z-20 border-b border-neutral-300 bg-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="space-y-1">
                <NavLink
                  to="/"
                  className="text-lg font-semibold tracking-wide text-neutral-950"
                >
                  PDF Changer
                </NavLink>
                <div className="text-[15px] text-neutral-700">
                  Free PDF tools that run in your browser. Nothing uploaded.
                </div>
              </div>

              <nav className="flex flex-wrap items-center justify-end gap-2">
                <NoTraceToggle />
                {primaryNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "rounded-sm border px-3 py-2 text-sm font-semibold transition",
                        isActive
                          ? "border-blue-800 bg-blue-800 text-white"
                          : "border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}

                <details className="relative">
                  <summary className="list-none rounded-sm border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100">
                    More
                  </summary>
                  <div className="absolute right-0 mt-2 w-56 border border-neutral-300 bg-white p-2 shadow">
                    <div className="mb-1 px-2 py-1 text-sm font-semibold text-neutral-600">
                      Resources and account
                    </div>
                    <div className="grid gap-1">
                      {moreNavItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) =>
                            [
                              "rounded-sm px-2 py-2 text-sm transition",
                              isActive
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-800 hover:bg-neutral-100",
                            ].join(" ")
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
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
