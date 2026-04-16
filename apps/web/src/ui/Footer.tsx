import React from "react";
import { NavLink } from "react-router-dom";
import { NewsletterSignup } from "./components/NewsletterSignup";

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className="text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-text-secondary)] transition-colors"
    >
      {children}
    </NavLink>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--ui-border)] mt-20">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="mono text-sm font-semibold text-[var(--ui-text)]">
              PDF Changer
            </div>
            <div className="text-xs text-[var(--ui-text-muted)] leading-relaxed">
              Browser-only PDF tools. Nothing uploaded. Nothing tracked. Open source.
            </div>
          </div>

          <div className="space-y-2">
            <div className="mono text-[10px] font-medium uppercase tracking-widest text-[var(--ui-text-muted)]">
              Product
            </div>
            <div className="flex flex-col gap-1.5">
              <FooterLink to="/scrub">Deep scrubber</FooterLink>
              <FooterLink to="/tools">All tools</FooterLink>
              <FooterLink to="/pricing">Support</FooterLink>
              <FooterLink to="/account">Account</FooterLink>
              <FooterLink to="/donate">Donate</FooterLink>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mono text-[10px] font-medium uppercase tracking-widest text-[var(--ui-text-muted)]">
              Legal
            </div>
            <div className="flex flex-col gap-1.5">
              <FooterLink to="/privacy-policy">Privacy policy</FooterLink>
              <FooterLink to="/terms">Terms of service</FooterLink>
              <FooterLink to="/acceptable-use">Acceptable use</FooterLink>
              <FooterLink to="/refund-policy">Refund policy</FooterLink>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mono text-[10px] font-medium uppercase tracking-widest text-[var(--ui-text-muted)]">
              Resources
            </div>
            <div className="flex flex-col gap-1.5">
              <FooterLink to="/security">Security</FooterLink>
              <FooterLink to="/research">Research</FooterLink>
              <FooterLink to="/faq">FAQ</FooterLink>
              <FooterLink to="/guides">Guides</FooterLink>
              <FooterLink to="/blog">Blog</FooterLink>
              <FooterLink to="/about">About</FooterLink>
              <FooterLink to="/colophon">How it&apos;s built</FooterLink>
              <FooterLink to="/sitemap">Sitemap</FooterLink>
              <FooterLink to="/verify">Verify</FooterLink>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--ui-border)] pt-8">
          <NewsletterSignup noteAlign="right" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="mono text-[10px] text-[var(--ui-text-muted)]">
            &copy; {new Date().getFullYear()} Giuseppe Giona
          </span>
          <a
            href="https://github.com/Giuseppe552/pdf-changer"
            target="_blank"
            rel="noreferrer"
            className="mono text-[10px] text-[var(--ui-text-muted)] hover:text-[var(--ui-accent)] transition-colors"
          >
            source on github
          </a>
        </div>
      </div>
    </footer>
  );
}
