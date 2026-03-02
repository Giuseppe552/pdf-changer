import React from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { InlineCode } from "../components/InlineCode";
import { Surface } from "../components/Surface";
import {
  homeAccountantOutcomes,
  homeAudience,
  homeHeroSummary,
  homeHeroTitle,
  homeHowItWorks,
  homeIdentity,
  homeLimits,
  homeProofMetrics,
  homeWhyUse,
} from "../../content/landing/homeContent";

export function LandingPage() {
  return (
    <div className="space-y-7">
      <Surface variant="emphasis" compact>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-semibold text-neutral-900">
            {homeIdentity}
          </div>
          <NavLink to="/privacy-policy" className="text-[15px] underline">
            Read privacy policy
          </NavLink>
        </div>
      </Surface>

      <div className="space-y-4">
        <h1 className="ui-title max-w-4xl">
          {homeHeroTitle}
        </h1>
        <p className="ui-subtitle max-w-3xl">
          {homeHeroSummary}
        </p>
        <div className="flex flex-wrap gap-3">
          <NavLink to="/scrub">
            <Button>Start scrubber</Button>
          </NavLink>
          <NavLink to="/security">
            <Button variant="secondary">See security model</Button>
          </NavLink>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Why people use this">
          <ul className="list-inside list-disc space-y-2">
            {homeWhyUse.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title="Who this is for">
          <ul className="list-inside list-disc space-y-2">
            {homeAudience.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {homeProofMetrics.map((metric) => (
          <Card key={metric.label} title={metric.label} compact>
            <div className="text-2xl font-semibold text-neutral-900">{metric.value}</div>
            <div className="mt-1 text-sm text-neutral-600">{metric.note}</div>
          </Card>
        ))}
      </div>

      <Card title="How it works">
        <ol className="list-inside list-decimal space-y-2">
          {homeHowItWorks.map((item, index) => (
            <li key={item}>
              {index === 0 ? (
                <>
                  Open <InlineCode>/scrub</InlineCode> and choose a PDF.
                </>
              ) : (
                item
              )}
            </li>
          ))}
        </ol>
      </Card>

      <Card title="For accountants and office workflows">
        <div className="grid gap-3 md:grid-cols-3">
          {homeAccountantOutcomes.map((outcome) => (
            <div key={outcome.title} className="rounded-sm border border-neutral-300 bg-white p-4">
              <div className="text-base font-semibold text-neutral-900">{outcome.title}</div>
              <p className="mt-2 text-[15px] text-neutral-700">{outcome.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="What this does not protect" variant="warning">
        <ul className="list-inside list-disc space-y-2">
          {homeLimits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Surface compact>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-neutral-800">
          <NavLink className="underline" to="/security">
            Security Hub
          </NavLink>
          <NavLink className="underline" to="/faq">
            FAQ Hub
          </NavLink>
          <NavLink className="underline" to="/privacy-policy">
            Privacy Policy
          </NavLink>
          <NavLink className="underline" to="/donate">
            Donate
          </NavLink>
        </div>
      </Surface>

      <Surface variant="emphasis">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-base font-semibold text-neutral-900">
            Start with one PDF safely.
          </div>
          <NavLink to="/scrub">
            <Button>Open scrubber</Button>
          </NavLink>
        </div>
      </Surface>
    </div>
  );
}
