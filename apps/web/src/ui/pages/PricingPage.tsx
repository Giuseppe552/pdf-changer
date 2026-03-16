import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Surface } from "../components/Surface";

export function PricingPage() {
  React.useEffect(() => {
    document.title = "Support · PDF Changer";
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-accent)] mb-3">
          Support
        </div>
        <h1 className="text-3xl font-bold tracking-tight">PDF Changer is free.</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--ui-text-secondary)] leading-relaxed">
          Every tool, every feature, no limits. No account needed.
          Your files never leave your browser. This project is funded by
          people who believe privacy tools should be accessible to everyone.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-5">
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-3">
          What free means here
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm font-medium text-[var(--ui-text)]">No action limits</div>
            <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
              Use every tool as many times as you need. No monthly cap, no daily cap, no "upgrade to unlock."
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--ui-text)]">No tracking</div>
            <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
              We don't count your actions. Not in localStorage, not on a server, not anywhere.
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--ui-text)]">No account required</div>
            <div className="mt-1 text-xs text-[var(--ui-text-muted)]">
              Accounts exist for convenience (saved preferences). They don't unlock features.
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mono text-xs tracking-wider uppercase text-[var(--ui-text-muted)] mb-3">
          Running costs
        </div>
        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] overflow-hidden">
          <div className="space-y-px">
            <CostRow label="Cloudflare Workers (API)" amount="~$0/mo" note="free tier covers current traffic" />
            <CostRow label="Cloudflare Pages (hosting)" amount="$0/mo" note="free tier" />
            <CostRow label="D1 database" amount="$0/mo" note="free tier" />
            <CostRow label="Domain" amount="~$10/yr" note="pages.dev subdomain is free" />
            <CostRow label="Development time" amount="ongoing" note="solo project, no salary" />
          </div>
        </div>
        <div className="mt-2 text-xs text-[var(--ui-text-muted)]">
          Infrastructure costs are near zero thanks to Cloudflare's free tier.
          The real cost is development time. Support goes toward keeping the
          project maintained and building new tools.
        </div>
      </div>

      <NavLink
        to="/donate"
        className="inline-block mono text-xs text-[var(--ui-accent)] hover:text-[var(--ui-accent-hover)] transition-colors"
      >
        support the project &rarr;
      </NavLink>
    </div>
  );
}

function CostRow({ label, amount, note }: { label: string; amount: string; note: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[var(--ui-bg-raised)] px-5 py-3 border-b border-[var(--ui-border)] last:border-0">
      <div>
        <div className="text-sm text-[var(--ui-text)]">{label}</div>
        <div className="text-xs text-[var(--ui-text-muted)]">{note}</div>
      </div>
      <div className="mono text-sm text-[var(--ui-text-secondary)] shrink-0">{amount}</div>
    </div>
  );
}
