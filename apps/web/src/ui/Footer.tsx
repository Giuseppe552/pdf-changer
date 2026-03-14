import React from "react";
import { NavLink } from "react-router-dom";
import { NewsletterSignup } from "./components/NewsletterSignup";

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className="text-[15px] text-neutral-700 hover:text-neutral-900"
    >
      {children}
    </NavLink>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-neutral-300 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="text-base font-semibold text-neutral-900">
              PDF Changer
            </div>
            <div className="text-[15px] text-neutral-700">
              Private PDF tools for people who need clear defaults and no tracking.
            </div>
            <div className="text-[15px] text-neutral-700">
              On-device processing in v1. Account and billing only for plans.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Product
            </div>
            <div className="flex flex-col gap-2">
              <FooterLink to="/scrub">Deep scrubber</FooterLink>
              <FooterLink to="/tools">Toolbox</FooterLink>
              <FooterLink to="/pricing">Pricing</FooterLink>
              <FooterLink to="/account">Account</FooterLink>
              <FooterLink to="/donate">Donate</FooterLink>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Legal
            </div>
            <div className="flex flex-col gap-2">
              <FooterLink to="/privacy-policy">Privacy policy</FooterLink>
              <FooterLink to="/terms">Terms</FooterLink>
              <FooterLink to="/refund-policy">Refund policy</FooterLink>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Resources
            </div>
            <div className="flex flex-col gap-2">
              <FooterLink to="/security">Security</FooterLink>
              <FooterLink to="/privacy">Privacy summary</FooterLink>
              <FooterLink to="/faq">FAQ</FooterLink>
              <FooterLink to="/guides">Guides</FooterLink>
              <FooterLink to="/blog">Blog</FooterLink>
              <FooterLink to="/sitemap">Sitemap</FooterLink>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/verify">Verify</FooterLink>
              <FooterLink to="/status">Status</FooterLink>
              <FooterLink to="/newsletter">Newsletter</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-300 pt-8">
          <NewsletterSignup noteAlign="right" />
        </div>

        <div className="mt-6 text-sm text-neutral-500">
          © {new Date().getFullYear()} PDF Changer. Built by Giuseppe Giona.
        </div>
      </div>
    </footer>
  );
}
